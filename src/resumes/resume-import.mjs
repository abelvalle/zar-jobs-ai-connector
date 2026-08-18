import { validateResume } from "./resume-tools.mjs";

export const RESUME_IMPORT_FORMATS = ["text", "pdf-extracted", "docx-extracted"];

const MAX_SOURCE_CHARACTERS = 200_000;
const SUPPORT_ORDER = { unmatched: 0, partial: 1, exact: 2 };

export function reviewResumeImport(resume, sourceText, sourceFormat = "text") {
  if (!RESUME_IMPORT_FORMATS.includes(sourceFormat)) {
    throw new TypeError(`Unknown resume import format: ${sourceFormat}`);
  }
  if (typeof sourceText !== "string" || sourceText.trim().length === 0) {
    throw new TypeError("sourceText is required");
  }
  if (sourceText.length > MAX_SOURCE_CHARACTERS) {
    throw new RangeError("sourceText exceeds the 200,000 character limit");
  }

  const source = normalize(sourceText);
  const sourceTokens = new Set(tokenize(source));
  const fields = collectCandidateFields(resume)
    .map(({ sourcePath, value }) => ({
      sourcePath,
      value,
      support: classifySupport(value, source, sourceTokens),
      confirmed: false,
    }))
    .sort(
      (a, b) =>
        SUPPORT_ORDER[a.support] - SUPPORT_ORDER[b.support]
        || a.sourcePath.localeCompare(b.sourcePath),
    );
  const validation = validateResume(resume);
  const counts = Object.fromEntries(
    ["exact", "partial", "unmatched"].map((support) => [
      support,
      fields.filter((field) => field.support === support).length,
    ]),
  );

  return {
    status: "confirmation-required",
    sourceFormat,
    sourceCharacters: sourceText.length,
    draftValid: validation.valid,
    draftValidation: validation,
    counts,
    fields,
    allFieldsRequireConfirmation: true,
    stored: false,
    nextSteps: [
      "Review unmatched and partial fields against the original document first.",
      "Ask the user to confirm every field before treating the draft as a base resume.",
      "Run validate_resume after corrections and before creating variants or exports.",
    ],
    disclaimer:
      "This review compares a draft with user-provided extracted text. It does not parse binary files, prove authorship, or confirm any field automatically.",
  };
}

function collectCandidateFields(value, sourcePath = "", fields = []) {
  if (sourcePath === "meta" || sourcePath.startsWith("meta.")) {
    return fields;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      fields.push({ sourcePath, value: trimmed });
    }
    return fields;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectCandidateFields(item, `${sourcePath}[${index}]`, fields);
    });
    return fields;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      collectCandidateFields(item, sourcePath ? `${sourcePath}.${key}` : key, fields);
    }
  }
  return fields;
}

function classifySupport(value, normalizedSource, sourceTokens) {
  const normalizedValue = normalize(value);
  if (!normalizedValue) {
    return "unmatched";
  }
  if (` ${normalizedSource} `.includes(` ${normalizedValue} `)) {
    return "exact";
  }

  const valueTokens = [...new Set(tokenize(normalizedValue))];
  if (valueTokens.length < 2) {
    return "unmatched";
  }
  const matchingTokens = valueTokens.filter((token) => sourceTokens.has(token)).length;
  return matchingTokens / valueTokens.length >= 0.7 ? "partial" : "unmatched";
}

function tokenize(value) {
  return value.split(" ").filter((token) => token.length >= 2);
}

function normalize(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
