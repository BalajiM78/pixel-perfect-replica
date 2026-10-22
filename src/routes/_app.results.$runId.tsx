import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, normalizeAnalysisRecord, type AnalysisResponse } from "@/lib/api";
import { isApiConfigured } from "@/lib/config";
import { PageHeader, LoadingBlock, ErrorState, ConnectionNotice } from "@/components/page-states";
import { ResultsView } from "@/components/results-view";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/results/$runId")({
  component: ResultsPage,
});

function ResultsPage() {
  const { runId } = Route.useParams();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["analysis", runId],
    enabled: isApiConfigured,
    retry: false,
    queryFn: async (): Promise<AnalysisResponse> => {
      const cached = queryClient.getQueryData<AnalysisResponse>(["analysis", runId]);
      if (cached?.report) return cached;
      const { record } = await api.getAnalysisRecord(runId);
      if (!record?.report) {
        throw new Error("This run could not be loaded. It may have been created before you signed in.");
      }
      return normalizeAnalysisRecord(runId, record);
    },
  });

  return (
    <div>
      <PageHeader
        title="Analysis report"
        description="Deterministic engine output — every number traces to a rule."
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="size-4" /> Dashboard
            </Link>
          </Button>
        }
      />
      <ConnectionNotice compact />
      {query.isPending && isApiConfigured ? (
        <LoadingBlock label="Loading report" />
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => query.refetch()} />
      ) : query.data ? (
        <ResultsView result={query.data} />
      ) : null}
    </div>
  );
}
