import { useEffect, useState } from "react";
import { Cloud, LoaderCircle, LogIn, LogOut, Save, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import type { CloudProject } from "../hooks/useCloudWorkspace";
import type { Evidence, PaperProject, StyleProfile } from "../types";

interface CloudWorkspaceDialogProps {
  configured: boolean;
  session: Session | null;
  project: PaperProject;
  evidence: Evidence[];
  styleProfile: StyleProfile;
  activeCloudId?: string;
  onClose(): void;
  onSignIn(email: string): Promise<void>;
  onSignOut(): Promise<void>;
  onList(): Promise<CloudProject[]>;
  onSave(project: PaperProject, evidence: Evidence[], styleProfile: StyleProfile, projectId?: string): Promise<CloudProject>;
  onOpen(project: CloudProject): void;
  onSaved(project: CloudProject): void;
}

export function CloudWorkspaceDialog({
  configured,
  session,
  project,
  evidence,
  styleProfile,
  activeCloudId,
  onClose,
  onSignIn,
  onSignOut,
  onList,
  onSave,
  onOpen,
  onSaved,
}: CloudWorkspaceDialogProps) {
  const [email, setEmail] = useState("");
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!session) return;
    let active = true;
    void onList()
      .then((items) => active && setProjects(items))
      .catch((error: unknown) => active && setMessage(error instanceof Error ? error.message : "Could not load projects."));
    return () => { active = false; };
  }, [onList, session]);

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSignIn(email);
      setMessage("Check your email for the secure sign-in link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCurrent() {
    setBusy(true);
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
            <strong>Cloud setup is pending</strong>
            <p>The app remains fully local until the Vercel Marketplace database is connected.</p>
          </div>
        )}

        {configured && !session && (
          <form className="cloud-auth" onSubmit={(event) => void submitEmail(event)}>
            <p>Sign in with a one-time email link. No password to store.</p>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="researcher@lab.org" /></label>
            <button className="save-settings-button" disabled={busy || !email}>
              {busy ? <LoaderCircle className="spin" size={14} /> : <LogIn size={14} />} Send sign-in link
            </button>
          </form>
        )}

        {configured && session && (
          <>
            <div className="cloud-account">
              <div><small>SIGNED IN</small><strong>{session.user.email}</strong></div>
              <button onClick={() => void signOut()} disabled={busy}><LogOut size={13} /> Sign out</button>
            </div>
            <button className="cloud-save-button" onClick={() => void saveCurrent()} disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}
              {activeCloudId ? "Update current cloud project" : "Save current project to cloud"}
            </button>
            <p className="cloud-privacy">LaTeX files, linked evidence notes, and the style profile are saved. Imported source PDF files remain on this device.</p>
            <div className="cloud-project-list">
              <small>YOUR PROJECTS</small>
              {projects.length === 0 && <p>No cloud projects yet.</p>}
              {projects.map((item) => (
                <button key={item.id} onClick={() => onOpen(item)}>
                  <span><strong>{item.name}</strong><small>{new Date(item.updated_at).toLocaleString()}</small></span>
                  <span>{item.id === activeCloudId ? "CURRENT" : "OPEN"}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {message && <div className="cloud-message">{message}</div>}
      </section>
    </div>
  );
}
