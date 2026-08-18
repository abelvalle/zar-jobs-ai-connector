import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  PageOrientation,
  Paragraph,
  TextRun,
} from "docx";

import { RESUME_TEMPLATES, validateResume } from "./resume-tools.mjs";
import { resumeSectionLabels } from "./resume-labels.mjs";

const MAX_DOCX_BYTES = 2_000_000;
const MAX_RESUME_CHARACTERS = 200_000;

export async function renderResumeDocx(resume, requestedFileName, template = "classic") {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors[0].path} ${validation.errors[0].message}`);
  }
  if (JSON.stringify(resume).length > MAX_RESUME_CHARACTERS) {
    throw new Error("Resume is too large for portable DOCX output (200 KB maximum).");
  }
  if (!RESUME_TEMPLATES.includes(template)) {
    throw new Error(`Unknown resume template: ${template}`);
  }

  const style = docxTemplateStyle(template);
  const labels = resumeSectionLabels(resume.meta?.language);
  const fileName = safeDocxFileName(requestedFileName, resume.basics.name);
  const children = [
    ...renderHeader(resume.basics),
    ...renderWork(resume.work, labels.work, labels.present),
    ...renderProjects(resume.projects, labels.projects),
    ...renderEducation(resume.education, labels.education, labels.present),
    ...renderSkills(resume.skills, labels.skills),
    ...renderCertificates(resume.certificates, labels.certificates),
    ...renderLanguages(resume.languages, labels.languages),
  ];
  const document = new Document({
    creator: "Zar Jobs AI Connector",
    title: `${resume.basics.name} - ${labels.resume}`,
    subject: labels.resume,
    description: `ATS-oriented resume using the ${template} template`,
    styles: documentStyles(style),
    numbering: resumeNumbering(style),
    sections: [
      {
        properties: {
          page: {
            size: { width: 11_906, height: 16_838, orientation: PageOrientation.PORTRAIT },
            margin: { top: style.margin, right: style.margin, bottom: style.margin, left: style.margin },
          },
        },
        children,
      },
    ],
  });
  const buffer = await Packer.toBuffer(document);
  if (buffer.length > MAX_DOCX_BYTES) {
    throw new Error("Portable DOCX output exceeds the 2 MB limit.");
  }

  return {
    format: "docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    encoding: "base64",
    template,
    fileName,
    bytes: buffer.length,
    stored: false,
    buffer,
  };
}

function renderHeader(basics) {
  const contact = [
    basics.email,
    basics.phone,
    [basics.location?.city, basics.location?.region, basics.location?.countryCode]
      .filter(hasText)
      .join(", "),
    basics.url,
  ].filter(hasText).join(" | ");
  return [
    paragraph(basics.name, "ResumeName"),
    paragraph(basics.label, "ResumeLabel"),
    paragraph(contact, "ResumeMeta"),
    paragraph(basics.summary, "ResumeSummary"),
  ].filter(Boolean);
}

function renderWork(items, title, present) {
  if (!hasItems(items)) return [];
  return [
    sectionHeading(title),
    ...items.flatMap((item) => [
      entryHeading([item.position, item.name].filter(hasText).join(" - ")),
      paragraph(renderDateRange(item.startDate, item.endDate, present), "ResumeMeta"),
      paragraph(item.summary, "ResumeBody"),
      ...bullets(item.highlights),
    ].filter(Boolean)),
  ];
}

function renderProjects(items, title) {
  if (!hasItems(items)) return [];
  return [
    sectionHeading(title),
    ...items.flatMap((item) => [
      entryHeading(item.name),
      paragraph(item.description, "ResumeBody"),
      ...bullets(item.highlights),
    ].filter(Boolean)),
  ];
}

function renderEducation(items, title, present) {
  if (!hasItems(items)) return [];
  return [
    sectionHeading(title),
    ...items.flatMap((item) => [
      entryHeading([item.studyType, item.area].filter(hasText).join(" - ")),
      paragraph(item.institution, "ResumeBody"),
      paragraph(renderDateRange(item.startDate, item.endDate, present), "ResumeMeta"),
      ...bullets(item.courses),
    ].filter(Boolean)),
  ];
}

function renderSkills(items, title) {
  if (!hasItems(items)) return [];
  return [
    sectionHeading(title),
    ...items.map((item) => paragraph(
      [item.name, (item.keywords ?? []).filter(hasText).join(", ")].filter(hasText).join(": "),
      "ResumeBody",
    )),
  ];
}

function renderCertificates(items, title) {
  if (!hasItems(items)) return [];
  return [
    sectionHeading(title),
    ...items.map((item) => paragraph(
      [item.name, item.issuer, item.date].filter(hasText).join(" | "),
      "ResumeBody",
    )),
  ];
}

function renderLanguages(items, title) {
  if (!hasItems(items)) return [];
  return [
    sectionHeading(title),
    ...items.map((item) => paragraph(
      [item.language, item.fluency].filter(hasText).join(": "),
      "ResumeBody",
    )),
  ];
}

function paragraph(text, style) {
  if (!hasText(text)) return null;
  return new Paragraph({ style, children: [new TextRun(text.trim())] });
}

function entryHeading(text) {
  if (!hasText(text)) return null;
  return new Paragraph({
    style: "ResumeEntry",
    children: [new TextRun({ text: text.trim(), bold: true })],
  });
}

function sectionHeading(text) {
  return new Paragraph({ style: "ResumeSection", children: [new TextRun(text)] });
}

function bullets(items) {
  if (!hasItems(items)) return [];
  return items.filter(hasText).map((item) => new Paragraph({
    style: "ResumeBullet",
    numbering: { reference: "resume-bullets", level: 0 },
    children: [new TextRun(item.trim())],
  }));
}

function documentStyles(style) {
  const border = {
    bottom: { color: style.rule, size: style.ruleSize, space: 2, style: BorderStyle.SINGLE },
  };
  return {
    default: {
      document: {
        run: { font: "Arial", size: style.bodySize },
        paragraph: { spacing: { before: 0, after: style.bodyAfter, line: style.line } },
      },
    },
    paragraphStyles: [
      {
        id: "ResumeName",
        name: "Resume Name",
        basedOn: "Normal",
        next: "ResumeLabel",
        quickFormat: true,
        run: { font: "Arial", size: style.nameSize, bold: true, color: style.accent },
        paragraph: { spacing: { before: 0, after: style.nameAfter, line: 240 }, keepNext: true },
      },
      {
        id: "ResumeLabel",
        name: "Resume Label",
        basedOn: "Normal",
        next: "ResumeMeta",
        quickFormat: true,
        run: { font: "Arial", size: style.labelSize, color: "111111" },
        paragraph: { spacing: { before: 0, after: style.metaAfter, line: 240 }, keepNext: true },
      },
      {
        id: "ResumeMeta",
        name: "Resume Metadata",
        basedOn: "Normal",
        next: "ResumeBody",
        quickFormat: true,
        run: { font: "Arial", size: style.metaSize, color: "444444" },
        paragraph: { spacing: { before: 0, after: style.metaAfter, line: 240 }, keepNext: true },
      },
      {
        id: "ResumeSummary",
        name: "Resume Summary",
        basedOn: "Normal",
        next: "ResumeSection",
        quickFormat: true,
        run: { font: "Arial", size: style.bodySize, color: "111111" },
        paragraph: { border, spacing: { before: 0, after: style.summaryAfter, line: style.line } },
      },
      {
        id: "ResumeSection",
        name: "Resume Section",
        basedOn: "Normal",
        next: "ResumeEntry",
        quickFormat: true,
        run: { font: "Arial", size: style.sectionSize, bold: true, color: style.accent },
        paragraph: {
          border,
          spacing: { before: style.sectionBefore, after: style.sectionAfter, line: 240 },
          keepNext: true,
          outlineLevel: 0,
        },
      },
      {
        id: "ResumeEntry",
        name: "Resume Entry",
        basedOn: "Normal",
        next: "ResumeMeta",
        quickFormat: true,
        run: { font: "Arial", size: style.entrySize, color: "111111" },
        paragraph: { spacing: { before: style.entryBefore, after: style.entryAfter, line: 240 }, keepNext: true },
      },
      {
        id: "ResumeBody",
        name: "Resume Body",
        basedOn: "Normal",
        quickFormat: true,
        run: { font: "Arial", size: style.bodySize, color: "111111" },
        paragraph: { spacing: { before: 0, after: style.bodyAfter, line: style.line } },
      },
      {
        id: "ResumeBullet",
        name: "Resume Bullet",
        basedOn: "Normal",
        quickFormat: true,
        run: { font: "Arial", size: style.bodySize, color: "111111" },
        paragraph: { spacing: { before: 0, after: style.bulletAfter, line: style.line } },
      },
    ],
  };
}

function resumeNumbering(style) {
  return {
    config: [
      {
        reference: "resume-bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: style.bulletIndent, hanging: style.bulletHanging },
                spacing: { before: 0, after: style.bulletAfter, line: style.line },
              },
              run: { font: "Arial", size: style.bodySize },
            },
          },
        ],
      },
    ],
  };
}

function docxTemplateStyle(template) {
  const styles = {
    classic: {
      margin: 907, accent: "111111", rule: "777777", ruleSize: 4,
      nameSize: 48, labelSize: 24, metaSize: 19, bodySize: 21, sectionSize: 28, entrySize: 23,
      line: 264, nameAfter: 40, metaAfter: 30, summaryAfter: 80, sectionBefore: 90,
      sectionAfter: 45, entryBefore: 35, entryAfter: 20, bodyAfter: 35, bulletAfter: 25,
      bulletIndent: 540, bulletHanging: 270,
    },
    compact: {
      margin: 720, accent: "111111", rule: "888888", ruleSize: 3,
      nameSize: 44, labelSize: 22, metaSize: 18, bodySize: 20, sectionSize: 26, entrySize: 22,
      line: 240, nameAfter: 20, metaAfter: 15, summaryAfter: 45, sectionBefore: 55,
      sectionAfter: 25, entryBefore: 20, entryAfter: 10, bodyAfter: 20, bulletAfter: 10,
      bulletIndent: 500, bulletHanging: 250,
    },
    technical: {
      margin: 850, accent: "203A57", rule: "203A57", ruleSize: 6,
      nameSize: 46, labelSize: 23, metaSize: 19, bodySize: 21, sectionSize: 27, entrySize: 23,
      line: 252, nameAfter: 35, metaAfter: 25, summaryAfter: 65, sectionBefore: 75,
      sectionAfter: 35, entryBefore: 30, entryAfter: 15, bodyAfter: 30, bulletAfter: 20,
      bulletIndent: 520, bulletHanging: 260,
    },
  };
  return styles[template];
}

function safeDocxFileName(requestedFileName, name) {
  if (requestedFileName !== undefined) {
    if (
      typeof requestedFileName !== "string"
      || requestedFileName !== requestedFileName.trim()
      || requestedFileName.length > 120
      || !/^[^/\\]+\.docx$/i.test(requestedFileName)
      || requestedFileName === ".docx"
    ) {
      throw new Error("fileName must be a plain DOCX filename without a path.");
    }
    return requestedFileName;
  }
  const stem = String(name)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
  return `${stem || "resume"}.docx`;
}

function renderDateRange(startDate, endDate, present) {
  if (!hasText(startDate) && !hasText(endDate)) return "";
  return [startDate, endDate || present].filter(hasText).join(" - ");
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}
