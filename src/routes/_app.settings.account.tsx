import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSession, useSignOut } from "@/lib/auth";
import { PageHeader, ConnectionNotice } from "@/components/page-states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { getSupabase } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { LogOut, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_app/settings/account")({
  component: AccountPage,
});

function AccountPage() {
  const session = useSession();
  const signOut = useSignOut();
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const email = session.user?.email || "";
  const createdAt = session.user?.created_at;

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      toast.success("Password updated.");
    } catch (err: any) {
      toast.error(err?.message || "Could not update the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Account" description="Your sign-in identity and security controls." />
      <ConnectionNotice compact />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Profile</CardTitle>
            <CardDescription>Managed by your Supabase authentication project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">{email || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">User ID</p>
              <p className="truncate font-mono text-xs text-foreground">{session.user?.id || "—"}</p>
            </div>
            {createdAt ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Member since</p>
                <p className="font-medium text-foreground">{formatDate(createdAt)}</p>
              </div>
            ) : null}
            <Separator />
            <Button
              variant="outline"
              onClick={async () => {
                await signOut();
                window.location.href = "/auth";
              }}
            >
              <LogOut className="size-4" /> Sign out of this device
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                const supabase = getSupabase();
                if (supabase) {
                  await supabase.auth.signOut({ scope: "global" });
                  window.location.href = "/auth";
                }
              }}
            >
              Sign out everywhere
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Change password</CardTitle>
            <CardDescription>Applies immediately to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {isSupabaseConfigured ? (
              <form onSubmit={changePassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  {busy ? "Updating…" : "Update password"}
                </Button>
              </form>
            ) : (
              <Alert>
                <AlertDescription>Password changes need the Supabase connection (see the notice above).</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4 text-primary" /> Data & privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>· Resumes, artifacts, and evidence live in your own storage and database, scoped to your user ID.</p>
            <p>· Provider API keys are encrypted server-side and never returned to the browser.</p>
            <p>· Analysis scores are deterministic engine estimates — see the disclaimer on every report.</p>
            <p>
              · Diagnostics and internal engine paths are not exposed in this interface by design.{" "}
              <Link to="/settings/preferences" className="underline">
                Interface preferences
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
