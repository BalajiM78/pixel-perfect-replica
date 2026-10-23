import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/config";
import { useSession } from "@/lib/auth";
import { BrandMark } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingBlock } from "@/components/page-states";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: string; next?: string } => {
    const mode = typeof search["mode"] === "string" && search["mode"] ? search["mode"] : undefined;
    const next = typeof search["next"] === "string" && search["next"] ? search["next"] : undefined;
    const out: { mode?: string; next?: string } = {};
    if (mode) out.mode = mode;
    if (next) out.next = next;
    return out;
  },
  component: AuthPage,
});

type Mode = "signin" | "signup" | "recovery";

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function AuthPage() {
  const session = useSession();
  const navigate = useNavigate();
  const { next, mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(initialMode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const destination = next && next.startsWith("/") ? next : "/dashboard";

  useEffect(() => {
    if (session.status === "signed_in") {
      navigate({ to: destination, replace: true });
    }
  }, [session.status, destination, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setNotice("Account created. If email confirmation is enabled, check your inbox to verify, then sign in.");
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email);
        if (err) throw err;
        setNotice("Password recovery email sent if the address exists. Check your inbox.");
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 lg:px-6">
          <BrandMark />
          <Button variant="ghost" asChild>
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to the studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to run analyses and manage your resumes.</p>

          <div className="mt-6">
            {!isSupabaseConfigured ? (
              <Alert>
                <TriangleAlert className="size-4" />
                <AlertDescription>
                  <p className="font-medium text-foreground">Sign-in is not connected yet.</p>
                  <p className="mt-1 text-muted-foreground">
                    Add <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{" "}
                    <code className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code> in project settings,
                    then reload. Your existing Supabase project keeps all accounts.
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value={mode} className="mt-4">
                  <form onSubmit={submit} className="space-y-4" noValidate={false}>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {mode === "signin" ? (
                          <button
                            type="button"
                            className="text-xs text-muted-foreground underline hover:text-foreground"
                            onClick={() => setMode("recovery")}
                          >
                            Forgot?
                          </button>
                        ) : null}
                      </div>
                      <PasswordInput
                        id="password"
                        value={password}
                        onChange={setPassword}
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        required
                      />
                      {mode === "signup" ? (
                        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                      ) : null}
                    </div>

                    {error ? (
                      <Alert variant="destructive" role="alert">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ) : null}
                    {notice ? (
                      <Alert role="status">
                        <AlertDescription>{notice}</AlertDescription>
                      </Alert>
                    ) : null}

                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy
                        ? "Working…"
                        : mode === "signin"
                          ? "Sign in"
                          : mode === "signup"
                            ? "Create account"
                            : "Send recovery email"}
                    </Button>
                    {mode === "recovery" ? (
                      <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("signin")}>
                        Back to sign in
                      </Button>
                    ) : null}
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
