# DIU CoverFront

DIU CoverFront is a web app for generating Daffodil International University cover pages for assignments and lab reports.

It lets students:
- fill in student, course, and faculty details
- preview the cover page live in A4 format
- print the cover page only
- merge the generated cover page with assignment PDFs
- merge the generated cover page with one or more image files
- reorder or remove selected files before export

![DIU CoverFront Preview](./assets/og-cover-preview.png)

## Supported Report Types

- Theory Assignment Report
- Lab Assignment Report
- Lab Report
- Lab Final Report

## Features

- React-based interface using plain `HTML`, `CSS`, and `JavaScript`
- A4 cover page preview
- semester term selector with semester text input
- required-field validation
- auto-save with `localStorage`
- drag-and-drop upload support
- multiple PDF or image merge support
- export loading overlay
- responsive layout
- SEO-ready metadata, sitemap, robots, and structured data

## Tech Stack

- HTML
- CSS
- JavaScript
- React 18 via CDN
- `pdf-lib`
- `html2canvas`

## Project Structure

```text
.
├── app.js
├── index.html
├── styles.css
├── robots.txt
├── sitemap.xml
├── site.webmanifest
└── assets
    ├── diu-logo.png
    ├── og-cover-preview.png
    └── Theory Assignment Cover page.docx.png
```

## Run Locally

This project is a static frontend app, so you can run it with any simple local server.

### Option 1: VS Code Live Server

1. Open the project folder in VS Code
2. Install the `Live Server` extension
3. Right-click `index.html`
4. Click `Open with Live Server`

### Option 2: Python

```bash
python3 -m http.server 5500
```

Then open:

```text
http://127.0.0.1:5500
```

## Deploy on GitHub and Vercel

### Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

### Deploy to Vercel

1. Go to [Vercel](https://vercel.com/)
2. Import your GitHub repository
3. Deploy as a static site

No build step is required for this project.

## Important SEO Step After Deployment

After Vercel gives you the final production URL, update:

- `robots.txt`
- `sitemap.xml`

Replace:

```text
https://your-production-domain.vercel.app
```

with your real deployed domain.

Then:

1. open Google Search Console
2. verify your site
3. submit your sitemap
4. request indexing for the homepage

## Notes

- Internet access is needed because React, Babel, `pdf-lib`, and `html2canvas` are loaded from CDN.
- Vercel preview deployments are normally not indexed by search engines, which helps avoid duplicate indexing issues.

## Author

Shahadat Haque Fardin

- GitHub: [Shahadat468](https://github.com/Shahadat468)
- LinkedIn: [Shahadat Haque Fardin](https://www.linkedin.com/in/shahadat-haque-fardin-77b084356/)
- Email: [shahadathaque468@gmail.com](mailto:shahadathaque468@gmail.com)
- nothing ()()()
