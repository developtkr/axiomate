import { useCallback } from "react";
import type { Evidence, PaperProject, StyleProfile } from "../types";

export interface CloudProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export interface CloudProject extends CloudProjectSummary {
  snapshot: PaperProject;
  evidence: Evidence[];
  styleProfile: StyleProfile;
}

interface CloudWorkspaceAuth {
  signedIn: boolean;
  getToken(): Promise<string | null>;
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Cloud request failed (${response.status}).`);
  return body;
}

export function useCloudWorkspace({ signedIn, getToken }: CloudWorkspaceAuth) {
  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const token = await getToken();
    if (!token) throw new Error("Sign in before using the cloud workspace.");
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
    return readResponse<T>(response);
  }, [getToken]);

  const listProjects = useCallback(
    () => signedIn ? request<CloudProjectSummary[]>("/api/projects") : Promise.resolve([]),
    [request, signedIn],
  );

  const openProject = useCallback(
    (projectId: string) => request<CloudProject>(`/api/projects/${encodeURIComponent(projectId)}`),
    [request],
  );

  const saveProject = useCallback(async (
    project: PaperProject,
    evidence: Evidence[],
    styleProfile: StyleProfile,
    projectId?: string,
  ): Promise<CloudProject> => request<CloudProject>(projectId ? `/api/projects/${projectId}` : "/api/projects", {
    method: projectId ? "PUT" : "POST",
    body: JSON.stringify({
      project: { name: project.name, mainFile: project.mainFile, files: project.files },
      evidence,
      styleProfile,
    }),
  }), [request]);

  const deleteProject = useCallback(async (projectId: string) => {
    const token = await getToken();
    if (!token) throw new Error("Sign in before deleting a cloud project.");
    const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const body = await response.json() as { error?: string };
      throw new Error(body.error ?? `Cloud delete failed (${response.status}).`);
    }
  }, [getToken]);

  return { listProjects, openProject, saveProject, deleteProject };
}
