import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { cloudConfigured, supabase } from "../lib/supabase";
import type { Evidence, PaperProject, StyleProfile } from "../types";

export interface CloudProject {
  id: string;
  name: string;
  snapshot: PaperProject;
  evidence: Evidence[];
  style_profile: StyleProfile;
  updated_at: string;
}

function cloudSnapshot(project: PaperProject): PaperProject {
  return {
    name: project.name,
    mainFile: project.mainFile,
    files: project.files,
  };
}

export function useCloudWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!cloudConfigured);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string) => {
    if (!supabase) throw new Error("Cloud workspace is not configured yet.");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const listProjects = useCallback(async (): Promise<CloudProject[]> => {
    if (!supabase || !session) return [];
    const { data, error } = await supabase
      .from("projects")
      .select("id,name,snapshot,evidence,style_profile,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CloudProject[];
  }, [session]);

  const saveProject = useCallback(async (
    project: PaperProject,
    evidence: Evidence[],
    styleProfile: StyleProfile,
    projectId?: string,
  ): Promise<CloudProject> => {
    if (!supabase || !session) throw new Error("Sign in before saving to the cloud.");
    const payload = {
      owner_id: session.user.id,
      name: project.name,
      main_file: project.mainFile,
      snapshot: cloudSnapshot(project),
      evidence,
      style_profile: styleProfile,
    };
    const query = projectId
      ? supabase.from("projects").update(payload).eq("id", projectId).eq("owner_id", session.user.id)
      : supabase.from("projects").insert(payload);
    const { data, error } = await query
      .select("id,name,snapshot,evidence,style_profile,updated_at")
      .single();
    if (error) throw error;
    return data as CloudProject;
  }, [session]);

  return {
    configured: cloudConfigured,
    authReady,
    session,
    signIn,
    signOut,
    listProjects,
    saveProject,
  };
}
