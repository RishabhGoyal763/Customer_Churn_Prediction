const fs = require('fs');
const path = require('path');
const { chromium } = require('../frontend/node_modules/playwright-core');

function markdownToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent = [];
  let inTable = false;
  let tableHeaderDone = false;
  let inList = false;
  let listType = 'ul';

  function closeList() {
    if (inList) {
      html += `</${listType}>\n`;
      inList = false;
    }
  }

  function closeTable() {
    if (inTable) {
      html += '</tbody></table>\n';
      inTable = false;
      tableHeaderDone = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Page breaks
    if (line.trim() === '\\newpage') {
      closeList();
      closeTable();
      html += '<div class="page-break"></div>\n';
      continue;
    }

    // Code blocks
    if (line.trim().startsWith('```')) {
      closeList();
      closeTable();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockContent = [];
      } else {
        inCodeBlock = false;
        const codeText = codeBlockContent.join('\n')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        if (codeBlockLang === 'mermaid') {
          html += `<div class="mermaid-box"><pre class="mermaid-code"><code>${codeText}</code></pre></div>\n`;
        } else {
          html += `<pre class="code-block"><code class="language-${codeBlockLang}">${codeText}</code></pre>\n`;
        }
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---') {
      closeList();
      closeTable();
      html += '<hr class="section-divider" />\n';
      continue;
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      closeList();
      const rawCols = line.trim().slice(1, -1).split('|').map(c => c.trim());

      // Check if it's separator line (e.g. |---|---|)
      if (rawCols.every(c => /^:?-+:?$/.test(c))) {
        tableHeaderDone = true;
        continue;
      }

      if (!inTable) {
        inTable = true;
        html += '<table class="academic-table"><thead><tr>';
        rawCols.forEach(col => {
          html += `<th>${inlineFormat(col)}</th>`;
        });
        html += '</tr></thead><tbody>\n';
      } else {
        html += '<tr>';
        rawCols.forEach(col => {
          html += `<td>${inlineFormat(col)}</td>`;
        });
        html += '</tr>\n';
      }
      continue;
    } else {
      closeTable();
    }

    // Headings
    if (line.startsWith('# ')) {
      closeList();
      const text = line.slice(2).trim();
      const isChapter = text.toUpperCase().startsWith('CHAPTER') || text.toUpperCase().includes('DISSERTATION') || text.toUpperCase().includes('BONAFIDE');
      const cls = isChapter ? 'chapter-title' : 'doc-title';
      html += `<h1 class="${cls}">${inlineFormat(text)}</h1>\n`;
      continue;
    }
    if (line.startsWith('## ')) {
      closeList();
      html += `<h2>${inlineFormat(line.slice(3).trim())}</h2>\n`;
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      html += `<h3>${inlineFormat(line.slice(4).trim())}</h3>\n`;
      continue;
    }
    if (line.startsWith('#### ')) {
      closeList();
      html += `<h4>${inlineFormat(line.slice(5).trim())}</h4>\n`;
      continue;
    }

    // Images
    const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      closeList();
      const alt = imgMatch[1];
      let src = imgMatch[2];
      if (src.startsWith('file://')) {
        src = src.replace('file://', '');
      }
      if (!path.isAbsolute(src)) {
        src = path.resolve(__dirname, '..', src);
      }
      let imgBase64 = src;
      if (fs.existsSync(src)) {
        const ext = path.extname(src).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
        const b64 = fs.readFileSync(src).toString('base64');
        imgBase64 = `data:${mime};base64,${b64}`;
      }
      html += `
        <figure class="figure-container">
          <img src="${imgBase64}" alt="${alt}" class="report-img" />
          <figcaption class="figure-caption">${alt}</figcaption>
        </figure>\n`;
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const content = line.replace(/^\s*[-*]\s+/, '').trim();
      if (!inList || listType !== 'ul') {
        closeList();
        inList = true;
        listType = 'ul';
        html += '<ul class="academic-list">\n';
      }
      html += `<li>${inlineFormat(content)}</li>\n`;
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const content = line.replace(/^\s*\d+\.\s+/, '').trim();
      if (!inList || listType !== 'ol') {
        closeList();
        inList = true;
        listType = 'ol';
        html += '<ol class="academic-list">\n';
      }
      html += `<li>${inlineFormat(content)}</li>\n`;
      continue;
    }

    closeList();

    // Empty lines
    if (line.trim() === '') {
      continue;
    }

    // Paragraph
    html += `<p>${inlineFormat(line.trim())}</p>\n`;
  }

  closeList();
  closeTable();
  return html;
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\$([^\$]+)\$/g, '<span class="math">$1</span>');
}

async function generatePdf() {
  const mdPath = path.resolve(__dirname, '../docs/Customer360_AI_College_Project_Report.md');
  const pdfPath = path.resolve(__dirname, '../docs/Customer360_AI_College_Project_Report.pdf');

  console.log('Reading Markdown report...');
  const mdContent = fs.readFileSync(mdPath, 'utf8');

  console.log('Parsing Markdown to publication HTML...');
  const bodyHtml = markdownToHtml(mdContent);

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Customer360 AI — MCA Project Report</title>
<style>
  @page {
    size: A4;
    margin: 25mm 20mm 25mm 25mm;
    @top-right {
      content: "Customer360 AI — MCA Dissertation";
      font-size: 8pt;
      font-family: "Times New Roman", Times, serif;
      color: #666;
    }
    @bottom-center {
      content: counter(page);
      font-size: 9pt;
      font-family: "Times New Roman", Times, serif;
    }
  }

  body {
    font-family: "Times New Roman", Times, Georgia, serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #111;
    margin: 0;
    padding: 0;
    text-align: justify;
  }

  .page-break {
    page-break-before: always;
  }

  h1.doc-title {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 20pt;
    font-weight: bold;
    text-align: center;
    line-height: 1.3;
    margin-top: 40px;
    margin-bottom: 25px;
    text-transform: uppercase;
    color: #0f172a;
  }

  h1.chapter-title {
    page-break-before: always;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 17pt;
    font-weight: bold;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 8px;
    margin-top: 20px;
    margin-bottom: 20px;
    text-transform: uppercase;
    color: #0f172a;
  }

  h2 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13pt;
    font-weight: bold;
    color: #1e293b;
    margin-top: 25px;
    margin-bottom: 12px;
  }

  h3 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11.5pt;
    font-weight: bold;
    color: #334155;
    margin-top: 18px;
    margin-bottom: 8px;
  }

  h4 {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    font-weight: bold;
    font-style: italic;
    color: #475569;
    margin-top: 14px;
    margin-bottom: 6px;
  }

  p {
    margin-top: 0;
    margin-bottom: 12px;
    text-indent: 0;
  }

  .academic-list {
    margin-top: 4px;
    margin-bottom: 12px;
    padding-left: 28px;
  }

  .academic-list li {
    margin-bottom: 6px;
  }

  .academic-table {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }

  .academic-table th, .academic-table td {
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    text-align: left;
  }

  .academic-table th {
    background-color: #f1f5f9;
    font-weight: bold;
    color: #0f172a;
  }

  .academic-table tr:nth-child(even) {
    background-color: #f8fafc;
  }

  .code-block {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 12px;
    font-family: "Courier New", Courier, monospace;
    font-size: 8.5pt;
    line-height: 1.45;
    overflow-x: auto;
    page-break-inside: avoid;
    margin: 14px 0;
  }

  .inline-code {
    background-color: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: "Courier New", Courier, monospace;
    font-size: 9pt;
  }

  .mermaid-box {
    background-color: #f8fafc;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    padding: 12px;
    margin: 16px 0;
    font-family: "Courier New", Courier, monospace;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }

  .math {
    font-family: "Cambria Math", "Latin Modern Math", serif;
    font-style: italic;
  }

  .figure-container {
    text-align: center;
    margin: 22px 0;
    page-break-inside: avoid;
  }

  .report-img {
    max-width: 95%;
    height: auto;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .figure-caption {
    font-size: 9.5pt;
    font-style: italic;
    color: #475569;
    margin-top: 8px;
  }

  .section-divider {
    border: 0;
    height: 1px;
    background: #cbd5e1;
    margin: 25px 0;
  }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  const htmlPath = path.resolve(__dirname, '../docs/report_preview.html');
  fs.writeFileSync(htmlPath, fullHtml, 'utf8');
  console.log(`Saved intermediate HTML to ${htmlPath}`);

  console.log('Launching headless Chrome via Playwright...');
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  console.log('Loading report HTML into browser...');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  console.log('Rendering publication-grade PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '25mm',
      bottom: '25mm',
      left: '25mm',
      right: '25mm'
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 8pt; font-family: 'Times New Roman', serif; width: 100%; text-align: right; padding-right: 25mm; color: #64748b;">
        Customer360 AI — Master of Computer Applications (MCA) Project Report
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 9pt; font-family: 'Times New Roman', serif; width: 100%; text-align: center; color: #334155;">
        <span class="pageNumber"></span>
      </div>
    `
  });

  console.log(`PDF successfully generated at: ${pdfPath}`);
  await browser.close();

  // Also copy to artifact directory
  const artifactPdf = '/Users/rishabhgoyal/.gemini/antigravity/brain/f3446027-b73e-439f-a1e1-4f4b51e0590e/Customer360_AI_College_Project_Report.pdf';
  fs.copyFileSync(pdfPath, artifactPdf);
  console.log(`Synced PDF to artifact dir: ${artifactPdf}`);
}

generatePdf().catch(err => {
  console.error('Fatal error during PDF generation:', err);
  process.exit(1);
});
