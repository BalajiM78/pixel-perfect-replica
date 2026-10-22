/**
 * Typed client for the ATS Resume Agent backend API.
 * Contract ported 1:1 from the existing Express backend.
 */
import { API_BASE } from "./config";
import { getCurrentToken } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SystemStatus {
  server: { port: number; host: string; logLevel: string };
  engine: {
    python?: string;
    projectRoot?: string;
    weightsSum?: number;
    dimensions?: number;
    skillTaxonomyEntries?: number;
    evidenceProjects?: string[];
    masterResume?: string | null;
    masterResumeExists?: boolean;
    pdflatex?: string | null;
    pdflatexFound?: boolean;
    outputDir?: string;
    gates?: Record<string, number>;
    error?: string;
  };
  ai: { enabledByDefault: boolean; primary: string; fallbackOrder: string[]; providers: ProviderStatusItem[] };
  extraction: { enabled: boolean; jinaConfigured: boolean; jinaEndpoint: string };
}

export interface ProviderStatusItem {
  id: string;
  label: string;
  configured: boolean;
  keyMasked: string;
  model: string;
  models: string[];
  docsUrl: string;
  lastTest?: { ok: boolean; timestamp: string; latencyMs?: number; error?: string };
}

export interface ResumeProfile {
  masterResume: string | null;
  masterResumeExists: boolean;
  pdflatexFound: boolean;
  evidenceProjects: string[];
  skillsCount: number;
  resumeScore: number;
  sections: string[];
  skillsByCategory: Record<string, string[]>;
  issues: Array<{ code: string; label: string; severity: string; message: string; location?: string }>;
}

export interface ExtractedJob {
  sourceUrl: string;
  title: string;
  company: string;
  extractedText: string;
  method: "jina" | "readability" | "fallback";
  characterCount: number;
  extractedAt: string;
}

export interface AnalysisPayload {
  jdText: string;
  resumePath?: string;
  resumeId?: string;
  jobUrl?: string;
  tailor?: boolean;
  compile?: boolean;
  topN?: number;
  objectiveOverride?: string;
  aiReview?: boolean;
  aiProvider?: string;
}

export interface ScoreCategory {
  key: string;
  label: string;
  score: number;
  weight: number;
  contribution: number;
  rationale: string;
}

export interface SkillMatch {
  skill: string;
  canonical: string;
  importance: string;
  status: "matched" | "listed_only" | "partial" | "missing" | "unsupported";
  credit: number;
  surfaces: string[];
  evidence: string[];
  related: string[];
  note: string;
  jd_context: string;
}

export interface ProjectMatch {
  key: string;
  display_name: string;
  one_liner: string;
  relevance: number;
  tech_overlap: string[];
  missing_tech: string[];
  matched_keywords: string[];
  reasons: string[];
  selected: boolean;
}

export interface AtsIssue {
  code: string;
  label: string;
  severity: string;
  message: string;
}

export interface AnalysisAction {
  priority: number;
  title: string;
  detail: string;
  category: string;
  impact: string;
}

export interface AiReview {
  provider: string;
  model: string;
  latencyMs: number;
  executiveSummary: string;
  keywordOptimization: string[];
  bulletPointEnhancements: Array<{ before: string; suggestion: string; reason: string }>;
  tailoringAdvice: string[];
  disclaimer: string;
}

export interface AnalysisResponse {
  ok: boolean;
  runId: string;
  persistence?: { persisted: boolean; mode: "cloud" | "local_only" | "unpersisted"; error?: string; warning?: string };
  report: {
    engine_version: string;
    generated_at: string;
    overall_estimated_match: number;
    raw_unweighted_score: number;
    gates_applied: string[];
    confidence: string;
    confidence_notes: string[];
    disclaimer: string;
    job: {
      title: string;
      company: string;
      required_skills: string[];
      preferred_skills: string[];
      responsibilities: string[];
      min_experience_years?: number;
      required_degree?: string;
      warnings: string[];
      skill_context?: Record<string, string[]>;
    };
    resume: {
      source_path: string;
      sections: string[];
      all_skills: string[];
      projects: string[];
      bullets: number;
      cgpa?: number;
      grad_year?: number;
      degree?: string;
    };
    categories: ScoreCategory[];
    skills: SkillMatch[];
    projects: ProjectMatch[];
    ats_issues: AtsIssue[];
    actions: AnalysisAction[];
  };
  before?: any;
  ats: any;
  edits?: Array<{ kind: string; summary: string; details?: string }>;
  compile?: { success: boolean; pages: number; target_pages: number; log_tail?: string } | null;
  artifacts: Record<string, string>;
  aiReview?: AiReview | null;
  scoreDelta?: number;
  jobDescription?: string;
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  jobTitle: string;
  company: string;
  overallScore: number;
  rawScore: number;
  eligibilityPassed: boolean;
  gatesApplied: string[];
  matchedSkillsCount: number;
  missingSkillsCount: number;
  selectedProjects: string[];
  artifacts: Record<string, string>;
  hasPdf: boolean;
  hasTailoredTex: boolean;
  hasAiReview: boolean;
  aiProvider?: string;
  aiModel?: string;
}

export interface ResumeItem {
  id: string;
  title: string;
  original_filename: string;
  source_format: string;
  is_master: boolean;
  is_system?: boolean;
  storage_key?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface EvidenceItem {
  id: string;
  userId: string;
  title: string;
  category: "project" | "skill" | "experience" | "certification" | "accomplishment";
  description: string;
  skills: string[];
  metrics: string[];
  sourceFilename?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendedEvidence {
  evidence: EvidenceItem;
  relevanceScore: number;
  matchedSkills: string[];
  rationale: string;
  source: string;
  approved: boolean;
}

export interface ProviderConfigData {
  providers: Array<ProviderStatusItem & { enabled?: boolean; userConfigured?: boolean }>;
  preferredProvider: string;
  fallbackOrder: string[];
  webReader: {
    enabled: boolean;
    provider: "jina" | "readability";
    endpoint: string;
    configured: boolean;
    keyMasked: string;
  };
}

export interface ProviderSettingsPayload {
  preferredProvider?: string;
  fallbackOrder?: string[];
  providers?: Record<string, { enabled: boolean; apiKey?: string; model?: string }>;
  webReader?: { enabled: boolean; provider: "jina" | "readability"; apiKey?: string; endpoint?: string };
}

export interface CompanyResearch {
  company: string;
  website?: string;
  summary: string;
  typicalTechStack: string[];
  keyHiringPriorities: string[];
  atsSystemType: string;
  sourceUrl?: string;
  source: string;
}

export interface AtsComparisonData {
  comparisonType?: string;
  educationalDisclaimer?: string;
  ruleBasedEngine: { system: string; score: number; scoringMethod: string; strengths: string[]; criticalGates: string[] };
  legacyKeywordAts: { system: string; description: string; scoringFactors: string[]; keyRisks: string[]; formattingRules: string[] };
  modernSemanticAts: { system: string; description: string; scoringFactors: string[]; recommendations: string[] };
  externalAtsNotice: { externalScoresAvailable: boolean; explanation: string };
}

export interface CompileResult {
  ok: boolean;
  success: boolean;
  pageCount: number;
  fitLevel: number;
  pdfUrl: string;
  texUrl: string;
  notes: string[];
  warnings: string[];
  errors: string[];
}

export interface DocxExportResult {
  ok: boolean;
  success: boolean;
  docxUrl: string;
  sizeBytes: number;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  code?: string;
  details?: unknown;
  hint?: unknown;
  status?: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token: string | null = null;
  try {
    token = await getCurrentToken();
  } catch {
    // Supabase client may be unavailable
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const targetUrl = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const response = await fetch(targetUrl, { ...options, headers });
  let data: any = {};
  try {
    data = await response.json();
  } catch {
    // Non-JSON response body
  }

  if (!response.ok) {
    const error = data?.error || {};
    const err = new ApiError(error.message || `Request failed with status ${response.status}`);
    err.code = error.code;
    err.details = error.details;
    err.hint = error.hint;
    err.status = response.status;
    throw err;
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Artifact helpers (bearer-authenticated fetch → object URL)
// ---------------------------------------------------------------------------

/** Resolve a relative artifact path (e.g. /api/analysis/1/artifacts/pdf) against the API base. */
export function artifactUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Fetch an artifact as a blob using the auth header, returning an object URL for iframe/img/download. */
export async function fetchArtifactBlob(path: string): Promise<{ url: string; blob: Blob; filename?: string }> {
  let token: string | null = null;
  try {
    token = await getCurrentToken();
  } catch {
    // ignore
  }
  const response = await fetch(artifactUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const err = new ApiError(`Could not load artifact (${response.status})`);
    err.status = response.status;
    throw err;
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = /filename="?([^";]+)"?/.exec(disposition);
  return { url: URL.createObjectURL(blob), blob, filename: match?.[1] };
}

/** Download an artifact (or plain text) to the user's disk. */
export async function downloadArtifact(path: string, fallbackName: string): Promise<void> {
  const { blob, filename } = await fetchArtifactBlob(path);
  triggerDownload(blob, filename || fallbackName);
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const api = {
  getStatus: () => request<SystemStatus>("/api/config/status"),
  getResumeProfile: () => request<ResumeProfile>("/api/resume/profile"),

  listResumes: () => request<{ resumes: ResumeItem[] }>("/api/resume"),
  uploadResume: (payload: { filename: string; contentBase64: string; title?: string; isMaster?: boolean }) =>
    request<{ ok: boolean; resume: ResumeItem; atsCheck: any }>("/api/resume/upload", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  setMasterResume: (id: string) =>
    request<{ ok: boolean; resume: ResumeItem }>(`/api/resume/${id}/master`, { method: "POST" }),
  deleteResume: (id: string) => request<{ ok: boolean; id: string }>(`/api/resume/${id}`, { method: "DELETE" }),
  getResumeDownload: (id: string) =>
    request<{ ok: boolean; downloadUrl: string; filename: string }>(`/api/resume/${id}/download`),

  extractJob: (url: string) =>
    request<{ ok: boolean; job: ExtractedJob }>("/api/jobs/extract", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  runAnalysis: (payload: AnalysisPayload) =>
    request<AnalysisResponse>("/api/analysis", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getHistory: () => request<{ history: HistoryRecord[] }>("/api/analysis"),
  getAnalysisRecord: (id: string) => request<{ record: Partial<AnalysisResponse> }>(`/api/analysis/${id}`),
  deleteHistoryRecord: (id: string) => request<{ ok: boolean; id: string }>(`/api/analysis/${id}`, { method: "DELETE" }),

  getProvidersConfig: () => request<ProviderConfigData>("/api/providers"),
  saveProviderSettings: (settings: ProviderSettingsPayload) =>
    request<{ ok: boolean; message: string }>("/api/providers/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  testProvider: (providerId: string, customKey?: string, model?: string) =>
    request<{ ok: boolean; latencyMs: number; model: string; error?: string }>(`/api/providers/${providerId}/test`, {
      method: "POST",
      body: JSON.stringify({ apiKey: customKey, model }),
    }),
  testWebReader: () =>
    request<{ ok: boolean; latencyMs: number; method?: string; message?: string; error?: string }>(
      "/api/providers/web-reader/test",
      { method: "POST" }
    ),

  listEvidence: () => request<{ ok: boolean; items: EvidenceItem[] }>("/api/evidence"),
  createEvidence: (item: Omit<EvidenceItem, "id" | "userId" | "createdAt" | "updatedAt">) =>
    request<{ ok: boolean; evidence: EvidenceItem }>("/api/evidence", {
      method: "POST",
      body: JSON.stringify(item),
    }),
  updateEvidence: (id: string, item: Partial<EvidenceItem>) =>
    request<{ ok: boolean; evidence: EvidenceItem }>(`/api/evidence/${id}`, {
      method: "PUT",
      body: JSON.stringify(item),
    }),
  deleteEvidence: (id: string) =>
    request<{ ok: boolean; id: string }>(`/api/evidence/${id}`, { method: "DELETE" }),
  extractEvidenceDoc: (payload: { filename: string; contentBase64: string }) =>
    request<{
      ok: boolean;
      extracted: { text: string; title: string; category: EvidenceItem["category"]; skills: string[]; metrics: string[] };
    }>("/api/evidence/extract", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  recommendEvidence: (jdText: string) =>
    request<{ ok: boolean; recommendations: RecommendedEvidence[] }>("/api/evidence/recommend", {
      method: "POST",
      body: JSON.stringify({ jdText }),
    }),

  researchCompany: (companyName: string, roleTitle?: string, companyUrl?: string) =>
    request<{ ok: boolean; research: CompanyResearch }>("/api/research/company", {
      method: "POST",
      body: JSON.stringify({ companyName, roleTitle, companyUrl }),
    }),
  getAtsComparison: (scoreReport?: any, roleTitle?: string) =>
    request<{ ok: boolean; comparison: AtsComparisonData }>("/api/research/ats-comparison", {
      method: "POST",
      body: JSON.stringify({ scoreReport, roleTitle }),
    }),

  compileEditedTex: (runId: string, texSource: string) =>
    request<CompileResult>(`/api/analysis/${runId}/compile`, {
      method: "POST",
      body: JSON.stringify({ texSource }),
    }),
  exportDocx: (runId: string, texSource: string) =>
    request<DocxExportResult>(`/api/analysis/${runId}/export-docx`, {
      method: "POST",
      body: JSON.stringify({ texSource }),
    }),
};

/** Normalize GET /api/analysis/:id record into the AnalysisResponse shape used by the UI. */
export function normalizeAnalysisRecord(id: string, record: Partial<AnalysisResponse>): AnalysisResponse {
  return {
    ok: true,
    runId: record.runId || id,
    persistence: record.persistence,
    report: record.report as AnalysisResponse["report"],
    before: record.before,
    ats: record.ats,
    edits: record.edits,
    compile: record.compile,
    artifacts: record.artifacts || {},
    aiReview: record.aiReview ?? null,
    scoreDelta: record.scoreDelta,
    jobDescription: record.jobDescription,
  };
}
