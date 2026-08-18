export const RESUME_LOCALES = Object.freeze(["en", "es", "fr", "de", "it", "pt"]);

const LABELS = Object.freeze({
  en: Object.freeze({
    resume: "Resume",
    work: "Work Experience",
    projects: "Projects",
    education: "Education",
    skills: "Skills",
    certificates: "Certifications",
    languages: "Languages",
    present: "Present",
  }),
  es: Object.freeze({
    resume: "Currículum",
    work: "Experiencia profesional",
    projects: "Proyectos",
    education: "Formación",
    skills: "Competencias",
    certificates: "Certificaciones",
    languages: "Idiomas",
    present: "Actualidad",
  }),
  fr: Object.freeze({
    resume: "CV",
    work: "Expérience professionnelle",
    projects: "Projets",
    education: "Formation",
    skills: "Compétences",
    certificates: "Certifications",
    languages: "Langues",
    present: "Aujourd’hui",
  }),
  de: Object.freeze({
    resume: "Lebenslauf",
    work: "Berufserfahrung",
    projects: "Projekte",
    education: "Ausbildung",
    skills: "Kenntnisse",
    certificates: "Zertifikate",
    languages: "Sprachen",
    present: "Aktuell",
  }),
  it: Object.freeze({
    resume: "Curriculum vitae",
    work: "Esperienza professionale",
    projects: "Progetti",
    education: "Formazione",
    skills: "Competenze",
    certificates: "Certificazioni",
    languages: "Lingue",
    present: "Presente",
  }),
  pt: Object.freeze({
    resume: "Currículo",
    work: "Experiência profissional",
    projects: "Projetos",
    education: "Formação",
    skills: "Competências",
    certificates: "Certificações",
    languages: "Idiomas",
    present: "Presente",
  }),
});

export function normalizeResumeLocale(locale) {
  if (typeof locale !== "string" || !/^[a-z]{2}(?:-[a-z]{2})?$/i.test(locale)) {
    throw new TypeError(`locale must use one of: ${RESUME_LOCALES.join(", ")}`);
  }
  const language = locale.slice(0, 2).toLowerCase();
  if (!RESUME_LOCALES.includes(language)) {
    throw new TypeError(`locale must use one of: ${RESUME_LOCALES.join(", ")}`);
  }
  return language;
}

export function resumeSectionLabels(locale) {
  let language = "en";
  try {
    language = normalizeResumeLocale(String(locale ?? "en"));
  } catch {
    // Renderers preserve their historical English fallback for unknown metadata.
  }
  return LABELS[language];
}
