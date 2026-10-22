import { createFileRoute } from "@tanstack/react-router";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { PageHeader } from "@/components/page-states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings/preferences")({
  component: PreferencesPage,
});

function PreferencesPage() {
  const { theme, setTheme } = useTheme();

  const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun; hint: string }> = [
    { value: "light", label: "Light", icon: Sun, hint: "Warm paper surfaces" },
    { value: "dark", label: "Dark", icon: Moon, hint: "Deep teal-ink surfaces" },
    { value: "system", label: "System", icon: Monitor, hint: "Follow your device setting" },
  ];

  return (
    <div>
      <PageHeader title="Preferences" description="Interface appearance. Saved on this device." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Theme</CardTitle>
            <CardDescription>Persisted in this browser; system follows your OS preference.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePreference)} className="gap-3">
              {options.map((o) => (
                <Label
                  key={o.value}
                  htmlFor={`theme-${o.value}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3",
                    theme === o.value && "border-primary bg-accent"
                  )}
                >
                  <RadioGroupItem id={`theme-${o.value}`} value={o.value} className="sr-only" />
                  <o.icon className="size-4 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-medium text-foreground">{o.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{o.hint}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Motion & accessibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Animations automatically respect your operating system&apos;s “reduce motion” setting — no toggle needed
              here.
            </p>
            <Separator />
            <p>
              All dialogs, menus, and tabs are keyboard-operable, inputs have explicit labels, and focus is always
              visible. Score visualizations include text alternatives for screen readers.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
