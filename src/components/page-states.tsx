import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlugZap, TriangleAlert } from "lucide-react";
import { isApiConfigured, isSupabaseConfigured } from "@/lib/config";
import { scoreTone } from "@/lib/format";
import { Link } from "@tanstack/react-router";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <Alert variant="destructive" role="alert">
      <TriangleAlert className="size-4" />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>{message}</span>
        {retry ? (
          <Button size="sm" variant="outline" onClick={retry}>
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-muted-foreground [&_svg]:size-8">{icon}</div> : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/**
 * Honest connection state shown when the frontend is not yet wired to the
 * backend / auth project. Never fakes data on top of this.
 */
export function ConnectionNotice({ compact = false }: { compact?: boolean }) {
  const missing: string[] = [];
  if (!isApiConfigured) missing.push("VITE_API_URL (your ATS backend URL)");
  if (!isSupabaseConfigured) missing.push("VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY");

  if (missing.length === 0) return null;

  return (
    <Alert className={compact ? "mb-4" : "mb-6"}>
      <PlugZap className="size-4" />
      <AlertTitle>Connect your ATS backend to enable this page</AlertTitle>
      <AlertDescription>
        <p>
          This app talks to your existing ATS Resume Agent service. Add the following in project settings
          (Settings → Environment variables), then reload:
        </p>
        <ul className="mt-2 list-inside list-disc font-mono text-xs">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs">
          Also add this app&apos;s preview and published URLs to the <code>FRONTEND_ORIGIN</code> list on the backend
          service so requests are allowed.
        </p>
        {!isSupabaseConfigured ? (
          <p className="mt-2 text-xs">
            Until the sign-in project is connected, protected pages stay locked.{" "}
            <Link to="/auth" className="underline">
              Auth page
            </Link>
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

const toneClasses: Record<string, string> = {
  success: "border-transparent bg-success/12 text-success-foreground dark:text-success",
  primary: "border-transparent bg-primary/10 text-primary dark:text-primary",
  warning: "border-transparent bg-warning/15 text-warning-foreground dark:text-warning",
  destructive: "border-transparent bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
};

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone = scoreTone(score);
  return (
    <Badge variant="outline" className={cn(toneClasses[tone], "score-text font-semibold", className)}>
      {Math.round(score)}%
    </Badge>
  );
}

export function StatusDot({ tone, label }: { tone: "success" | "warning" | "destructive" | "neutral"; label: string }) {
  const dot =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : tone === "destructive"
          ? "bg-destructive"
          : "bg-muted-foreground/50";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}
