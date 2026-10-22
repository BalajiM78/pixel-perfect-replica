import { createFileRoute, Outlet, Navigate, Link, useLocation } from "@tanstack/react-router";
import { useSession } from "@/lib/auth";
import { AppShell, BrandMark } from "@/components/app-shell";
import { ConnectionNotice } from "@/components/page-states";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const session = useSession();
  const location = useLocation();

  if (session.status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <BrandMark />
        <p className="text-sm text-muted-foreground" role="status">
          Checking your session…
        </p>
      </div>
    );
  }

  if (session.status === "unconfigured") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>
        <ConnectionNotice />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          The studio is installed and waiting for your backend connection details.{" "}
          <Link to="/auth" className="underline">
            Auth page
          </Link>
        </p>
      </div>
    );
  }

  if (session.status === "signed_out") {
    return <Navigate to="/auth" search={{ next: location.pathname }} replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
