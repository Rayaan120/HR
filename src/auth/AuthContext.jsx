import { useEffect, useMemo, useState } from "react";
import { isAuthConfigured, supabase } from "../lib/supabase";
import AuthStateContext from "./AuthStateContext";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isAuthConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,
    isConfigured: isAuthConfigured,
    signOut: () => supabase?.auth.signOut({ scope: "local" }),
  }), [loading, session]);

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
}
