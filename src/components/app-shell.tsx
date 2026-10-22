import { type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useSession, useSignOut } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import {
  BrainCircuit,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  LaptopMinimal,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserRound,
  Wand2,
} from "lucide-react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/workspace", label: "Workspace", icon: Wand2 },
  { to: "/history", label: "History", icon: History },
  { to: "/resumes", label: "Resumes", icon: FolderOpen },
  { to: "/evidence", label: "Evidence", icon: FileText },
];

const settingsNav = [
  { to: "/settings/providers", label: "AI providers", icon: BrainCircuit },
  { to: "/settings/account", label: "Account", icon: UserRound },
  { to: "/settings/preferences", label: "Preferences", icon: Settings },
];

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: typeof LayoutDashboard }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </NavLink>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
      className="text-muted-foreground"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function UserMenu() {
  const session = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const email = session.user?.email ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-9 rounded-full p-0" aria-label="Account menu">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials(email || "U")}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal">
          <span className="block truncate text-sm font-medium text-foreground">{email}</span>
          <span className="text-xs text-muted-foreground">Signed in</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/settings/account" })}>
          <UserRound className="size-4" /> Account
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: "/settings/preferences" })}>
          <Settings className="size-4" /> Preferences
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="ATS Resume Studio home">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <LaptopMinimal className="size-4.5" aria-hidden />
      </span>
      {!compact ? (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          ATS Resume<span className="text-primary"> Studio</span>
        </span>
      ) : null}
    </Link>
  );
}

/** Authenticated application shell: responsive sidebar + top bar. */
export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 lg:flex">
        <div className="px-2 pb-5 pt-1">
          <BrandMark />
        </div>
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5">
          {nav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
          <div className="mx-3 my-3 border-t" />
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Settings
          </p>
          {settingsNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <p className="px-3 text-[11px] leading-relaxed text-muted-foreground">
          Deterministic scoring by the local Python engine. Your backend is the source of truth.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
            <div className="lg:hidden">
              <BrandMark compact />
            </div>
            <nav aria-label="Primary" className="hidden min-w-0 items-center gap-1 lg:flex lg:pl-1">
              {nav.slice(0, 2).map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </nav>
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
          {/* Mobile nav row */}
          <nav aria-label="Primary mobile" className="flex items-center gap-1 overflow-x-auto border-t px-3 py-1.5 lg:hidden">
            {[...nav, ...settingsNav].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium",
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main id="main-content" key={location.pathname} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8">
          {children}
        </main>

        <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
          ATS Resume Studio · Python engine is the source of truth · Scores are estimates, not guarantees
        </footer>
      </div>

      <Toaster position="bottom-right" />
    </div>
  );
}
