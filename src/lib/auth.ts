import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export type SessionStatus = "loading" | "unconfigured" | "signed_in" | "signed_out";

export interface SessionState {
  status: SessionStatus;
  user: User | null;
}

/**
 * Client-only session state. The backend verifies Supabase JWTs itself;
 * this hook only decides which UI to render.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: "loading", user: null });

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setState({ status: "unconfigured", user: null });
      return;
    }

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setState({ status: data.session ? "signed_in" : "signed_out", user: data.session?.user ?? null });
        }
      })
      .catch(() => {
        if (active) setState({ status: "signed_out", user: null });
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ status: session ? "signed_in" : "signed_out", user: session?.user ?? null });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function useSignOut() {
  return useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
  }, []);
}
