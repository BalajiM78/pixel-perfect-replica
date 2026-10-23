import { cn } from "@/lib/utils";
import { scoreTone } from "@/lib/format";

/** Circular score gauge, pure SVG, with an accessible text alternative. */
export function ScoreGauge({
  score,
  size = 168,
  label,
  sublabel,
}: {
  score: number;
  size?: number | undefined;
  label?: string | undefined;
  sublabel?: string | undefined;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(clamped);
  const colorVar =
    tone === "success"
      ? "var(--color-success)"
      : tone === "warning"
        ? "var(--color-warning)"
        : tone === "destructive"
          ? "var(--color-destructive)"
          : "var(--color-primary)";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label || "Overall match"}: ${Math.round(clamped)} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorVar}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="score-text text-4xl font-semibold text-foreground">{Math.round(clamped)}</span>
        {label ? <span className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</span> : null}
        {sublabel ? <span className="text-[11px] text-muted-foreground">{sublabel}</span> : null}
      </div>
    </div>
  );
}

/** Horizontal weighted-dimension bar using real contribution data. */
export function DimensionBar({
  label,
  score,
  weight,
  contribution,
  rationale,
}: {
  label: string;
  score: number;
  weight: number;
  contribution: number;
  rationale?: string;
}) {
  const tone = scoreTone(score);
  const colorVar =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : tone === "destructive"
          ? "bg-destructive"
          : "bg-primary";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="score-text text-xs text-muted-foreground">
          {Math.round(score)}/100 · weight {Math.round(weight * 100)}% · +{contribution.toFixed(1)} pts
        </span>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(score)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={cn("h-full rounded-full transition-all", colorVar)} style={{ width: `${Math.max(2, Math.min(100, score))}%` }} />
      </div>
      {rationale ? <p className="mt-1 text-xs text-muted-foreground">{rationale}</p> : null}
    </div>
  );
}

const skillTones: Record<string, string> = {
  matched: "bg-success/12 text-success-foreground dark:text-success border-transparent",
  partial: "bg-warning/15 text-warning-foreground dark:text-warning border-transparent",
  missing: "bg-destructive/10 text-destructive border-transparent",
  listed_only: "bg-muted text-muted-foreground border-transparent",
  unsupported: "bg-muted text-muted-foreground border-transparent",
};

const skillLabels: Record<string, string> = {
  matched: "Matched",
  partial: "Partial",
  missing: "Missing",
  listed_only: "Listed only",
  unsupported: "Not assessed",
};

export function SkillStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        skillTones[status] || skillTones["unsupported"]
      )}
    >
      {skillLabels[status] || status}
    </span>
  );
}
