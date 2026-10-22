import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  fetchArtifactBlob,
  triggerDownload,
  normalizeAnalysisRecord,
  type AnalysisResponse,
  type CompileResult,
} from "@/lib/api";
import { isApiConfigured } from "@/lib/config";
import { PageHeader, LoadingBlock, ErrorState, ConnectionNotice } from "@/components/page-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileDown, FileCode2, Eye, RotateCcw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

const LatexEditor = lazy(() => import("@/components/latex-editor"));

export const Route = createFileRoute("/_app/editor/$runId")({
  component: EditorPage,
});

function EditorPage() {
  const { runId } = Route.useParams();
  const queryClient = useQueryClient();

  const recordQuery = useQuery({
    queryKey: ["analysis", runId],
    enabled: isApiConfigured,
    retry: false,
    queryFn: async (): Promise<AnalysisResponse> => {
      const cached = queryClient.getQueryData<AnalysisResponse>(["analysis", runId]);
      if (cached?.report) return cached;
      const { record } = await api.getAnalysisRecord(runId);
      if (!record?.report) throw new Error("This run could not be loaded.");
      return normalizeAnalysisRecord(runId, record);
    },
  });

  const [source, setSource] = useState<string | null>(null);
  const [savedSource, setSavedSource] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [texError, setTexError] = useState<string | null>(null);

  const result = recordQuery.data;

  // Load the .tex artifact once the record is available.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!result?.artifacts?.tex) return;
    let cancelled = false;
    setTexError(null);
    fetchArtifactBlob(result.artifacts.tex)
      .then(async ({ blob }) => {
        if (cancelled) return;
        const text = await blob.text();
        setSource(text);
        setSavedSource(text);
      })
      .catch((err) => {
        if (!cancelled) setTexError(err?.message || "Could not load the LaTeX source for this run.");
      });
    return () => {
      cancelled = true;
    };
  }, [result?.artifacts?.tex]);

  const dirty = source !== null && savedSource !== null && source !== savedSource;
  const stalePreview = dirty && pdfUrl !== null;

  const compile = async () => {
    if (!source || source.trim().length < 10) {
      toast.error("Write some LaTeX first (at least 10 characters).");
      return;
    }
    setCompiling(true);
    try {
      const res = await api.compileEditedTex(runId, source);
      setCompileResult(res);
      setSavedSource(source);
      if (res.success && res.pdfUrl) {
        const blob = await fetchArtifactBlob(res.pdfUrl);
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(blob.url);
        toast.success(`Compiled — ${res.pageCount} page${res.pageCount === 1 ? "" : "s"}.`);
        queryClient.invalidateQueries({ queryKey: ["history"] });
      } else {
        toast.error("Compilation failed. Check the errors below — your edits are preserved.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Compilation request failed.");
    } finally {
      setCompiling(false);
    }
  };

  const exportDocx = async () => {
    if (!source || source.trim().length < 10) {
      toast.error("Write some LaTeX first.");
      return;
    }
    setExporting(true);
    try {
      const res = await api.exportDocx(runId, source);
      if (res.success && res.docxUrl) {
        await triggerDownload((await fetchArtifactBlob(res.docxUrl)).blob, `${runId}_resume_revised.docx`);
        toast.success("Word export downloaded.");
      } else {
        toast.error("The Word export did not succeed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Word export failed.");
    } finally {
      setExporting(false);
    }
  };

  const downloadTex = () => {
    if (!source) return;
    triggerDownload(new Blob([source], { type: "text/plain;charset=utf-8" }), `${runId}_resume.tex`);
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col">
      <PageHeader
        title="Resume studio"
        description="Edit the tailored LaTeX source, compile to PDF, and export. Originals are preserved in history."
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/results/$runId" params={{ runId }}>
              Back to report
            </Link>
          </Button>
        }
      />
      <ConnectionNotice compact />

      {recordQuery.isPending && isApiConfigured ? (
        <LoadingBlock label="Loading run" />
      ) : recordQuery.isError ? (
        <ErrorState message={recordQuery.error.message} retry={() => recordQuery.refetch()} />
      ) : !result ? null : !result.artifacts?.tex ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            This run has no tailored LaTeX source to edit. Re-run the analysis with tailoring enabled to get one.
          </CardContent>
        </Card>
      ) : texError ? (
        <ErrorState message={texError} retry={() => recordQuery.refetch()} />
      ) : source === null ? (
        <LoadingBlock label="Loading LaTeX source" />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button onClick={compile} disabled={compiling}>
              {compiling ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              {compiling ? "Compiling…" : dirty ? "Compile & save" : "Recompile"}
            </Button>
            <Button variant="outline" onClick={downloadTex}>
              <FileDown className="size-4" /> .tex
            </Button>
            <Button variant="outline" onClick={exportDocx} disabled={exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileCode2 className="size-4" />} .docx
            </Button>
            {dirty ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSource(savedSource)}
                aria-label="Revert to last compiled version"
              >
                <RotateCcw className="size-4" /> Revert
              </Button>
            ) : null}
            <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              {dirty ? (
                <>
                  <Badge variant="outline" className="bg-warning/15 text-warning-foreground dark:text-warning">
                    Unsaved edits
                  </Badge>
                  {stalePreview ? "Preview is stale — recompile to update" : null}
                </>
              ) : pdfUrl ? (
                "Saved & preview current"
              ) : (
                "No preview yet"
              )}
            </span>
          </div>

          {compileResult && !compileResult.success ? (
            <Alert variant="destructive" className="mb-3" role="alert">
              <TriangleAlert className="size-4" />
              <AlertTitle>Compilation failed</AlertTitle>
              <AlertDescription>
                <ul className="list-inside list-disc">
                  {compileResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
                {compileResult.warnings.length ? (
                  <p className="mt-1 text-xs">Warnings: {compileResult.warnings.join(" · ")}</p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
          {compileResult?.success ? (
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" role="status">
              <span>
                Pages: <span className="score-text font-medium text-foreground">{compileResult.pageCount}</span>
              </span>
              <span>Fit level: {compileResult.fitLevel}</span>
              {compileResult.warnings.length ? <span>Warnings: {compileResult.warnings.join(" · ")}</span> : null}
              {compileResult.notes.length ? <span>Notes: {compileResult.notes.join(" · ")}</span> : null}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
            <Card className="flex min-h-[420px] flex-col overflow-hidden lg:max-h-[calc(100vh-16rem)]">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">LaTeX source</p>
                <p className="score-text text-xs text-muted-foreground">{source.length.toLocaleString()} chars</p>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {mounted ? (
                  <Suspense fallback={<LoadingBlock label="Loading editor" />}>
                    <LatexEditor value={source} onChange={setSource} />
                  </Suspense>
                ) : (
                  <LoadingBlock label="Loading editor" />
                )}
              </div>
            </Card>

            <Card className="flex min-h-[420px] flex-col overflow-hidden lg:max-h-[calc(100vh-16rem)]">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">PDF preview</p>
                {stalePreview ? <Badge variant="outline">Stale</Badge> : null}
              </div>
              <div className="min-h-0 flex-1 bg-muted/40">
                {pdfUrl ? (
                  <iframe src={pdfUrl} title="Compiled resume PDF preview" className="size-full rounded-b-xl" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                    <Eye className="size-6 text-muted-foreground" aria-hidden />
                    <p className="text-sm text-muted-foreground">
                      Compile the source to see the rendered PDF here.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <Tabs defaultValue="original" className="mt-4">
            <TabsList>
              <TabsTrigger value="original">Tailored vs original</TabsTrigger>
            </TabsList>
            <TabsContent value="original">
              <Card>
                <CardContent className="py-4 text-sm text-muted-foreground">
                  {result.edits?.length ? (
                    <ul className="list-inside list-disc">
                      {result.edits.map((e, i) => (
                        <li key={i}>
                          <span className="font-medium text-foreground">{e.summary}</span>
                          {e.details ? ` — ${e.details}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "This run has no recorded tailoring edits."
                  )}
                  <p className="mt-2 text-xs">
                    The original untailored resume is untouched in your resume library. Reverting here only affects the
                    compiled artifacts for this run.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
