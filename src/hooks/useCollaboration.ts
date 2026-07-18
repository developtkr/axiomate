import { useEffect, useRef, useState } from "react";
import type { Awareness } from "y-protocols/awareness";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebrtcProvider } from "y-webrtc";
import * as Y from "yjs";

export interface CollaborationBinding {
  roomId: string;
  text: Y.Text;
  awareness: Awareness;
  undoManager: Y.UndoManager;
}

interface CollaborationUser {
  name: string;
  color: string;
}

interface UseCollaborationOptions {
  roomId?: string;
  isHost: boolean;
  initialText: string;
  user: CollaborationUser;
  onTextChange: (content: string) => void;
}

export function useCollaboration({ roomId, isHost, initialText, user, onTextChange }: UseCollaborationOptions) {
  const [binding, setBinding] = useState<CollaborationBinding>();
  const [status, setStatus] = useState<"offline" | "connecting" | "connected">(roomId ? "connecting" : "offline");
  const [participants, setParticipants] = useState<CollaborationUser[]>([]);
  const changeRef = useRef(onTextChange);
  const initialTextRef = useRef(initialText);
  const userName = user.name;
  const userColor = user.color;
  changeRef.current = onTextChange;
  initialTextRef.current = initialText;

  useEffect(() => {
    if (!roomId) {
      setBinding(undefined);
      setStatus("offline");
      setParticipants([]);
      return;
    }

    setStatus("connecting");
    const document = new Y.Doc();
    const text = document.getText("main.tex");
    if (isHost && text.length === 0) text.insert(0, initialTextRef.current);
    const undoManager = new Y.UndoManager(text);
    const persistence = new IndexeddbPersistence(`axiomate:${roomId}`, document);
    const provider = new WebrtcProvider(`axiomate:${roomId}`, document, {
      password: roomId,
      maxConns: 20,
      filterBcConns: false,
    });

    provider.awareness.setLocalStateField("user", { name: userName, color: userColor });

    const updateParticipants = () => {
      const active = [...provider.awareness.getStates().values()]
        .map((state) => state.user as CollaborationUser | undefined)
        .filter((value): value is CollaborationUser => Boolean(value?.name));
      setParticipants(active);
    };
    const updateText = () => changeRef.current(text.toString());

    text.observe(updateText);
    provider.awareness.on("change", updateParticipants);
    persistence.once("synced", () => {
      if (isHost && text.length === 0) text.insert(0, initialTextRef.current);
      updateText();
    });
    updateParticipants();
    setBinding({ roomId, text, awareness: provider.awareness, undoManager });
    setStatus("connected");

    return () => {
      text.unobserve(updateText);
      provider.awareness.off("change", updateParticipants);
      provider.destroy();
      persistence.destroy();
      document.destroy();
      setBinding(undefined);
    };
  }, [isHost, roomId, userColor, userName]);

  return { binding, status, participants };
}
