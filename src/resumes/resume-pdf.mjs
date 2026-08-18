import PDFDocument from "pdfkit";

import { RESUME_TEMPLATES, validateResume } from "./resume-tools.mjs";
import { resumeSectionLabels } from "./resume-labels.mjs";

const MAX_PAGES = 10;
const MAX_PDF_BYTES = 2_000_000;
const MAX_RESUME_CHARACTERS = 200_000;

export async function renderResumePdf(resume, requestedFileName, template = "classic") {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors[0].path} ${validation.errors[0].message}`);
  }
  if (JSON.stringify(resume).length > MAX_RESUME_CHARACTERS) {
    throw new Error("Resume is too large for portable PDF output (200 KB maximum).");
  }

  if (!RESUME_TEMPLATES.includes(template)) {
    throw new Error(`Unknown resume template: ${template}`);
  }

  const style = pdfTemplateStyle(template);
  const labels = resumeSectionLabels(resume.meta?.language);
  const fileName = safePdfFileName(requestedFileName, resume.basics.name);
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: style.margin, right: style.margin, bottom: style.margin, left: style.margin },
    bufferPages: true,
    info: {
      Title: `${resume.basics.name} - ${labels.resume}`,
      Author: resume.basics.name,
      Subject: labels.resume,
      Creator: "Zar Jobs AI Connector",
    },
  });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const completed = new Promise((resolve, reject) => {
    doc.once("end", resolve);
    doc.once("error", reject);
  });

  renderHeader(doc, resume.basics, style);
  renderWork(doc, resume.work, labels.work, labels.present, style);
  renderProjects(doc, resume.projects, labels.projects, style);
  renderEducation(doc, resume.education, labels.education, labels.present, style);
  renderSkills(doc, resume.skills, labels.skills, style);
  renderCertificates(doc, resume.certificates, labels.certificates, style);
  renderLanguages(doc, resume.languages, labels.languages, style);

  const pages = doc.bufferedPageRange().count;
  if (pages > MAX_PAGES) {
    doc.end();
    await completed;
    throw new Error(`Portable PDF output is limited to ${MAX_PAGES} pages.`);
  }

  doc.end();
  await completed;
  const buffer = Buffer.concat(chunks);
  if (buffer.length > MAX_PDF_BYTES) {
    throw new Error("Portable PDF output exceeds the 2 MB limit.");
  }

  return {
    format: "pdf",
    mimeType: "application/pdf",
    encoding: "base64",
    template,
    fileName,
    bytes: buffer.length,
    pages,
    stored: false,
    buffer,
  };
}

function renderHeader(doc, basics, style) {
  doc.font("Helvetica-Bold").fontSize(style.nameSize).fillColor(style.accent).text(basics.name);
  if (hasText(basics.label)) {
    doc.font("Helvetica").fontSize(style.labelSize).fillColor("#111111").text(basics.label);
  }
  const contact = renderContact(basics);
  if (contact) {
    doc.moveDown(style.smallGap).font("Helvetica").fontSize(style.metaSize).fillColor("#333333").text(contact);
  }
  if (hasText(basics.summary)) {
    doc.moveDown(style.mediumGap).font("Helvetica").fontSize(style.bodySize).fillColor("#111111").text(basics.summary);
  }
  doc.moveDown(style.mediumGap).strokeColor(style.accent).lineWidth(style.headerLineWidth)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(style.mediumGap);
}

function renderWork(doc, items, title, present, style) {
  renderEntries(doc, title, items, style, (item) => {
    entryTitle(doc, [item.position, item.name].filter(hasText).join(" - "), style);
    meta(doc, joinPresent([dateRange(item.startDate, item.endDate, present), item.location], " | "), style);
    body(doc, item.summary, style);
    bullets(doc, item.highlights, style);
  });
}

function renderProjects(doc, items, title, style) {
  renderEntries(doc, title, items, style, (item) => {
    entryTitle(doc, item.name, style);
    body(doc, item.description || item.summary, style);
    bullets(doc, item.highlights, style);
  });
}

function renderEducation(doc, items, title, present, style) {
  renderEntries(doc, title, items, style, (item) => {
    entryTitle(doc, [item.studyType, item.area].filter(hasText).join(" - "), style);
    body(doc, item.institution, style);
    meta(doc, dateRange(item.startDate, item.endDate, present), style);
  });
}

function renderSkills(doc, items, title, style) {
  renderEntries(doc, title, items, style, (item) => {
    const keywords = (item.keywords ?? []).filter(hasText).join(", ");
    body(doc, joinPresent([item.name, keywords], ": "), style);
  });
}

function renderCertificates(doc, items, title, style) {
  renderEntries(doc, title, items, style, (item) => {
    body(doc, joinPresent([item.name, item.issuer, item.date], " - "), style);
  });
}

function renderLanguages(doc, items, title, style) {
  renderEntries(doc, title, items, style, (item) => {
    body(doc, joinPresent([item.language, item.fluency], ": "), style);
  });
}

function renderEntries(doc, title, items, style, renderItem) {
  if (!Array.isArray(items) || items.length === 0) return;
  ensureSpace(doc, style.sectionMinimumSpace);
  doc.font("Helvetica-Bold").fontSize(style.sectionSize).fillColor(style.accent)
    .text(style.uppercaseSections ? title.toUpperCase() : title);
  doc.moveDown(style.sectionLineGap).strokeColor(style.sectionLine).lineWidth(style.sectionLineWidth)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(style.entryGap);
  for (const item of items) {
    ensureSpace(doc, style.entryMinimumSpace);
    renderItem(item);
    doc.moveDown(style.entryGap);
  }
}

function entryTitle(doc, value, style) {
  if (hasText(value)) doc.font("Helvetica-Bold").fontSize(style.entrySize).fillColor("#111111").text(value);
}

function meta(doc, value, style) {
  if (hasText(value)) doc.font("Helvetica").fontSize(style.metaSize).fillColor("#444444").text(value);
}

function body(doc, value, style) {
  if (hasText(value)) doc.font("Helvetica").fontSize(style.bodySize).fillColor("#111111").text(value);
}

function bullets(doc, items, style) {
  const values = (items ?? []).filter(hasText);
  if (values.length === 0) return;
  doc.font("Helvetica").fontSize(style.bodySize).fillColor("#111111").list(values, {
    bulletRadius: style.bulletRadius,
    bulletIndent: 5,
    textIndent: 14,
  });
}

function pdfTemplateStyle(template) {
  if (template === "compact") {
    return {
      margin: 36, accent: "#111111", nameSize: 20, labelSize: 10, metaSize: 8.5,
      bodySize: 9, sectionSize: 11.5, entrySize: 9.5, headerLineWidth: 0.5,
      sectionLine: "#aaaaaa", sectionLineWidth: 0.35, uppercaseSections: false,
      smallGap: 0.15, mediumGap: 0.3, sectionLineGap: 0.1, entryGap: 0.2,
      sectionMinimumSpace: 55, entryMinimumSpace: 38, bulletRadius: 1.25,
    };
  }
  if (template === "technical") {
    return {
      margin: 42, accent: "#17324d", nameSize: 21, labelSize: 10.5, metaSize: 8.75,
      bodySize: 9.5, sectionSize: 12, entrySize: 10, headerLineWidth: 1,
      sectionLine: "#587087", sectionLineWidth: 0.6, uppercaseSections: true,
      smallGap: 0.2, mediumGap: 0.4, sectionLineGap: 0.15, entryGap: 0.3,
      sectionMinimumSpace: 60, entryMinimumSpace: 42, bulletRadius: 1.4,
    };
  }
  return {
    margin: 45, accent: "#111111", nameSize: 22, labelSize: 11, metaSize: 9,
    bodySize: 10, sectionSize: 13, entrySize: 10.5, headerLineWidth: 0.5,
    sectionLine: "#999999", sectionLineWidth: 0.4, uppercaseSections: false,
    smallGap: 0.25, mediumGap: 0.5, sectionLineGap: 0.2, entryGap: 0.35,
    sectionMinimumSpace: 65, entryMinimumSpace: 45, bulletRadius: 1.5,
  };
}

function renderContact(basics) {
  const location = joinPresent([
    basics.location?.city,
    basics.location?.region,
    basics.location?.countryCode,
  ], ", ");
  return [renderableEmail(basics.email), basics.phone, location, safeHttpUrl(basics.url)]
    .filter(hasText)
    .join(" | ");
}

function renderableEmail(value) {
  return typeof value === "string" && !value.toLowerCase().endsWith("@example.invalid")
    ? value
    : "";
}

function dateRange(startDate, endDate, present) {
  return hasText(startDate) ? `${startDate} - ${endDate || present}` : "";
}

function ensureSpace(doc, points) {
  if (doc.y + points > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function safePdfFileName(requested, name) {
  if (requested !== undefined) {
    if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,114}\.pdf$/iu.test(requested) || /[\\/]/.test(requested)) {
      throw new Error("fileName must be a plain PDF filename without a path.");
    }
    return requested;
  }
  const slug = String(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "resume";
  return `${slug}.pdf`;
}

function safeHttpUrl(value) {
  if (!hasText(value)) return "";
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function joinPresent(values, separator) {
  return values.filter(hasText).join(separator);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
