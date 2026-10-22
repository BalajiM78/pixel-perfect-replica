import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type EvidenceItem, type RecommendedEvidence } from "@/lib/api";
import { isApiConfigured } from "@/lib/config";
import { PageHeader, ConnectionNotice, LoadingBlock, ErrorState, EmptyState } from "@/components/page-states";
import { FileDrop } from "@/components/file-drop";
import type { PickedFile } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { FolderOpen, Loader2, Pencil, Plus, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { formatDateOnly } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/evidence")({
  component: EvidencePage,
});

const categories = ["project", "skill", "experience", "certification", "accomplishment"] as const;

interface EditorState {
  id?: string;
  title: string;
  category: EvidenceItem["category"];
  description: string;
  skills: string;
  metrics: string;
}

const emptyEditor: EditorState = { title: "", category: "project", description: "", skills: "", metrics: "" };

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function EvidencePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EvidenceItem | null>(null);
  const [extractFile, setExtractFile] = useState<PickedFile | null>(null);
  const [jdText, setJdText] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendedEvidence[] | null>(null);
  const [recommending, setRecommending] = useState(false);

  const query = useQuery({
    queryKey: ["evidence"],
    enabled: isApiConfigured,
    retry: false,
    queryFn: async () => (await api.listEvidence()).items || [],
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["evidence"] });

  const saveMutation = useMutation({
    mutationFn: async (state: EditorState) => {
      const payload = {
        title: state.title.trim(),
        category: state.category,
        description: state.description.trim(),
        skills: splitList(state.skills),
        metrics: splitList(state.metrics),
      };
      if (!payload.title) throw new Error("A title is required.");
      if (state.id) return api.updateEvidence(state.id, payload);
      return api.createEvidence(payload);
    },
    onSuccess: () => {
      invalidate();
      setEditor(null);
      toast.success("Evidence saved exactly as reviewed.");
    },
    onError: (err: any) => toast.error(err?.message || "Save failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEvidence(id),
    onSuccess: () => {
      invalidate();
      toast.success("Evidence deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Delete failed."),
  });

  const extractMutation = useMutation({
    mutationFn: async () => {
      if (!extractFile) throw new Error("Choose a document first.");
      return api.extractEvidenceDoc({ filename: extractFile.filename, contentBase64: extractFile.contentBase64 });
    },
    onSuccess: (res) => {
      const ex = res.extracted;
      setEditor({
        title: ex.title || "",
        category: ex.category || "project",
        description: ex.text.slice(0, 4000),
        skills: ex.skills.join(", "),
        metrics: ex.metrics.join(", "),
      });
      setExtractFile(null);
      toast.success("Extraction complete — review everything below before saving.");
    },
    onError: (err: any) => toast.error(err?.message || "Extraction failed."),
  });

  const recommend = async () => {
    if (!jdText.trim()) {
      toast.error("Paste a job description first.");
      return;
    }
    setRecommending(true);
    try {
      const res = await api.recommendEvidence(jdText.trim());
      setRecommendations(res.recommendations || []);
      if ((res.recommendations || []).length === 0) {
        toast.info("The engine found no relevant evidence for this description.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Recommendation failed.");
    } finally {
      setRecommending(false);
    }
  };

  const items = query.data || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const matchesCategory = categoryFilter === "all" || i.category === categoryFilter;
      const matchesSearch =
        !q ||
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.skills.some((s) => s.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [items, search, categoryFilter]);

  const catTone: Record<string, string> = {
    project: "bg-primary/10 text-primary",
    skill: "bg-success/12 text-success-foreground dark:text-success",
    experience: "bg-chart-2/15 text-chart-2",
    certification: "bg-chart-5/15 text-chart-5",
    accomplishment: "bg-warning/15 text-warning-foreground dark:text-warning",
  };

  return (
    <div>
      <PageHeader
        title="Evidence library"
        description="Your projects, skills, metrics, and accomplishments — reviewed by you before anything is saved."
        actions={
          <Button onClick={() => setEditor(emptyEditor)}>
            <Plus className="size-4" /> Add evidence
          </Button>
        }
      />
      <ConnectionNotice />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {query.isPending && isApiConfigured ? (
            <LoadingBlock />
          ) : query.isError ? (
            <ErrorState message={query.error.message} retry={() => query.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title="No evidence saved yet"
              description="Add projects, skills, and accomplishments manually, or import a document and review the extraction."
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-48 flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    aria-label="Search evidence"
                    placeholder="Search titles, descriptions, skills…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-44" aria-label="Filter by category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nothing matches those filters.</p>
              ) : (
                filtered.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-medium text-foreground">{item.title}</h3>
                            <Badge variant="outline" className={catTone[item.category]}>
                              {item.category}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.skills.map((s) => (
                              <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                {s}
                              </span>
                            ))}
                            {item.metrics.map((m) => (
                              <span
                                key={m}
                                className="rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success-foreground dark:text-success"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Added {formatDateOnly(item.createdAt)}
                            {item.sourceFilename ? ` · from ${item.sourceFilename}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Edit ${item.title}`}
                            onClick={() =>
                              setEditor({
                                id: item.id,
                                title: item.title,
                                category: item.category,
                                description: item.description,
                                skills: item.skills.join(", "),
                                metrics: item.metrics.join(", "),
                              })
                            }
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" aria-label={`Delete ${item.title}`} onClick={() => setDeleteTarget(item)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Upload className="size-4 text-primary" /> Import from a document
              </CardTitle>
              <CardDescription>
                The backend extracts text, skills, and metrics. Nothing is saved until you review and confirm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <FileDrop
                accept=".txt,.md,.pdf,.docx,.tex"
                extensions={[".txt", ".md", ".pdf", ".docx", ".tex"]}
                label="Drop a document here"
                hint="TXT, MD, PDF, DOCX, TEX · max 10 MB"
                value={extractFile}
                onChange={setExtractFile}
                disabled={extractMutation.isPending}
              />
              <Button className="w-full" disabled={!extractFile || extractMutation.isPending} onClick={() => extractMutation.mutate()}>
                {extractMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Extracting…
                  </>
                ) : (
                  "Extract & review"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="size-4 text-primary" /> Match evidence to a job
              </CardTitle>
              <CardDescription>Paste a job description to see which of your evidence is most relevant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                aria-label="Job description for evidence matching"
                rows={5}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste job description…"
              />
              <Button className="w-full" disabled={recommending} onClick={recommend}>
                {recommending ? <Loader2 className="size-4 animate-spin" /> : "Find relevant evidence"}
              </Button>
              {recommendations ? (
                recommendations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No relevant evidence found for this description.</p>
                ) : (
                  <ul className="space-y-2">
                    {recommendations.map((r) => (
                      <li key={r.evidence.id} className="rounded-lg border p-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{r.evidence.title}</span>
                          <span className="score-text text-muted-foreground">{Math.round(r.relevanceScore * 100)}%</span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground">{r.rationale}</p>
                        {r.matchedSkills.length ? (
                          <p className="mt-1 text-muted-foreground">Matches: {r.matchedSkills.join(", ")}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create / edit / review dialog */}
      <Dialog open={editor !== null} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editor?.id ? "Edit evidence" : "Review & save evidence"}</DialogTitle>
            <DialogDescription>
              {editor?.id
                ? "Update this item. Changes save only when you confirm."
                : "Correct anything the extraction got wrong — evidence is stored exactly as reviewed."}
            </DialogDescription>
          </DialogHeader>
          {editor ? (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(editor);
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="ev-title">Title</Label>
                <Input
                  id="ev-title"
                  required
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-category">Category</Label>
                <Select value={editor.category} onValueChange={(v) => setEditor({ ...editor, category: v as EvidenceItem["category"] })}>
                  <SelectTrigger id="ev-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-description">Description</Label>
                <Textarea
                  id="ev-description"
                  rows={6}
                  value={editor.description}
                  onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-skills">Skills (comma separated)</Label>
                <Input
                  id="ev-skills"
                  value={editor.skills}
                  onChange={(e) => setEditor({ ...editor, skills: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-metrics">Metrics (comma separated)</Label>
                <Input
                  id="ev-metrics"
                  value={editor.metrics}
                  onChange={(e) => setEditor({ ...editor, metrics: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditor(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save evidence"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this evidence?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” will be permanently removed from your library.
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
