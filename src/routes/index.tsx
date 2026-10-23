import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge, DimensionBar, SkillStatusBadge } from "@/components/score";
import { BrandMark } from "@/components/app-shell";
import { ArrowRight, FileText, FileDown, FolderOpen, ScanSearch, ShieldCheck, Wand2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  {
    icon: ScanSearch,
    title: "Deterministic ATS analysis",
    body: "A weighted, rule-based engine scores your resume against the job description — matched skills, hard gates, and nine scoring dimensions you can actually inspect.",
  },
  {
    icon: Wand2,
    title: "Professional resume studio",
    body: "Edit LaTeX with syntax highlighting, compile to PDF in one click, and export .tex, .pdf, and .docx. Nothing changes until you approve it.",
  },
  {
    icon: FolderOpen,
    title: "Career evidence library",
    body: "Keep your projects, skills, metrics, and accomplishments in one place. Import from documents, review the extraction, and reuse the best evidence per application.",
  },
  {
    icon: FileDown,
    title: "Real artifacts, every run",
    body: "Every analysis produces a score report, tailored LaTeX, compiled PDF, and Word export — stored against your account, downloadable any time.",
  },
];

const steps = [
  { n: "01", title: "Bring the job", body: "Paste a job description or extract one from a posting URL, then review the extracted text." },
  { n: "02", title: "Choose your resume", body: "Pick a stored resume or upload a new .pdf, .docx, .tex, or .txt file." },
  { n: "03", title: "Run and refine", body: "Get the deterministic score, act on the prioritized recommendations, edit and re-score." },
];

function ProductPreview() {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sample report layout</p>
          <h3 className="mt-1 truncate text-lg font-semibold text-foreground">Senior Backend Engineer</h3>
          <p className="text-sm text-muted-foreground">Northwind Robotics</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-medium text-success-foreground dark:text-success">
              18 matched skills
            </span>
            <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
              4 missing skills
            </span>
          </div>
        </div>
        <ScoreGauge score={72} label="Overall match" size={132} />
      </div>
      <div className="mt-5 grid gap-4 border-t pt-4 sm:grid-cols-2">
        <DimensionBar label="Required skills" score={78} weight={0.35} contribution={27.3} />
        <DimensionBar label="Project relevance" score={64} weight={0.2} contribution={12.8} />
        <DimensionBar label="Experience depth" score={55} weight={0.15} contribution={8.3} />
        <DimensionBar label="Keyword coverage" score={70} weight={0.1} contribution={7} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
        <SkillStatusBadge status="matched" /> <SkillStatusBadge status="partial" />{" "}
        <SkillStatusBadge status="missing" /> <SkillStatusBadge status="listed_only" />
        <span className="ml-auto text-xs text-muted-foreground">Deterministic score · not an AI estimate</span>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 lg:px-6">
          <BrandMark />
          <nav className="flex items-center gap-2" aria-label="Account">
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-14 lg:px-6 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <Badge variant="outline" className="mb-4 bg-accent text-accent-foreground">
                <ShieldCheck className="mr-1 size-3.5" aria-hidden /> Rule-based scoring · no black box
              </Badge>
              <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight lg:text-5xl">
                Tailor your resume to the job,
                <span className="text-primary"> with the receipts</span>
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
                ATS Resume Studio runs your resume through a deterministic, weighted ATS engine, shows exactly
                which skills matched and which gates failed, and gives you a professional LaTeX studio to fix it —
                without ever faking the score.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link to="/auth">
                    Start analyzing <ArrowRight className="ml-1 size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Create a free account
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Scores are engine estimates, not guarantees — every number is traceable to a rule.
              </p>
            </div>
            <ProductPreview />
          </div>
        </section>

        {/* Features */}
        <section className="border-y bg-card/50">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:grid-cols-2 lg:px-6">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-foreground">{f.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-6xl px-4 py-14 lg:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">How a run works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-xl border bg-card p-5">
                <span className="score-text text-sm font-semibold text-primary">{s.n}</span>
                <h3 className="mt-2 text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <FileText className="size-6 text-primary" aria-hidden />
              <div>
                <p className="font-semibold text-foreground">Ready to see your real match score?</p>
                <p className="text-sm text-muted-foreground">Sign in and run your first analysis in minutes.</p>
              </div>
            </div>
            <Button asChild>
              <Link to="/auth">
                Open the studio <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row lg:px-6">
          <BrandMark />
          <p>Deterministic Python ATS engine · Your data stays in your own account</p>
        </div>
      </footer>
    </div>
  );
}
