import { useEffect, useState } from "react";
import { Cloud, LoaderCircle, LogIn, LogOut, Save, Trash2, X } from "lucide-react";
import type { AxiomateUser } from "../auth/authContext";
import type { CloudProject, CloudProjectSummary } from "../hooks/useCloudWorkspace";
import type { Evidence, PaperProject, StyleProfile } from "../types";

interface CloudWorkspaceDialogProps {
  configured: boolean;
  authLoaded: boolean;
  signedIn: boolean;
  user?: AxiomateUser;
  project: PaperProject;
  evidence: Evidence[];
  styleProfile: StyleProfile;
  activeCloudId?: string;
  onClose(): void;
  onSignIn(): Promise<void>;
  onSignOut(): Promise<void>;
  onList(): Promise<CloudProjectSummary[]>;
  onFetch(projectId: string): Promise<CloudProject>;
  onSave(project: PaperProject, evidence: Evidence[], styleProfile: StyleProfile, projectId?: string): Promise<CloudProject>;
  onDelete(projectId: string): Promise<void>;
  onDeleted(projectId: string): void;
  onOpen(project: CloudProject): void;
  onSaved(project: CloudProject): void;
}

export function CloudWorkspaceDialog({
  configured,
  authLoaded,
  signedIn,
  user,
  project,
  evidence,
  styleProfile,
  activeCloudId,
  onClose,
  onSignIn,
  onSignOut,
  onList,
  onFetch,
  onSave,
  onDelete,
  onDeleted,
  onOpen,
  onSaved,
}: CloudWorkspaceDialogProps) {
  const [projects, setProjects] = useState<CloudProjectSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    void onList()
      .then((items) => active && setProjects(items))
      .catch((error: unknown) => active && setMessage(error instanceof Error ? error.message : "Could not load projects."));
    return () => { active = false; };
  }, [onList, signedIn]);

  async function signIn() {
    setBusy(true);
    setMessage("");
    try {
      await onSignIn();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCurrent() {
    setBusy(true);
    setMessage("");
    try {
      const saved = await onSave(project, evidence, styleProfile, activeCloudId);
      onSaved(saved);
      setProjects((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      setMessage("Cloud snapshot saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cloud save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function openProject(projectId: string) {
    setBusy(true);
    try {
      onOpen(await onFetch(projectId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open the cloud project.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject(projectId: string) {
    const target = projects.find((item) => item.id === projectId);
    if (!window.confirm(`Delete the cloud snapshot “${target?.name ?? "Untitled"}”? Your local project will not be changed.`)) return;
    setBusy(true);
    try {
      await onDelete(projectId);
      onDeleted(projectId);
      setProjects((items) => items.filter((item) => item.id !== projectId));
      setMessage("Cloud snapshot deleted. Local files were not changed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cloud delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await onSignOut();
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-out failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-dialog cloud-dialog" role="dialog" aria-modal="true" aria-labelledby="cloud-title">
        <header>
          <div><Cloud size={17} /><h2 id="cloud-title">Cloud workspace</h2></div>
          <button onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        {!configured && (
          <div className="cloud-empty">
            <Cloud size={24} />
            <strong>Local-only mode</strong>
            <p>Clerk and Neon are not configured. Editing, local review, BYOK models, and collaboration still work.</p>
          </div>
        )}

        {configured && !authLoaded && <div className="cloud-empty"><LoaderCircle className="spin" size={24} /><strong>Checking session…</strong></div>}

        {configured && authLoaded && !signedIn && (
          <div className="cloud-auth">
            <p>Sign in to save private project snapshots. Authentication is handled by Clerk; source PDF files remain on this device.</p>
            <button className="save-settings-button" disabled={busy} onClick={() => void signIn()}>
              {busy ? <LoaderCircle className="spin" size={14} /> : <LogIn size={14} />} Sign in
            </button>
          </div>
        )}

        {configured && signedIn && (
          <>
            <div className="cloud-account">
              <div><small>SIGNED IN</small><strong>{user?.email ?? user?.name ?? "Researcher"}</strong></div>
              <button onClick={() => void signOut()} disabled={busy}><LogOut size={13} /> Sign out</button>
            </div>
            <button className="cloud-save-button" onClick={() => void saveCurrent()} disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}
              {activeCloudId ? "Update current cloud project" : "Save current project to cloud"}
            </button>
            <p className="cloud-privacy">LaTeX files, evidence notes, and the style profile are saved to Neon. Imported source PDF files and extracted full text remain local.</p>
            <div className="cloud-project-list">
              <small>YOUR PROJECTS</small>
              {projects.length === 0 && <p>No cloud projects yet.</p>}
              {projects.map((item) => (
                <div className="cloud-project-row" key={item.id}>
                  <button onClick={() => void openProject(item.id)} disabled={busy}>
                    <span><strong>{item.name}</strong><small>{new Date(item.updatedAt).toLocaleString()}</small></span>
                    <span>{item.id === activeCloudId ? "CURRENT" : "OPEN"}</span>
                  </button>
                  <button className="cloud-delete-button" onClick={() => void deleteProject(item.id)} disabled={busy} aria-label={`Delete ${item.name}`}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </>
        )}

        {message && <div className="cloud-message">{message}</div>}
      </section>
    </div>
  );
}
