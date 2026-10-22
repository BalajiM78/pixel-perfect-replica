import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { api, downloadArtifact, type AnalysisResponse } from "@/lib/api";
import { ScoreGauge, DimensionBar, SkillStatusBadge } from "@/components/score";
import { ScoreBadge, ErrorState } from "@/components/page-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Info, Download, FileCode2, FileText, Wand2, History } from "lucide-react";
import { formatDate } from "@/lib/format";

const skillFilters = [
  { key: "matched", label: "Matched" },
  { key: "partial", label: "Partial" },
  { key: "missing", label: "Missing" },
  { key: "listed_only", label: "Listed only" },
] as const;

const severityTone: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/15 text-warning-foreground dark:text-warning",
  low: "bg-muted text-muted-foreground",
};

function ArtifactButtons({ result }: { result: AnalysisResponse }) {
  const entries = Object.entries(result.artifacts || {});
  if (entries.length === 0) return null;
  const names: Record<string, string> = {
    pdf: "PDF",
    report: "Report (.md)",
    tex: "LaTeX (.tex)",
    json: "JSON",
    log: "Compile log",
  };
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([type, path]) => (
        <Button
          key={type}
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await downloadArtifact(path, `${result.runId}_${type}`);
            } catch (err: any) {
              alert(err?.message || "Download failed.");
            }
          }}
        >
          <Download className="size-4" /> {names[type] || type}
        </Button>
      ))}
    </div>
  );
}

export function ResultsView({ result }: { result: AnalysisResponse }) {
  const report = result.report;
  const [skillFilter, setSkillFilter] = useState<(typeof skillFilters)[number]["key"]>("matched");

  const skillCounts = useMemo(() => {
    const counts: Record<string, number> = { matched: 0, partial: 0, missing: 0, listed_only: 0, unsupported: 0 };
    for (const s of report.skills || []) counts[s.status] = (counts[s.status] || 0) + 1;
    return counts;
  }, [report]);

  const filteredSkills = (report.skills || []).filter((s) => s.status === skillFilter);
  const hasCompileIssue = result.compile && !result.compile.success;

  return (
    <div className="space-y-5">
      {/* Header card */}
      <Card>
        <CardContent className="grid gap-6 py-6 lg:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            <ScoreGauge score={report.overall_estimated_match} label="Overall match" sublabel={report.confidence ? `confidence: ${report.confidence}` : undefined} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {report.job.title} · {report.job.company}
              </h2>
              {result.persistence && !result.persistence.persisted ? (
                <Badge variant="outline" className="bg-warning/15 text-warning-foreground dark:text-warning">
                  Not saved to your account
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Run {result.runId} · {formatDate(report.generated_at)} · engine {report.engine_version}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                Raw unweighted score: <span className="score-text font-medium text-foreground">{Math.round(report.raw_unweighted_score)}%</span>
              </span>
              {typeof result.scoreDelta === "number" && result.scoreDelta !== 0 ? (
                <span className="text-muted-foreground">
                  Tailoring delta: <span className="score-text font-medium text-success-foreground dark:text-success">+{result.scoreDelta.toFixed(1)} pts</span>
                </span>
              ) : null}
              <span className="text-muted-foreground">
                Gates applied: <span className="font-medium text-foreground">{report.gates_applied.length}</span>
              </span>
            </div>

            {report.gates_applied.length > 0 ? (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <p className="font-medium text-destructive">Hard gates failed — these override the numeric score</p>
                <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                  {report.gates_applied.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm text-success-foreground dark:text-success">All eligibility gates passed.</p>
            )}

            <Separator className="my-4" />
            <div className="flex flex-wrap gap-2">
              {result.artifacts?.tex ? (
                <Button size="sm" asChild>
                  <Link to="/editor/$runId" params={{ runId: result.runId }}>
                    <Wand2 className="size-4" /> Open in editor
                  </Link>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" asChild>
                <Link to="/history">
                  <History className="size-4" /> History
                </Link>
              </Button>
              <ArtifactButtons result={result} />
            </div>
          </div>
        </CardContent>
      </Card>

      {hasCompileIssue ? (
        <Card className="border-destructive/40">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-foreground">PDF compilation failed for this run</p>
              <p className="text-muted-foreground">
                The score is unaffected. You can retry compilation from the editor; the LaTeX source is preserved.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="dimensions">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="skills">Skills ({report.skills.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="actions">Next actions</TabsTrigger>
          {result.aiReview ? <TabsTrigger value="ai">AI advisory</TabsTrigger> : null}
          {result.edits?.length ? <TabsTrigger value="edits">Edits applied</TabsTrigger> : null}
          <TabsTrigger value="job">Job & resume</TabsTrigger>
        </TabsList>

        <TabsContent value="dimensions" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nine ATS dimensions</CardTitle>
              <CardDescription>Weighted contributions from the deterministic engine. Deterministic, reproducible inputs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(report.categories || []).map((c) => (
                <DimensionBar key={c.key} label={c.label} score={c.score} weight={c.weight} contribution={c.contribution} rationale={c.rationale} />
              ))}
              {report.confidence_notes?.length ? (
                <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Confidence notes</p>
                  <ul className="mt-1 list-inside list-disc">
                    {report.confidence_notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">{report.disclaimer}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">Skill-by-skill breakdown</CardTitle>
                <CardDescription>Each skill shows where it was found in your resume.</CardDescription>
              </div>
              <Tabs value={skillFilter} onValueChange={(v) => setSkillFilter(v as any)}>
                <TabsList>
                  {skillFilters.map((f) => (
                    <TabsTrigger key={f.key} value={f.key} className="px-2.5 text-xs">
                      {f.label} ({skillCounts[f.key] || 0})
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {filteredSkills.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No skills in this category.</p>
              ) : (
                <ul className="divide-y">
                  {filteredSkills.map((s) => (
                    <li key={s.canonical + s.skill} className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{s.skill}</span>
                        <SkillStatusBadge status={s.status} />
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">{s.importance}</span>
                        <span className="score-text ml-auto text-xs text-muted-foreground">credit {s.credit.toFixed(2)}</span>
                      </div>
                      {s.evidence.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">Found on: {s.evidence.join(" · ")}</p>
                      ) : s.note ? (
                        <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
                      ) : null}
                      {s.jd_context ? <p className="mt-0.5 text-xs italic text-muted-foreground">JD context: “{s.jd_context}”</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project selection</CardTitle>
              <CardDescription>Projects the engine picked for the tailored resume and why.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {(report.projects || []).map((p) => (
                <div key={p.key} className={`rounded-lg border p-3 ${p.selected ? "border-primary/50 bg-accent/50" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{p.display_name || p.key}</p>
                    {p.selected ? <Badge className="bg-primary text-primary-foreground">Selected</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.one_liner}</p>
                  <p className="score-text mt-2 text-xs text-muted-foreground">Relevance {Math.round(p.relevance * 100)}%</p>
                  {p.tech_overlap.length ? (
                    <p className="mt-1 text-xs text-muted-foreground">Overlap: {p.tech_overlap.join(", ")}</p>
                  ) : null}
                  {p.reasons.length ? (
                    <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                      {p.reasons.slice(0, 3).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prioritized next actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(report.actions || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No further actions suggested.</p>
              ) : (
                (report.actions || []).map((a, i) => (
                  <div key={i} className="flex gap-3 rounded-lg border p-3">
                    <span className="score-text flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {a.priority}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.detail}</p>
                      <div className="mt-1 flex gap-2 text-[11px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5">{a.category}</span>
                        <span>Impact: {a.impact}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {(report.ats_issues || []).length > 0 ? (
                <>
                  <Separator />
                  <p className="text-sm font-medium text-foreground">Formatting checks</p>
                  {(report.ats_issues || []).map((iss, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{iss.message}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${severityTone[iss.severity] || severityTone.low}`}>
                        {iss.label}
                      </span>
                    </div>
                  ))}
                </>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {result.aiReview ? (
          <TabsContent value="ai" className="mt-4 space-y-4">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-primary" /> AI advisory
                </CardTitle>
                <CardDescription>
                  {result.aiReview.provider} · {result.aiReview.model} · qualitative suggestions only — they never change
                  the deterministic score unless you re-run the analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p className="leading-relaxed text-foreground">{result.aiReview.executiveSummary}</p>
                {result.aiReview.keywordOptimization?.length ? (
                  <div>
                    <p className="font-medium text-foreground">Keyword optimization</p>
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      {result.aiReview.keywordOptimization.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {result.aiReview.bulletPointEnhancements?.length ? (
                  <div>
                    <p className="font-medium text-foreground">Bullet suggestions</p>
                    <div className="mt-2 space-y-2">
                      {result.aiReview.bulletPointEnhancements.map((b, i) => (
                        <div key={i} className="rounded-lg border p-3 text-xs">
                          <p className="text-muted-foreground line-through">{b.before}</p>
                          <p className="mt-1 font-medium text-foreground">{b.suggestion}</p>
                          <p className="mt-1 text-muted-foreground">{b.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {result.aiReview.tailoringAdvice?.length ? (
                  <div>
                    <p className="font-medium text-foreground">Tailoring advice</p>
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      {result.aiReview.tailoringAdvice.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">{result.aiReview.disclaimer}</p>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {result.edits?.length ? (
          <TabsContent value="edits" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Edits applied by tailoring</CardTitle>
                <CardDescription>
                  Review each change in the editor — the original resume is preserved and you can revert by re-running
                  without tailoring.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {result.edits.map((e, i) => (
                    <li key={i} className="rounded-lg border p-3">
                      <p className="font-medium text-foreground">{e.summary}</p>
                      {e.details ? <p className="mt-0.5 text-xs text-muted-foreground">{e.details}</p> : null}
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{e.kind}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        <TabsContent value="job" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parsed job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Required skills</p>
                <p className="mt-1">{report.job.required_skills.join(", ") || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preferred skills</p>
                <p className="mt-1">{report.job.preferred_skills.join(", ") || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Responsibilities</p>
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  {report.job.responsibilities.slice(0, 8).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
              {report.job.warnings.length ? (
                <p className="text-xs text-warning-foreground dark:text-warning">
                  Parse warnings: {report.job.warnings.join(" · ")}
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parsed resume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-muted/60 p-2">
                  <span className="text-muted-foreground">Sections</span>
                  <p className="font-medium">{report.resume.sections.length}</p>
                </div>
                <div className="rounded bg-muted/60 p-2">
                  <span className="text-muted-foreground">Bullets</span>
                  <p className="score-text font-medium">{report.resume.bullets}</p>
                </div>
                <div className="rounded bg-muted/60 p-2">
                  <span className="text-muted-foreground">Skills</span>
                  <p className="score-text font-medium">{report.resume.all_skills.length}</p>
                </div>
                <div className="rounded bg-muted/60 p-2">
                  <span className="text-muted-foreground">Projects</span>
                  <p className="score-text font-medium">{report.resume.projects.length}</p>
                </div>
              </div>
              {result.jobDescription ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Job text used</p>
                  <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs text-muted-foreground">
                    {result.jobDescription.slice(0, 2000)}
                    {result.jobDescription.length > 2000 ? "…" : ""}
                  </p>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/workspace">
                    <FileCode2 className="size-4" /> Run another analysis
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/history">
                    <FileText className="size-4" /> All runs
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
