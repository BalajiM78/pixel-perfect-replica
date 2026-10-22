import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, downloadArtifact, type HistoryRecord } from "@/lib/api";
import { isApiConfigured } from "@/lib/config";
import { PageHeader, ConnectionNotice, LoadingBlock, ErrorState, EmptyState, ScoreBadge } from "@/components/page-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Search, Trash2, Wand2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<HistoryRecord | null>(null);

  const query = useQuery({
    queryKey: ["history"],
    enabled: isApiConfigured,
    retry: false,
    queryFn: async () => (await api.getHistory()).history || [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteHistoryRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      toast.success("Analysis deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Delete failed."),
  });

  const filtered = useMemo(() => {
    const items = query.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (h) =>
        h.jobTitle.toLowerCase().includes(q) ||
        h.company.toLowerCase().includes(q) ||
        h.id.toLowerCase().includes(q)
    );
  }, [query.data, search]);

  return (
    <div>
      <PageHeader
        title="History"
        description="Every saved run with its real artifacts."
        actions={
          <Button asChild variant="outline">
            <Link to="/workspace">
              <Wand2 className="size-4" /> New analysis
            </Link>
          </Button>
        }
      />
      <ConnectionNotice compact />

      {query.isPending && isApiConfigured ? (
        <LoadingBlock />
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => query.refetch()} />
      ) : (query.data || []).length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No saved analyses yet"
          description="Run your first analysis in the workspace — it will be saved here with downloadable artifacts."
          action={
            <Button asChild>
              <Link to="/workspace">Open workspace</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="relative mb-3 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              aria-label="Search history"
              placeholder="Search role, company, or run ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role & company</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="hidden md:table-cell">Skills</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <Link
                          to="/results/$runId"
                          params={{ runId: h.id }}
                          className="font-medium text-foreground hover:underline"
                        >
                          {h.jobTitle} · {h.company}
                        </Link>
                        <p className="score-text text-xs text-muted-foreground">
                          {h.id.slice(0, 12)}…{h.hasAiReview ? " · AI advisory" : ""}
                          {!h.eligibilityPassed ? " · gate failed" : ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={h.overallScore} />
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {h.matchedSkillsCount} matched / {h.missingSkillsCount} missing
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {formatDate(h.timestamp)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {h.artifacts?.pdf ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Download PDF"
                              onClick={async () => {
                                try {
                                  await downloadArtifact(h.artifacts.pdf, `${h.id}.pdf`);
                                } catch (err: any) {
                                  toast.error(err?.message || "Download failed.");
                                }
                              }}
                            >
                              <Download className="size-4" />
                            </Button>
                          ) : null}
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Delete analysis for ${h.jobTitle}`}
                            onClick={() => setDeleteTarget(h)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No runs match that search.</p>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this analysis?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the run and its stored artifacts for “{deleteTarget?.jobTitle}”. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
