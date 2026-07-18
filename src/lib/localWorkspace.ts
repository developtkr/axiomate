import type { Evidence, PaperProject, StyleProfile } from "../types";

export interface LocalWorkspace {
  project: PaperProject;
  evidence: Evidence[];
  styleProfile: StyleProfile;
  updatedAt: string;
}

const databaseName = "axiomate-local";
const storeName = "workspace";
const activeKey = "active";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open browser storage."));
  });
}

export async function loadLocalWorkspace(): Promise<LocalWorkspace | undefined> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(storeName, "readonly").objectStore(storeName).get(activeKey);
      request.onsuccess = () => resolve(request.result as LocalWorkspace | undefined);
      request.onerror = () => reject(request.error ?? new Error("Could not restore the local workspace."));
    });
  } finally {
    database.close();
  }
}

export async function saveLocalWorkspace(workspace: LocalWorkspace): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(storeName, "readwrite").objectStore(storeName).put(workspace, activeKey);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Could not save the local workspace."));
    });
  } finally {
    database.close();
  }
}
