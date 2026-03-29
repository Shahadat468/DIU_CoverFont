const { useEffect, useMemo, useRef, useState } = React;

const REPORT_TYPES = {
  theory_assignment: {
    label: "Theory Assignment Report",
    shortLabel: "Theory Assignment Report",
    marks: 5,
    criteria: [
      ["Level of Content", 1],
      ["Development", 2],
      ["Spelling & Grammar", 1],
      ["Organization and Formatting", 1],
    ],
  },
  lab_assignment: {
    label: "Lab Assignment Report",
    shortLabel: "Lab Assignment Report",
    marks: 10,
    criteria: [
      ["Problem Understanding", 2],
      ["Analysis & Logic", 3],
      ["Presentation", 2],
      ["Accuracy", 3],
    ],
  },
  lab_report: {
    label: "Lab Report",
    shortLabel: "Lab Report",
    marks: 25,
    criteria: [
      ["Experiment Setup", 5],
      ["Observation & Data", 7],
      ["Result Analysis", 8],
      ["Formatting & Conclusion", 5],
    ],
  },
  lab_final: {
    label: "Lab Final Report",
    shortLabel: "Lab Final Report",
    marks: 40,
    criteria: [
      ["Problem Solving", 10],
      ["Implementation", 12],
      ["Output Accuracy", 10],
      ["Documentation & Viva", 8],
    ],
  },
};

const TERM_OPTIONS = ["Spring", "Summer", "Fall"];
const PAPER_WIDTH_PX = 794;
const PAPER_HEIGHT_PX = 1123;
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const STORAGE_KEY = "diu-cover-generator-state-v2";
const DEFAULT_ZOOM = 100;
const ZOOM_MIN = 90;
const ZOOM_MAX = 250;
const REQUIRED_FIELDS = [
  ["studentName", "Full student name"],
  ["studentId", "Student ID"],
  ["batch", "Batch"],
  ["section", "Section"],
  ["semester", "Semester number or text"],
  ["courseCode", "Course code"],
  ["courseName", "Course title"],
  ["teacherName", "Course teacher name"],
  ["designation", "Designation"],
  ["submissionDate", "Submission date"],
];

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialForm() {
  return {
    studentName: "",
    studentId: "",
    batch: "",
    section: "",
    semester: "",
    semesterTerm: "Spring",
    courseCode: "",
    courseName: "",
    teacherName: "",
    designation: "",
    submissionDate: getTodayIso(),
  };
}

function loadStoredState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const savedReportType = REPORT_TYPES[parsed.reportType]
      ? parsed.reportType
      : "theory_assignment";

    return {
      reportType: savedReportType,
      form: {
        ...createInitialForm(),
        ...(parsed.form || {}),
      },
      mergeMode: parsed.mergeMode === "image" ? "image" : "pdf",
      zoom: Number.isFinite(parsed.zoom)
        ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, parsed.zoom))
        : DEFAULT_ZOOM,
    };
  } catch (error) {
    console.error("Could not load saved cover page data.", error);
    return null;
  }
}

function buildSelectionStatus(files) {
  if (!files.length) {
    return "";
  }

  if (files.length === 1) {
    return `Selected file: ${files[0].name}`;
  }

  return `Selected ${files.length} files.`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdfFile(file) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type.includes("pdf") || name.endsWith(".pdf");
}

function getImageFormat(file) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  if (type.includes("png") || name.endsWith(".png")) {
    return "png";
  }

  if (
    type.includes("jpeg") ||
    type.includes("jpg") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  ) {
    return "jpg";
  }

  return null;
}

async function waitForImages(node) {
  const images = Array.from(node.querySelectorAll("img"));

  await Promise.all(
    images.map(
      (image) =>
        new Promise((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        })
    )
  );
}

function fitIntoA4(width, height) {
  const scale = Math.min(A4_WIDTH_PT / width, A4_HEIGHT_PT / height);
  const fittedWidth = width * scale;
  const fittedHeight = height * scale;

  return {
    width: fittedWidth,
    height: fittedHeight,
    x: (A4_WIDTH_PT - fittedWidth) / 2,
    y: (A4_HEIGHT_PT - fittedHeight) / 2,
  };
}

function App() {
  const storedState = useMemo(() => loadStoredState(), []);
  const [reportType, setReportType] = useState(
    storedState?.reportType || "theory_assignment"
  );
  const [form, setForm] = useState(storedState?.form || createInitialForm);
  const [mergeMode, setMergeMode] = useState(storedState?.mergeMode || "pdf");
  const [mergeFiles, setMergeFiles] = useState([]);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState({});
  const [zoom, setZoom] = useState(storedState?.zoom || DEFAULT_ZOOM);
  const [fitScale, setFitScale] = useState(1);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const paperRef = useRef(null);
  const previewFrameRef = useRef(null);
  const uploadRef = useRef(null);
  const dragDepthRef = useRef(0);

  const reportConfig = useMemo(() => REPORT_TYPES[reportType], [reportType]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  };

  const resetForm = () => {
    setReportType("theory_assignment");
    setForm(createInitialForm());
    setMergeMode("pdf");
    setMergeFiles([]);
    setErrors({});
    setStatus("");
    setZoom(DEFAULT_ZOOM);
    setIsDragActive(false);
    if (uploadRef.current) {
      uploadRef.current.value = "";
    }
  };

  const updateMergeMode = (nextMode) => {
    setMergeMode(nextMode);
    setMergeFiles([]);
    setStatus("");
    setIsDragActive(false);

    if (uploadRef.current) {
      uploadRef.current.value = "";
    }
  };

  const handleTermSelect = (term) => {
    setForm((current) => ({ ...current, semesterTerm: term }));
  };

  const validateForm = () => {
    const nextErrors = {};

    REQUIRED_FIELDS.forEach(([fieldName, label]) => {
      if (!String(form[fieldName] || "").trim()) {
        nextErrors[fieldName] = `${label} is required.`;
      }
    });

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      setStatus("Please fill in the highlighted required fields before exporting.");
      return false;
    }

    return true;
  };

  const applyMergeFiles = (incomingFiles) => {
    const nextFiles = Array.from(incomingFiles || []);
    const acceptedFiles = nextFiles.filter((file) =>
      mergeMode === "pdf" ? isPdfFile(file) : Boolean(getImageFormat(file))
    );
    const rejectedCount = nextFiles.length - acceptedFiles.length;

    setMergeFiles(acceptedFiles);

    if (!acceptedFiles.length) {
      setStatus(
        mergeMode === "pdf"
          ? "Please select PDF files only."
          : "Please select PNG or JPG image files only."
      );
      return;
    }

    const message = buildSelectionStatus(acceptedFiles);
    setStatus(
      rejectedCount
        ? `${message} Ignored ${rejectedCount} unsupported file${
            rejectedCount > 1 ? "s" : ""
          }.`
        : message
    );
  };

  const handleFileChange = (event) => {
    applyMergeFiles(event.target.files);
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    applyMergeFiles(event.dataTransfer.files);

    if (uploadRef.current) {
      uploadRef.current.value = "";
    }
  };

  const moveMergeFile = (index, direction) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= mergeFiles.length) {
      return;
    }

    const nextFiles = [...mergeFiles];
    const [movedFile] = nextFiles.splice(index, 1);
    nextFiles.splice(targetIndex, 0, movedFile);
    setMergeFiles(nextFiles);

    if (uploadRef.current) {
      uploadRef.current.value = "";
    }
  };

  const removeMergeFile = (index) => {
    const nextFiles = mergeFiles.filter((_, fileIndex) => fileIndex !== index);
    setMergeFiles(nextFiles);
    setStatus(buildSelectionStatus(nextFiles));

    if (uploadRef.current) {
      uploadRef.current.value = "";
    }
  };

  const handlePrint = () => {
    if (!validateForm()) {
      return;
    }

    window.print();
  };

  const mergeAndDownload = async () => {
    if (!paperRef.current || isExporting) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    let exportHost = null;

    try {
      setIsExporting(true);
      setExportMessage("Preparing cover page...");
      setStatus("Preparing cover page...");

      exportHost = document.createElement("div");
      exportHost.className = "export-stage";

      const exportPaper = paperRef.current.cloneNode(true);
      exportPaper.classList.add("export-paper");
      exportHost.appendChild(exportPaper);
      document.body.appendChild(exportHost);

      await waitForImages(exportPaper);

      const canvas = await html2canvas(exportPaper, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        width: PAPER_WIDTH_PX,
        height: PAPER_HEIGHT_PX,
        windowWidth: PAPER_WIDTH_PX,
        windowHeight: PAPER_HEIGHT_PX,
      });

      document.body.removeChild(exportHost);
      exportHost = null;

      const coverImage = canvas.toDataURL("image/png");
      const pdfDoc = await PDFLib.PDFDocument.create();
      const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
      const embeddedCover = await pdfDoc.embedPng(coverImage);
      page.drawImage(embeddedCover, {
        x: 0,
        y: 0,
        width: A4_WIDTH_PT,
        height: A4_HEIGHT_PT,
      });

      if (mergeFiles.length) {
        const mergeMessage =
          mergeFiles.length === 1
            ? `Merging ${mergeFiles[0].name}...`
            : `Merging ${mergeFiles.length} files...`;
        setExportMessage(mergeMessage);
        setStatus(mergeMessage);

        for (const file of mergeFiles) {
          const fileBytes = await file.arrayBuffer();

          if (mergeMode === "pdf") {
            const sourcePdf = await PDFLib.PDFDocument.load(fileBytes);
            const pages = await pdfDoc.copyPages(sourcePdf, sourcePdf.getPageIndices());
            pages.forEach((copiedPage) => pdfDoc.addPage(copiedPage));
            continue;
          }

          const imageFormat = getImageFormat(file);

          if (!imageFormat) {
            throw new Error(`Unsupported image file: ${file.name}`);
          }

          const imageBytes = new Uint8Array(fileBytes);
          const embeddedImage =
            imageFormat === "png"
              ? await pdfDoc.embedPng(imageBytes)
              : await pdfDoc.embedJpg(imageBytes);
          const imageSize = embeddedImage.scale(1);
          const fittedImage = fitIntoA4(imageSize.width, imageSize.height);
          const imagePage = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);

          imagePage.drawImage(embeddedImage, {
            x: fittedImage.x,
            y: fittedImage.y,
            width: fittedImage.width,
            height: fittedImage.height,
          });
        }
      }

      setExportMessage("Saving PDF...");

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `diu-cover-${reportType}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus(
        mergeFiles.length
          ? "Merged PDF downloaded successfully."
          : "Cover page PDF downloaded successfully."
      );
    } catch (error) {
      console.error(error);
      setStatus("Could not create the PDF. Please try valid PDF or image files.");
    } finally {
      setIsExporting(false);
      setExportMessage("");

      if (exportHost?.parentNode) {
        exportHost.parentNode.removeChild(exportHost);
      }
    }
  };

  const clearFile = () => {
    setMergeFiles([]);
    setStatus("");
    setIsDragActive(false);
    if (uploadRef.current) {
      uploadRef.current.value = "";
    }
  };

  useEffect(() => {
    const updateFitScale = () => {
      const frame = previewFrameRef.current;
      if (!frame) {
        return;
      }

      const frameWidth = frame.clientWidth;
      const frameHeight = frame.clientHeight;

      if (!frameWidth || !frameHeight) {
        return;
      }

      const nextFitScale = Math.min(
        frameWidth / PAPER_WIDTH_PX,
        frameHeight / PAPER_HEIGHT_PX,
        1
      );
      setFitScale(nextFitScale);
    };

    updateFitScale();

    const resizeObserver = new ResizeObserver(updateFitScale);

    if (previewFrameRef.current) {
      resizeObserver.observe(previewFrameRef.current);
    }

    window.addEventListener("resize", updateFitScale);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFitScale);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          reportType,
          form,
          mergeMode,
          zoom,
        })
      );
    } catch (error) {
      console.error("Could not save cover page data.", error);
    }
  }, [form, mergeMode, reportType, zoom]);

  const previewScale = fitScale * (zoom / 100);
  const scaledPaperWidth = PAPER_WIDTH_PX * previewScale;
  const scaledPaperHeight = PAPER_HEIGHT_PX * previewScale;

  return (
    <div className="page-shell">
      <div className="app-shell">
        <section className="hero">
          <h1>DIU CoverFront</h1>
        </section>

        <main className="layout">
          <aside className="left-column">
          <section className="panel">
            <div className="panel-title">
              <h2>Report Type</h2>
              <span className="tag">{reportConfig.marks} Marks</span>
            </div>

            <div className="type-grid">
              {Object.entries(REPORT_TYPES).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  className={`type-card ${reportType === key ? "active" : ""}`}
                  onClick={() => setReportType(key)}
                >
                  <strong>{item.shortLabel}</strong>
                  <span>Total Marks: {item.marks}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2>Student Identity</h2>
              <span className="tag">Required</span>
            </div>

            <div className="form-grid">
              <Field
                label="Full Student Name *"
                name="studentName"
                value={form.studentName}
                onChange={handleChange}
                placeholder="Full Student Name *"
                error={errors.studentName}
              />
              <Field
                label="Student ID *"
                name="studentId"
                value={form.studentId}
                onChange={handleChange}
                placeholder="Student ID *"
                error={errors.studentId}
              />
              <div className="two-col">
                <Field
                  label="Batch *"
                  name="batch"
                  value={form.batch}
                  onChange={handleChange}
                  placeholder="Batch *"
                  error={errors.batch}
                />
                <Field
                  label="Section *"
                  name="section"
                  value={form.section}
                  onChange={handleChange}
                  placeholder="Section *"
                  error={errors.section}
                />
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2>Academic Context</h2>
              <span className="tag">Course</span>
            </div>

            <div className="form-grid">
              <Field
                label="Semester Number / Text *"
                name="semester"
                value={form.semester}
                onChange={handleChange}
                placeholder="Sixth"
                error={errors.semester}
              />
              <div className="field">
                <label>Semester Term *</label>
                <div className="term-selector">
                  {TERM_OPTIONS.map((term) => (
                    <button
                      key={term}
                      type="button"
                      className={form.semesterTerm === term ? "active" : ""}
                      onClick={() => handleTermSelect(term)}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
              <div className="two-col">
                <Field
                  label="Code *"
                  name="courseCode"
                  value={form.courseCode}
                  onChange={handleChange}
                  placeholder="Code *"
                  error={errors.courseCode}
                />
                <Field
                  label="Course Title *"
                  name="courseName"
                  value={form.courseName}
                  onChange={handleChange}
                  placeholder="Course Title *"
                  error={errors.courseName}
                />
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2>Faculty Details</h2>
              <span className="tag">Teacher</span>
            </div>

            <div className="form-grid">
              <Field
                label="Course Teacher Name *"
                name="teacherName"
                value={form.teacherName}
                onChange={handleChange}
                placeholder="Course Teacher Name *"
                error={errors.teacherName}
              />
              <Field
                label="Designation *"
                name="designation"
                value={form.designation}
                onChange={handleChange}
                placeholder="Designation *"
                error={errors.designation}
              />
              <Field
                label="Submission Date *"
                name="submissionDate"
                value={form.submissionDate}
                onChange={handleChange}
                type="date"
                error={errors.submissionDate}
              />
            </div>

            <div className="action-row">
              <button type="button" className="primary-btn" onClick={handlePrint} disabled={isExporting}>
                Print Cover Only
              </button>
              <button type="button" className="secondary-btn" onClick={resetForm} disabled={isExporting}>
                Reset
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <h2>Merge Assignment</h2>
              <div className="merge-toggle">
                <button
                  type="button"
                  className={mergeMode === "pdf" ? "active" : ""}
                  onClick={() => updateMergeMode("pdf")}
                >
                  PDF
                </button>
                <button
                  type="button"
                  className={mergeMode === "image" ? "active" : ""}
                  onClick={() => updateMergeMode("image")}
                >
                  Photos
                </button>
              </div>
            </div>

            <div
              className={`upload-box ${isDragActive ? "drag-active" : ""}`}
              role="button"
              tabIndex="0"
              onClick={() => uploadRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  uploadRef.current?.click();
                }
              }}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="upload-title">
                {mergeMode === "pdf" ? "Drop PDF files here" : "Drop JPG or PNG images here"}
              </div>
              <div className="upload-subtitle">or click to browse and select multiple files</div>
              <button
                type="button"
                className="upload-choose-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  uploadRef.current?.click();
                }}
              >
                Choose Files
              </button>
              <input
                ref={uploadRef}
                type="file"
                accept={
                  mergeMode === "pdf"
                    ? "application/pdf,.pdf"
                    : "image/png,image/jpeg,.png,.jpg,.jpeg"
                }
                multiple
                onChange={handleFileChange}
              />
            </div>

            <p className="helper-text">
              The generated cover page will be the first page. Your uploaded{" "}
              {mergeMode === "pdf" ? "PDF files" : "photos"} will be appended after it.
            </p>

            {mergeFiles.length ? (
              <div className="selected-files">
                {mergeFiles.map((file, index) => (
                  <div className="selected-file" key={`${file.name}-${file.size}-${index}`}>
                    <div className="selected-file-copy">
                      <strong>{file.name}</strong>
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                    <div className="selected-file-actions">
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => moveMergeFile(index, -1)}
                        disabled={index === 0 || isExporting}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => moveMergeFile(index, 1)}
                        disabled={index === mergeFiles.length - 1 || isExporting}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="mini-btn danger"
                        onClick={() => removeMergeFile(index)}
                        disabled={isExporting}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {status ? (
              <p className="status-text">
                <strong>Status:</strong> {status}
              </p>
            ) : null}

            <div className="button-stack">
              <button
                type="button"
                className="merge-btn"
                onClick={mergeAndDownload}
                disabled={isExporting}
              >
                Download Merged PDF
              </button>
              <button type="button" className="muted-btn" onClick={clearFile} disabled={isExporting}>
                Clear Files
              </button>
            </div>
          </section>
          </aside>

          <section className="preview-panel">
            <div className="preview-toolbar">
              <div className="zoom-pill">
                <span>Zoom</span>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  value={zoom}
                  onChange={(event) =>
                    setZoom(
                      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(event.target.value)))
                    )
                  }
                />
                <strong>{zoom}%</strong>
              </div>
            </div>
            <div className="preview-frame" ref={previewFrameRef}>
              <div
                className="preview-canvas"
                style={{
                  width: `${scaledPaperWidth}px`,
                  height: `${scaledPaperHeight}px`,
                }}
              >
                <div
                  className="preview-scale-layer"
                  style={{
                    width: `${PAPER_WIDTH_PX}px`,
                    height: `${PAPER_HEIGHT_PX}px`,
                    transform: `scale(${previewScale})`,
                  }}
                >
                  <article className="paper" ref={paperRef}>
                  <section className="paper-top">
                    <header className="paper-header">
                      <div className="logo-stack">
                        <img src="./assets/diu-logo.png" alt="Daffodil International University" />
                      </div>

                      <h2 className="paper-title">{reportConfig.label}</h2>
                    </header>

                    <div className="rubric-title">ONLY FOR COURSE TEACHER</div>
                    <table className="rubric">
                      <thead>
                        <tr>
                          <th className="wide" colSpan="2">
                            Allocate Mark & Percentage
                          </th>
                          <th>Needs Improvement</th>
                          <th>Developing</th>
                          <th>Sufficient</th>
                          <th>Above Average</th>
                          <th>Total Mark</th>
                        </tr>
                        <tr>
                          <th className="wide" colSpan="2"></th>
                          <th>25%</th>
                          <th>50%</th>
                          <th>75%</th>
                          <th>100%</th>
                          <th>{reportConfig.marks}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportConfig.criteria.map(([label, mark]) => (
                          <tr key={label}>
                            <td className="criteria">{label}</td>
                            <td className="thin">{mark}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td colSpan="6">TOTAL OBTAINED MARK</td>
                          <td></td>
                        </tr>
                        <tr className="comments-row">
                          <td colSpan="2" className="criteria">
                            COMMENTS
                          </td>
                          <td colSpan="5"></td>
                        </tr>
                      </tbody>
                    </table>
                  </section>

                  <section className="meta-block">
                    <div className="semester-row">
                      <span className="semester-label">Semester:</span>
                      <div className="semester-options">
                        {TERM_OPTIONS.map((term, index) => (
                          <React.Fragment key={term}>
                            <span
                              className={`semester-option ${
                                form.semesterTerm === term ? "selected" : ""
                              }`}
                            >
                              {term}
                            </span>
                            {index < TERM_OPTIONS.length - 1 ? (
                              <span className="semester-divider">/</span>
                            ) : null}
                          </React.Fragment>
                        ))}
                      </div>
                      <span className="semester-value">
                        : {formatCoverValue(form.semester, "............")}
                      </span>
                    </div>
                    <div className="meta-grid">
                      <InfoLine label="Student Name:" value={formatCoverValue(form.studentName)} />
                      <InfoLine label="Student ID:" value={formatCoverValue(form.studentId)} />
                      <InfoLine label="Batch:" value={formatCoverValue(form.batch, "....")} />
                      <InfoLine label="Section:" value={formatCoverValue(form.section, "....")} />
                      <InfoLine label="Course Code:" value={formatCoverValue(form.courseCode)} />
                      <InfoLine label="Course Name:" value={formatCoverValue(form.courseName)} />
                    </div>

                    <div className="teacher-block">
                      <InfoLine
                        label="Course Teacher Name:"
                        value={formatCoverValue(form.teacherName)}
                      />
                      <InfoLine label="Designation:" value={formatCoverValue(form.designation)} />
                      <InfoLine
                        label="Submission Date:"
                        value={formatDateDisplay(form.submissionDate)}
                      />
                    </div>
                  </section>
                  </article>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
      {isExporting ? (
        <div className="loading-overlay" aria-live="polite" aria-busy="true">
          <div className="loading-card">
            <div className="loading-spinner"></div>
            <h2>Building Your PDF</h2>
            <p>{exportMessage || "Please wait while your files are being prepared."}</p>
          </div>
        </div>
      ) : null}
      <footer className="site-footer">
        <p>&copy; 2026 All Rights Reserved.</p>
        <p>
          Developed by <strong>Shahadat Haque Fardin</strong>
        </p>
        <div className="footer-links">
          <a href="https://github.com/Shahadat468" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <span>|</span>
          <a
            href="https://www.linkedin.com/in/shahadat-haque-fardin-77b084356/"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
          <span>|</span>
          <a href="mailto:shahadathaque468@gmail.com">Email</a>
        </div>
      </footer>
    </div>
  );
}

function Field({ label, name, value, onChange, placeholder, type = "text", error }) {
  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <p className="info-line">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </p>
  );
}

function formatCoverValue(value, fallback = "................................................") {
  return value?.trim() ? value : fallback;
}

function formatDateDisplay(value) {
  const source = value || getTodayIso();
  const [year, month, day] = source.split("-");

  if (!year || !month || !day) {
    return "......./....../.......";
  }

  return `${day}/${month}/${year}`;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
