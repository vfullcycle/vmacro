import { useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { supabase } from "./supabase";

export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setIsAdmin(!!data?.is_admin);
        setLoading(false);
      });
  }, [user]);

  return { isAdmin, loading };
}
