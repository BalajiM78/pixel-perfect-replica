import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type AnalysisPayload, type AnalysisResponse, type ResumeItem, type ExtractedJob } from "@/lib/api";
import { isApiConfigured } from "@/lib/config";
import { PageHeader, ConnectionNotice, LoadingBlock, ErrorState, EmptyState } from "@/components/page-states";
import { FileDrop } from "@/components/file-drop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link2, Loader2, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/workspace")({
  component: Workspace,
});

type ResumeChoice = { kind: "stored"; resume: ResumeItem } | { kind: "upload" } | null;

function Workspace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const resumesQuery = useQuery({
    queryKey: ["resumes"],
    enabled: isApiConfigured,
    queryFn: async () => (await api.listResumes()).resumes,
  });

  const [choice, setChoice] = useState<ResumeChoice>(null);
  const [upload, setUpload] = useState<Awaited<ReturnType<typeof import("@/lib/files").pickDocument>> | null>(null);
  const [jdText, setJdText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [tailor, setTailor] = useState(true);
  const [compile, setCompile] = useState(true);
  const [aiReview, setAiReview] = useState(true);
  const [topN, setTopN] = useState("3");
  const [running, setRunning] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");

  const run = async () => {
    if (!jdText.trim()) {
      toast.error("Add a job description first.");
      return;
    }
    if (choice?.kind === "upload" && !upload) {
      toast.error("Upload a resume file first.");
      return;
    }
    setRunning(true);
    setProgressLabel(choice?.kind === "upload" ? "Uploading resume…" : "Running the ATS engine…");
    try {
      let resumeId: string | undefined;
      if (choice?.kind === "upload" && upload) {
        const res = await api.uploadResume({
          filename: upload.filename,
          contentBase64: upload.contentBase64,
          title: upload.filename.replace(/\.[^.]+$/, ""),
          isMaster: false,
        });
        resumeId = res.resume.id;
      }

      setProgressLabel("Scoring resume against the job description… this can take up to a minute.");
      const payload: AnalysisPayload = {
        jdText: jdText.trim(),
        resumeId: choice?.kind === "stored" ? choice.resume.id : resumeId,
        tailor,
        compile,
        aiReview,
        topN: Number(topN) || undefined,
      };
      const result: AnalysisResponse = await api.runAnalysis(payload);
      queryClient.setQueryData(["analysis", result.runId], result);
      queryClient.invalidateQueries({ queryKey: ["history"] });
      toast.success("Analysis complete.");
      await navigate({ to: "/results/$runId", params: { runId: result.runId } });
    } catch (err: any) {
      toast.error(err?.message || "The analysis failed. Check the job text and try again.");
    } finally {
      setRunning(false);
      setProgressLabel("");
    }
  };

  const extractFromUrl = async () => {
    if (!jobUrl.trim()) return;
    setExtracting(true);
    try {
      const { job }: { job: ExtractedJob } = await api.extractJob(jobUrl.trim());
      setJdText(job.extractedText);
      if (job.title || job.company) {
        toast.success(`Extracted${job.title ? ` “${job.title}”` : ""}${job.company ? ` at ${job.company}` : ""}. Review the text below.`);
      } else {
        toast.success("Job description extracted. Review the text below.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not extract from that URL. Paste the text instead.");
    } finally {
      setExtracting(false);
    }
  };

  const resumes = resumesQuery.data || [];
  const canRun = Boolean(jdText.trim()) && (choice?.kind === "stored" || Boolean(upload)) && !running;

  return (
    <div>
      <PageHeader
        title="Workspace"
        description="One workflow: pick the resume, bring the job description, run the deterministic engine."
      />
      <ConnectionNotice />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Step 1 — resume */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="score-text flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                1
              </span>
              Resume
            </CardTitle>
            <CardDescription>Use a stored resume or upload a new one (.pdf, .docx, .tex, .txt).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resumesQuery.isPending && isApiConfigured ? (
              <LoadingBlock label="Loading your resumes" />
            ) : resumesQuery.isError ? (
              <ErrorState message={resumesQuery.error.message} retry={() => resumesQuery.refetch()} />
            ) : resumes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stored resumes yet — upload below.</p>
            ) : (
              <RadioGroup
                value={choice?.kind === "stored" ? choice.resume.id : choice?.kind === "upload" ? "__upload" : ""}
                onValueChange={(id) => setChoice(id === "__upload" ? { kind: "upload" } : { kind: "stored", resume: resumes.find((r) => r.id === id)! })}
                className="space-y-2"
              >
                {resumes.map((r) => (
                  <Label
                    key={r.id}
                    htmlFor={`resume-${r.id}`}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      choice?.kind === "stored" && choice.resume.id === r.id ? "border-primary bg-accent" : "hover:bg-muted/50"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <RadioGroupItem id={`resume-${r.id}`} value={r.id} className="sr-only" />
                      <span className="truncate font-medium">{r.title || r.original_filename}</span>
                      {r.is_master ? (
                        <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                          Master
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {r.source_format.toUpperCase()} · {formatBytes(0) === "0.0 B" ? "" : ""} {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                    </span>
                  </Label>
                ))}
                <Label
                  htmlFor="resume-upload-choice"
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm",
                    choice?.kind === "upload" ? "border-primary bg-accent" : "hover:bg-muted/50"
                  )}
                >
                  <RadioGroupItem id="resume-upload-choice" value="__upload" className="sr-only" />
                  Upload a new file
                </Label>
              </RadioGroup>
            )}

            {(choice?.kind === "upload" || resumes.length === 0) && (
              <FileDrop
                accept=".pdf,.docx,.tex,.txt"
                extensions={[".pdf", ".docx", ".tex", ".txt"]}
                label="Drop your resume here"
                hint="PDF, DOCX, TEX or TXT · max 10 MB"
                value={upload}
                onChange={(f) => {
                  setUpload(f);
                  if (resumes.length === 0 && f) setChoice({ kind: "upload" });
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Step 2 — job description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="score-text flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                2
              </span>
              Job description
            </CardTitle>
            <CardDescription>Paste the posting, or extract it from a URL and review the text.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  aria-label="Job posting URL"
                  placeholder="https://careers.example.com/role"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  className="pl-9"
                  type="url"
                />
              </div>
              <Button type="button" variant="outline" onClick={extractFromUrl} disabled={extracting || !jobUrl.trim()}>
                {extracting ? <Loader2 className="size-4 animate-spin" /> : "Extract"}
              </Button>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="jd-text">Job description text</Label>
                <span className="score-text text-xs text-muted-foreground">{jdText.length.toLocaleString()} chars</span>
              </div>
              <Textarea
                id="jd-text"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={10}
                placeholder="Paste the full job description here…"
                className="resize-y"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 3 — options + run */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="score-text flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              3
            </span>
            Run the analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Tailor resume</p>
                <p className="text-xs text-muted-foreground">Generate a revised LaTeX version</p>
              </div>
              <Switch checked={tailor} onCheckedChange={setTailor} aria-label="Tailor resume" />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Compile PDF</p>
                <p className="text-xs text-muted-foreground">Build the PDF in the same run</p>
              </div>
              <Switch checked={compile} onCheckedChange={setCompile} aria-label="Compile PDF" />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">AI advisory</p>
                <p className="text-xs text-muted-foreground">Qualitative suggestions, separate from the score</p>
              </div>
              <Switch checked={aiReview} onCheckedChange={setAiReview} aria-label="AI advisory review" />
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="w-40 space-y-1.5">
              <Label htmlFor="topn">Projects considered</Label>
              <Select value={topN} onValueChange={setTopN}>
                <SelectTrigger id="topn">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "5"].map((n) => (
                    <SelectItem key={n} value={n}>
                      Top {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              {choice?.kind === "upload" && upload ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUpload(null);
                    setChoice(null);
                  }}
                >
                  <Trash2 className="size-4" /> Clear upload
                </Button>
              ) : null}
              <Button size="lg" onClick={run} disabled={!canRun}>
                {running ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Analyzing…
                  </>
                ) : (
                  <>
                    <Play className="size-4" /> Run analysis
                  </>
                )}
              </Button>
            </div>
          </div>

          {running ? (
            <div className="space-y-2" aria-live="polite">
              <Progress value={undefined} />
              <p className="text-xs text-muted-foreground">{progressLabel}</p>
              <Alert>
                <AlertDescription className="text-xs">
                  Tailoring with LaTeX compilation is the slow path and can take several minutes. Keep this tab open.
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          {!canRun && !running ? (
            <EmptyState
              title="Ready when you are"
              description="Choose a resume and add a job description to enable the run."
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
