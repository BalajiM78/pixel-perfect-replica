import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ResumeItem } from "@/lib/api";
import { isApiConfigured } from "@/lib/config";
import { PageHeader, ConnectionNotice, LoadingBlock, ErrorState, EmptyState } from "@/components/page-states";
import { FileDrop } from "@/components/file-drop";
import type { PickedFile } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Download, FolderOpen, Star, Trash2, UploadCloud, Loader2 } from "lucide-react";
import { formatDateOnly } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/resumes")({
  component: ResumesPage,
});

function ResumesPage() {
  const queryClient = useQueryClient();
  const [upload, setUpload] = useState<PickedFile | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [asMaster, setAsMaster] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResumeItem | null>(null);

  const query = useQuery({
    queryKey: ["resumes"],
    enabled: isApiConfigured,
    retry: false,
    queryFn: async () => (await api.listResumes()).resumes || [],
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["resumes"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!upload) throw new Error("No file selected.");
      return api.uploadResume({
        filename: upload.filename,
        contentBase64: upload.contentBase64,
        title: uploadTitle.trim() || upload.filename.replace(/\.[^.]+$/, ""),
        isMaster: asMaster,
      });
    },
    onSuccess: (res) => {
      invalidate();
      setUpload(null);
      setUploadTitle("");
      setAsMaster(false);
      const check = res.atsCheck;
      toast.success(
        `Uploaded “${res.resume.original_filename}”.` +
          (check?.issues?.length ? ` ${check.issues.length} formatting issue(s) flagged.` : " No formatting issues flagged.")
      );
    },
    onError: (err: any) => toast.error(err?.message || "Upload failed."),
  });

  const masterMutation = useMutation({
    mutationFn: (id: string) => api.setMasterResume(id),
    onSuccess: () => {
      invalidate();
      toast.success("Master resume updated.");
    },
    onError: (err: any) => toast.error(err?.message || "Could not set master resume."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteResume(id),
    onSuccess: () => {
      invalidate();
      toast.success("Resume deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err?.message || "Delete failed."),
  });

  const download = async (r: ResumeItem) => {
    try {
      const res = await api.getResumeDownload(r.id);
      const a = document.createElement("a");
      a.href = res.downloadUrl;
      a.download = res.filename || r.original_filename;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      toast.error(err?.message || "Download failed.");
    }
  };

  const resumes = query.data || [];

  return (
    <div>
      <PageHeader title="Resume library" description="Stored resumes. The master resume is the default for analyses." />
      <ConnectionNotice />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {query.isPending && isApiConfigured ? (
            <LoadingBlock />
          ) : query.isError ? (
            <ErrorState message={query.error.message} retry={() => query.refetch()} />
          ) : resumes.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title="No resumes stored yet"
              description="Upload a .pdf, .docx, .tex, or .txt resume. It runs through the backend's ATS formatting check on arrival."
            />
          ) : (
            resumes.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{r.title || r.original_filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.original_filename} · {r.source_format.toUpperCase()} · uploaded {formatDateOnly(r.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.is_master ? (
                      <Badge className="bg-primary text-primary-foreground">Master</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={masterMutation.isPending}
                        onClick={() => masterMutation.mutate(r.id)}
                      >
                        <Star className="size-4" /> Set master
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" aria-label={`Download ${r.original_filename}`} onClick={() => download(r)}>
                      <Download className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${r.original_filename}`}
                      disabled={r.is_system}
                      onClick={() => setDeleteTarget(r)}
                    >
                      <Trash2 className={`size-4 ${r.is_system ? "opacity-40" : "text-destructive"}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-4 py-5">
            <div className="flex items-center gap-2">
              <UploadCloud className="size-5 text-primary" aria-hidden />
              <h2 className="text-sm font-semibold text-foreground">Upload a resume</h2>
            </div>
            <FileDrop
              accept=".pdf,.docx,.tex,.txt"
              extensions={[".pdf", ".docx", ".tex", ".txt"]}
              label="Drop your resume here"
              hint="PDF, DOCX, TEX or TXT · max 10 MB"
              value={upload}
              onChange={setUpload}
              disabled={uploadMutation.isPending}
            />
            <div className="space-y-1.5">
              <Label htmlFor="resume-title">Display title</Label>
              <Input
                id="resume-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder={upload ? upload.filename.replace(/\.[^.]+$/, "") : "e.g. Backend engineer master"}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={asMaster}
                onChange={(e) => setAsMaster(e.target.checked)}
                className="size-4 accent-[var(--color-primary)]"
              />
              Set as master resume
            </label>
            <Button
              className="w-full"
              disabled={!upload || uploadMutation.isPending}
              onClick={() => uploadMutation.mutate()}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Uploading…
                </>
              ) : (
                "Upload resume"
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Files are sent to your backend as Base64 JSON (existing contract) and stored privately in your account.
            </p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes “{deleteTarget?.title || deleteTarget?.original_filename}” and its stored copy. Existing
              analyses keep their own artifacts.
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
