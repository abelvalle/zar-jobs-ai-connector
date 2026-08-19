import { buildEvidenceBank } from "./resume-interoperability.mjs";
import { validateResume } from "./resume-tools.mjs";

const MAX_JOBS = 20;
const MAX_DESCRIPTION = 100_000;
const MAX_TERMS = 100;

const DEFAULT_TERM_ALIASES = Object.freeze([
  ["amazon web services", ["aws", "amazon web services"]],
  ["artificial intelligence", ["ai", "artificial intelligence"]],
  ["c sharp", ["c#", "c sharp"]],
  ["continuous integration", ["ci cd", "ci/cd", "continuous integration"]],
  ["google cloud", ["gcp", "google cloud"]],
  ["javascript", ["javascript"]],
  ["machine learning", ["machine learning", "ml"]],
  ["node.js", ["node js", "node.js", "nodejs"]],
  ["postgresql", ["postgres", "postgresql"]],
  ["power bi", ["power bi", "powerbi"]],
  ["product management", ["product management"]],
  ["project management", ["project management"]],
  ["rest api", ["rest api", "restful"]],
  ["sql server", ["sql server"]],
  ["typescript", ["typescript"]],
  ...[
    "agile", "angular", "ansible", "azure", "c++", "data engineering", "data science",
    "docker", "elasticsearch", "excel", "fastapi", "figma", "flask", "git", "github actions",
    "gitlab", "go", "graphql", "java", "jenkins", "jira", "kafka", "kotlin", "kubernetes",
    "leadership", "linux", "mongodb", "mysql", "next.js", "nosql", "observability", "openai",
    "oracle", "pandas", "php", "postgres", "python", "pytorch", "react", "redis", "ruby",
    "rust", "salesforce", "scala", "scrum", "spark", "spring", "sql", "tableau", "tensorflow",
    "terraform", "vue",
  ].map((term) => [term, [term]]),
]);

export const SKILL_RADAR_DEFAULT_TERMS = Object.freeze(
  DEFAULT_TERM_ALIASES.map(([term]) => term).sort(),
);

export function analyzeJobSkillRadar(resume, jobs, options = {}) {
  assertValidResume(resume);
  const normalizedJobs = validateJobs(jobs);
  const normalizedOptions = validateOptions(options);
  const evidenceBank = buildEvidenceBank(resume);
  const terms = buildTerms(normalizedOptions.skillTerms);
  const skills = [];

  for (const entry of terms) {
    const matchingJobs = normalizedJobs.filter((job) => (
      entry.aliases.some((alias) => includesTerm(job.normalizedDescription, alias))
    ));
    if (matchingJobs.length === 0) continue;
    const evidence = evidenceBank.items.filter((item) => (
      entry.aliases.some((alias) => includesTerm(normalize(item.text), alias))
    ));
    skills.push({
      term: entry.term,
      aliasesMatched: entry.aliases.filter((alias) => (
        matchingJobs.some((job) => includesTerm(job.normalizedDescription, alias))
      )),
      jobCount: matchingJobs.length,
      sampleShare: round(matchingJobs.length / normalizedJobs.length),
      jobIds: matchingJobs.map((job) => job.id),
      resumeStatus: evidence.length > 0 ? "supported" : "unverified-gap",
      evidencePaths: evidence.map((item) => item.sourcePath),
      evidenceIds: evidence.map((item) => item.id),
      recurrence: matchingJobs.length >= 2 ? "recurring-in-sample" : "single-sample-mention",
    });
  }
  skills.sort((left, right) => right.jobCount - left.jobCount || left.term.localeCompare(right.term));
  const supported = skills.filter((item) => item.resumeStatus === "supported");
  const gaps = skills.filter((item) => item.resumeStatus === "unverified-gap");

  return {
    sample: {
      jobs: normalizedJobs.map(({ normalizedDescription, ...job }) => job),
      jobCount: normalizedJobs.length,
      suppliedTermCount: normalizedOptions.skillTerms?.length ?? 0,
      detectedSkillCount: skills.length,
    },
    skills,
    supported,
    gaps,
    investigationPriorities: gaps.map((item) => ({
      term: item.term,
      jobCount: item.jobCount,
      sampleShare: item.sampleShare,
      question: `Can you confirm real experience or evidence for ${item.term}?`,
      basis: "frequency-in-user-supplied-sample",
    })),
    method: "deterministic-user-supplied-job-skill-radar-v1",
    sampleRepresentsMarket: false,
    causalAnalysisPerformed: false,
    hiringPredictionPerformed: false,
    careerDecisionMade: false,
    learningPlanCreated: false,
    factsAdded: false,
    humanReviewRequired: true,
    stored: false,
    disclaimer:
      "Frequencies describe only the supplied job sample. A gap is a question, not proof that the candidate lacks a skill or should learn it.",
  };
}

function validateJobs(jobs) {
  if (!Array.isArray(jobs) || jobs.length < 2 || jobs.length > MAX_JOBS) {
    throw new RangeError(`jobs must contain between 2 and ${MAX_JOBS} entries`);
  }
  const ids = new Set();
  return jobs.map((job, index) => {
    if (!isPlainObject(job)) throw new TypeError(`jobs[${index}] must be an object`);
    const allowed = new Set(["id", "title", "company", "description"]);
    const unsupported = Object.keys(job).find((key) => !allowed.has(key));
    if (unsupported) throw new Error(`Unsupported jobs[${index}] field: ${unsupported}`);
    const id = boundedText(job.id, `jobs[${index}].id`, 200);
    if (ids.has(id)) throw new Error(`Duplicate job id: ${id}`);
    ids.add(id);
    const description = boundedText(job.description, `jobs[${index}].description`, MAX_DESCRIPTION);
    return {
      id,
      title: boundedText(job.title, `jobs[${index}].title`, 200),
      company: boundedText(job.company, `jobs[${index}].company`, 200),
      description,
      normalizedDescription: normalize(description),
    };
  });
}

function validateOptions(options) {
  if (!isPlainObject(options)) throw new TypeError("options must be an object");
  const allowed = new Set(["skillTerms"]);
  const unsupported = Object.keys(options).find((key) => !allowed.has(key));
  if (unsupported) throw new Error(`Unsupported skill radar option: ${unsupported}`);
  if (options.skillTerms === undefined) return {};
  if (!Array.isArray(options.skillTerms) || options.skillTerms.length === 0
      || options.skillTerms.length > MAX_TERMS) {
    throw new RangeError(`skillTerms must contain between 1 and ${MAX_TERMS} entries`);
  }
  return {
    skillTerms: unique(options.skillTerms.map((term, index) => (
      boundedText(term, `skillTerms[${index}]`, 100)
    ))),
  };
}

function buildTerms(skillTerms) {
  const entries = DEFAULT_TERM_ALIASES.map(([term, aliases]) => ({
    term,
    aliases: unique(aliases.map(normalize)),
  }));
  for (const rawTerm of skillTerms ?? []) {
    const alias = normalize(rawTerm);
    const existing = entries.find((entry) => entry.aliases.includes(alias) || normalize(entry.term) === alias);
    if (existing) continue;
    entries.push({ term: rawTerm.trim(), aliases: [alias] });
  }
  return entries;
}

function assertValidResume(resume) {
  const validation = validateResume(resume);
  if (!validation.valid) {
    throw new Error(`Invalid resume: ${validation.errors.map((item) => `${item.path} ${item.message}`).join("; ")}`);
  }
}

function includesTerm(normalizedText, normalizedTerm) {
  return ` ${normalizedText} `.includes(` ${normalizedTerm} `);
}

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}+#]+/gu, " ").trim();
}

function boundedText(value, field, maximum) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maximum) {
    throw new TypeError(`${field} must contain between 1 and ${maximum} characters`);
  }
  return value.trim();
}

function round(value) {
  return Math.round(value * 1_000) / 1_000;
}

function unique(values) {
  return [...new Set(values)];
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
