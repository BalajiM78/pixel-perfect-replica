import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, type HistoryRecord, type ResumeItem, type EvidenceItem, type ResumeProfile } from "@/lib/api";
import { isApiConfigured } from "@/lib/config";
import { PageHeader, ConnectionNotice, LoadingBlock, ErrorState, EmptyState } from "@/components/page-states";
import { ScoreBadge } from "@/components/page-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { ArrowRight, FileText, FolderOpen, History, Inbox, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

interface DashboardData {
  history: HistoryRecord[];
  resumes: ResumeItem[];
  evidence: EvidenceItem[];
  profile: ResumeProfile | null;
}

function Dashboard() {
  const enabled = isApiConfigured;
  const query = useQuery({
    queryKey: ["dashboard"],
    enabled,
    retry: false,
    queryFn: async (): Promise<DashboardData> => {
      const [history, resumes, evidence, profile] = await Promise.all([
        api.getHistory(),
        api.listResumes(),
        api.listEvidence().catch(() => ({ ok: true, items: [] })),
        api.getResumeProfile().catch(() => null),
      ]);
      return {
        history: history.history || [],
        resumes: resumes.resumes || [],
        evidence: evidence.items || [],
        profile,
      };
    },
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your analyses, resumes, and evidence at a glance."
        actions={
          <Button asChild>
            <Link to="/workspace">
              <Wand2 className="size-4" /> New analysis
            </Link>
          </Button>
        }
      />
      <ConnectionNotice />

      {query.isPending && enabled ? (
        <LoadingBlock />
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => query.refetch()} />
      ) : !enabled ? null : (
        <DashboardBody data={query.data!} />
      )}
    </div>
  );
}

function DashboardBody({ data }: { data: DashboardData }) {
  const { history, resumes, evidence, profile } = data;
  const master = resumes.find((r) => r.is_master);
  const latest = history[0];

  if (history.length === 0 && resumes.length === 0 && evidence.length === 0) {
    return (
      <EmptyState
        icon={<Inbox />}
        title="Welcome — let's run your first analysis"
        description="Upload a resume, add a job description, and the deterministic ATS engine will score the match with full transparency."
        action={
          <Button asChild>
            <Link to="/workspace">
              Start in the workspace <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        }
      />
    );
  }

  const stats = [
    { label: "Analyses run", value: String(history.length) },
    { label: "Latest score", value: latest ? `${Math.round(latest.overallScore)}%` : "—" },
    { label: "Resumes stored", value: String(resumes.length) },
    { label: "Evidence items", value: String(evidence.length) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="score-text mt-1 text-2xl font-semibold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent analyses</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/history">
                View all <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No analyses yet. Your first run will appear here.
              </p>
            ) : (
              <ul className="divide-y">
                {history.slice(0, 5).map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link
                        to="/results/$runId"
                        params={{ runId: h.id }}
                        className="block truncate text-sm font-medium text-foreground hover:underline"
                      >
                        {h.jobTitle} · {h.company}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatDate(h.timestamp)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!h.eligibilityPassed ? (
                        <span className="text-xs text-destructive">gate failed</span>
                      ) : null}
                      <ScoreBadge score={h.overallScore} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Master resume</CardTitle>
              <FolderOpen className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-sm">
              {master ? (
                <>
                  <p className="truncate font-medium text-foreground">{master.title || master.original_filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {resumes.length} stored · used when no resume is picked
                  </p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No master resume selected.</p>
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <Link to="/resumes">Choose one</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Resume health</CardTitle>
              <FileText className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-sm">
              {profile ? (
                <>
                  <p className="score-text text-2xl font-semibold text-foreground">{profile.resumeScore}%</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.sections.length} sections · {profile.skillsCount} skills detected
                  </p>
                  {profile.issues.length > 0 ? (
                    <p className="mt-2 text-xs text-warning-foreground dark:text-warning">
                      {profile.issues.length} formatting issue{profile.issues.length === 1 ? "" : "s"} flagged
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-success-foreground dark:text-success">No formatting issues flagged</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Upload a resume to see its ATS formatting check.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Evidence</CardTitle>
              <History className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-sm">
              <p className="text-muted-foreground">
                {evidence.length === 0
                  ? "Nothing saved yet — add projects and skills you can point to."
                  : `${evidence.length} saved item${evidence.length === 1 ? "" : "s"} ready to reuse.`}
              </p>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <Link to="/evidence">Open evidence library</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
