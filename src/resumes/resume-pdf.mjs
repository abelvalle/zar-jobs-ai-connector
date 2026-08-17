import PDFDocument from "pdfkit";

import { validateResume } from "./resume-tools.mjs";

const MAX_PAGES = 10;
const MAX_PDF_BYTES = 2_000_000;
const MAX_RESUME_CHARACTERS = 200_000;

export async function renderResumePdf(resume, requestedFileName) {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors[0].path} ${validation.errors[0].message}`);
  }
  if (JSON.stringify(resume).length > MAX_RESUME_CHARACTERS) {
    throw new Error("Resume is too large for portable PDF output (200 KB maximum).");
  }

  const labels = sectionLabels(resume.meta?.language);
  const fileName = safePdfFileName(requestedFileName, resume.basics.name);
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 45, right: 45, bottom: 45, left: 45 },
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

  renderHeader(doc, resume.basics);
  renderWork(doc, resume.work, labels.work, labels.present);
  renderProjects(doc, resume.projects, labels.projects);
  renderEducation(doc, resume.education, labels.education, labels.present);
  renderSkills(doc, resume.skills, labels.skills);
  renderCertificates(doc, resume.certificates, labels.certificates);
  renderLanguages(doc, resume.languages, labels.languages);

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
    fileName,
    bytes: buffer.length,
    pages,
    stored: false,
    buffer,
  };
}

function renderHeader(doc, basics) {
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#111111").text(basics.name);
  if (hasText(basics.label)) {
    doc.font("Helvetica").fontSize(11).text(basics.label);
  }
  const contact = renderContact(basics);
  if (contact) {
    doc.moveDown(0.25).font("Helvetica").fontSize(9).fillColor("#333333").text(contact);
  }
  if (hasText(basics.summary)) {
    doc.moveDown(0.5).font("Helvetica").fontSize(10).fillColor("#111111").text(basics.summary);
  }
  doc.moveDown(0.5).strokeColor("#555555").lineWidth(0.5)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.5);
}

function renderWork(doc, items, title, present) {
  renderEntries(doc, title, items, (item) => {
    entryTitle(doc, [item.position, item.name].filter(hasText).join(" - "));
    meta(doc, joinPresent([dateRange(item.startDate, item.endDate, present), item.location], " | "));
    body(doc, item.summary);
    bullets(doc, item.highlights);
  });
}

function renderProjects(doc, items, title) {
  renderEntries(doc, title, items, (item) => {
    entryTitle(doc, item.name);
    body(doc, item.description || item.summary);
    bullets(doc, item.highlights);
  });
}

function renderEducation(doc, items, title, present) {
  renderEntries(doc, title, items, (item) => {
    entryTitle(doc, [item.studyType, item.area].filter(hasText).join(" - "));
    body(doc, item.institution);
    meta(doc, dateRange(item.startDate, item.endDate, present));
  });
}

function renderSkills(doc, items, title) {
  renderEntries(doc, title, items, (item) => {
    const keywords = (item.keywords ?? []).filter(hasText).join(", ");
    body(doc, joinPresent([item.name, keywords], ": "));
  });
}

function renderCertificates(doc, items, title) {
  renderEntries(doc, title, items, (item) => {
    body(doc, joinPresent([item.name, item.issuer, item.date], " - "));
  });
}

function renderLanguages(doc, items, title) {
  renderEntries(doc, title, items, (item) => {
    body(doc, joinPresent([item.language, item.fluency], ": "));
  });
}

function renderEntries(doc, title, items, renderItem) {
  if (!Array.isArray(items) || items.length === 0) return;
  ensureSpace(doc, 65);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#111111").text(title);
  doc.moveDown(0.2).strokeColor("#999999").lineWidth(0.4)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.35);
  for (const item of items) {
    ensureSpace(doc, 45);
    renderItem(item);
    doc.moveDown(0.35);
  }
}

function entryTitle(doc, value) {
  if (hasText(value)) doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#111111").text(value);
}

function meta(doc, value) {
  if (hasText(value)) doc.font("Helvetica").fontSize(9).fillColor("#444444").text(value);
}

function body(doc, value) {
  if (hasText(value)) doc.font("Helvetica").fontSize(10).fillColor("#111111").text(value);
}

function bullets(doc, items) {
  const values = (items ?? []).filter(hasText);
  if (values.length === 0) return;
  doc.font("Helvetica").fontSize(10).fillColor("#111111").list(values, {
    bulletRadius: 1.5,
    bulletIndent: 5,
    textIndent: 14,
  });
}

function renderContact(basics) {
  const location = joinPresent([
    basics.location?.city,
    basics.location?.region,
    basics.location?.countryCode,
  ], ", ");
  return [basics.email, basics.phone, location, safeHttpUrl(basics.url)]
    .filter(hasText)
    .join(" | ");
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

function sectionLabels(language) {
  return String(language ?? "").toLowerCase().startsWith("es")
    ? {
        resume: "Currículum",
        work: "Experiencia profesional",
        projects: "Proyectos",
        education: "Formación",
        skills: "Competencias",
        certificates: "Certificaciones",
        languages: "Idiomas",
        present: "Actualidad",
      }
    : {
        resume: "Resume",
        work: "Work Experience",
        projects: "Projects",
        education: "Education",
        skills: "Skills",
        certificates: "Certifications",
        languages: "Languages",
        present: "Present",
      };
}

function joinPresent(values, separator) {
  return values.filter(hasText).join(separator);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
