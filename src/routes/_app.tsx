import { createFileRoute, Outlet, Navigate, Link } from "@tanstack/react-router";
import { useSession } from "@/lib/auth";
import { AppShell, BrandMark } from "@/components/app-shell";
import { ConnectionNotice, LoadingBlock } from "@/components/page-states";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const session = useSession();
  const routerState = useRouterLocation();

  if (session.status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <BrandMark />
        <LoadingBlock label="Checking your session" />
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
        <p className="text-center text-sm text-muted-foreground">
          The studio is installed and waiting for your backend connection details.
        </p>
      </div>
    );
  }

  if (session.status === "signed_out") {
    return <Navigate to="/auth" search={{ next: routerState }} replace />;
  }

  return <AppShell>{<Outlet />}</AppShell>;
}

function useRouterLocation(): string | undefined {
  const { href } = useCurrentLocation();
  return href && href !== "/" ? href : undefined;
}

import { useLocation } from "@tanstack/react-router";

function useCurrentLocation() {
  return useLocation();
}
