import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ProviderConfigData } from "@/lib/api";
import { isApiConfigured } from "@/lib/config";
import { PageHeader, ConnectionNotice, LoadingBlock, ErrorState } from "@/components/page-states";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowDown,
  ArrowUp,
  BrainCircuit,
  CheckCircle2,
  KeyRound,
  Link2,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/providers")({
  component: ProvidersPage,
});

interface DraftState {
  enabled: Record<string, boolean>;
  models: Record<string, string>;
  keys: Record<string, string>;
  webReaderEnabled: boolean;
  webReaderKey: string;
  preferredProvider: string;
  fallbackOrder: string[];
}

function ProvidersPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftState | null>(null);

  const query = useQuery({
    queryKey: ["providers"],
    enabled: isApiConfigured,
    retry: false,
    queryFn: async (): Promise<ProviderConfigData> => api.getProvidersConfig(),
  });

  const data = query.data;

  // Seed the draft from loaded server state, once.
  if (data && draft === null) {
    setDraft({
      enabled: Object.fromEntries(data.providers.map((p) => [p.id, p.enabled ?? true])),
      models: Object.fromEntries(data.providers.map((p) => [p.id, p.model])),
      keys: {},
      webReaderEnabled: data.webReader.enabled,
      webReaderKey: "",
      preferredProvider: data.preferredProvider,
      fallbackOrder: [...data.fallbackOrder],
    });
  }

  const saveMutation = useMutation({
    mutationFn: (d: DraftState) =>
      api.saveProviderSettings({
        preferredProvider: d.preferredProvider,
        fallbackOrder: d.fallbackOrder,
        providers: Object.fromEntries(
          data!.providers.map((p) => [
            p.id,
            {
              enabled: d.enabled[p.id] ?? true,
              model: d.models[p.id] || undefined,
              apiKey: d.keys[p.id]?.trim() || undefined,
            },
          ])
        ),
        webReader: {
          enabled: d.webReaderEnabled,
          provider: data!.webReader.provider,
          apiKey: d.webReaderKey.trim() || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Provider settings saved. Keys are encrypted server-side and never returned.");
    },
    onError: (err: any) => toast.error(err?.message || "Save failed."),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testProvider(id, draft?.keys[id]?.trim() || undefined, draft?.models[id]),
    onSuccess: (res, id) => {
      if (res.ok) {
        toast.success(`${id}: connection OK (${res.latencyMs} ms, model ${res.model}).`);
      } else {
        toast.error(`${id}: test failed${res.error ? ` — ${res.error}` : ""}.`);
      }
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
    onError: (err: any) => toast.error(err?.message || "Test request failed."),
  });

  const testReaderMutation = useMutation({
    mutationFn: () => api.testWebReader(),
    onSuccess: (res) => {
      if (res.ok) toast.success(`Web reader OK (${res.latencyMs} ms${res.method ? `, ${res.method}` : ""}).`);
      else toast.error(`Web reader test failed${res.error ? ` — ${res.error}` : ""}.`);
    },
    onError: (err: any) => toast.error(err?.message || "Test request failed."),
  });

  const move = (id: string, dir: -1 | 1) => {
    if (!draft) return;
    const order = [...draft.fallbackOrder];
    const idx = order.indexOf(id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= order.length) return;
    [order[idx], order[next]] = [order[next], order[idx]];
    setDraft({ ...draft, fallbackOrder: order });
  };

  if (!isApiConfigured) {
    return (
      <div>
        <PageHeader title="AI providers" description="Your five LLM providers and the web reader, configured server-side." />
        <ConnectionNotice />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI providers"
        description="Keys are encrypted server-side and never sent back to the browser. Your provider accounts may charge for usage."
        actions={
          <Button onClick={() => draft && saveMutation.mutate(draft)} disabled={!draft || saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Save settings
          </Button>
        }
      />
      <ConnectionNotice compact />

      {query.isPending ? (
        <LoadingBlock />
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => query.refetch()} />
      ) : data && draft ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preferred provider</CardTitle>
                <CardDescription>Tried first when generating AI advisories.</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={draft.preferredProvider} onValueChange={(v) => setDraft({ ...draft, preferredProvider: v })}>
                  <SelectTrigger aria-label="Preferred provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fallback order</CardTitle>
                <CardDescription>When the preferred provider fails, the engine walks down this list.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {draft.fallbackOrder.map((id, i) => {
                    const label = data.providers.find((p) => p.id === id)?.label || id;
                    return (
                      <li key={id} className="flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-sm">
                        <span>
                          <span className="score-text mr-2 text-xs text-muted-foreground">{i + 1}.</span>
                          {label}
                        </span>
                        <span className="flex gap-1">
                          <Button size="icon" variant="ghost" className="size-7" aria-label={`Move ${label} up`} onClick={() => move(id, -1)} disabled={i === 0}>
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            aria-label={`Move ${label} down`}
                            onClick={() => move(id, 1)}
                            disabled={i === draft.fallbackOrder.length - 1}
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BrainCircuit className="size-4 text-primary" /> LLM providers
              </CardTitle>
              <CardDescription>
                Disable a failing provider or move it down the fallback order — the engine keeps working with the rest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              {data.providers.map((p, i) => (
                <div key={p.id}>
                  {i > 0 ? <Separator /> : null}
                  <div className="grid gap-3 py-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={draft.enabled[p.id] ?? true}
                        onCheckedChange={(v) => setDraft({ ...draft, enabled: { ...draft.enabled, [p.id]: v } })}
                        aria-label={`Enable ${p.label}`}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.configured ? `Key configured (${p.keyMasked})` : "No key saved"}
                          {p.userConfigured ? " · yours" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={draft.models[p.id] || p.model}
                        onValueChange={(v) => setDraft({ ...draft, models: { ...draft.models, [p.id]: v } })}
                      >
                        <SelectTrigger className="h-8 w-64 text-xs" aria-label={`${p.label} model`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(p.models.length ? p.models : [p.model]).map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="password"
                        className="h-8 w-56 text-xs"
                        aria-label={`${p.label} API key`}
                        placeholder={p.configured ? "Replace saved key" : "Paste API key"}
                        autoComplete="off"
                        value={draft.keys[p.id] || ""}
                        onChange={(e) => setDraft({ ...draft, keys: { ...draft.keys, [p.id]: e.target.value } })}
                      />
                      <Button size="sm" variant="outline" disabled={testMutation.isPending} onClick={() => testMutation.mutate(p.id)}>
                        {testMutation.isPending && testMutation.variables === p.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          "Test"
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.lastTest ? (
                        p.lastTest.ok ? (
                          <Badge variant="outline" className="bg-success/12 text-success-foreground dark:text-success">
                            <CheckCircle2 className="mr-1 size-3" /> {p.lastTest.latencyMs} ms
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive">
                            <XCircle className="mr-1 size-3" /> failed
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <KeyRound className="mr-1 size-3" /> untested
                        </Badge>
                      )}
                      <a href={p.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground underline hover:text-foreground">
                        Docs
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Link2 className="size-4 text-primary" /> Web reader (job URL extraction)
              </CardTitle>
              <CardDescription>
                Separate from LLM keys. Jina reads posting URLs; without it the backend falls back to local extraction.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Switch
                checked={draft.webReaderEnabled}
                onCheckedChange={(v) => setDraft({ ...draft, webReaderEnabled: v })}
                aria-label="Enable web reader"
              />
              <span className="text-sm text-muted-foreground">
                {data.webReader.configured ? `Key configured (${data.webReader.keyMasked})` : "No key saved — fallback extraction only"}
              </span>
              <Input
                type="password"
                className="h-8 w-56 text-xs"
                aria-label="Web reader API key"
                placeholder={data.webReader.configured ? "Replace saved key" : "Paste Jina API key"}
                autoComplete="off"
                value={draft.webReaderKey}
                onChange={(e) => setDraft({ ...draft, webReaderKey: e.target.value })}
              />
              <Button size="sm" variant="outline" disabled={testReaderMutation.isPending} onClick={() => testReaderMutation.mutate()}>
                {testReaderMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Test reader"}
              </Button>
            </CardContent>
          </Card>

          <Alert>
            <AlertDescription className="text-xs text-muted-foreground">
              Saved keys are encrypted with the server&apos;s encryption secret and used only for your requests. Clear a
              key field before saving to keep the existing key. Your provider accounts may incur charges under your own
              billing.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
