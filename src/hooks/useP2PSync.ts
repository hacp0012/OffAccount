/**
 * useP2PSync.ts
 * Hook React encapsulant la logique PeerJS pour la synchronisation P2P.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import Peer, { type DataConnection } from "peerjs";
import {
  exportLocalDatabaseForSync,
  mergeDatabases,
  type P2PSyncPayload,
  type MergeResult,
} from "../utils/mergeDatabases";

export type SyncStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "connecting"
  | "connected"
  | "sending"
  | "receiving"
  | "merging"
  | "success"
  | "error";

export interface UseP2PSyncReturn {
  peerId: string | null;
  status: SyncStatus;
  statusMessage: string;
  progress: number;
  mergeResult: MergeResult | null;
  error: string | null;
  connectToPeer: (remotePeerId: string) => void;
  syncNow: () => Promise<void>;
  reset: () => void;
}

const STATUS_MESSAGES: Record<SyncStatus, string> = {
  idle:         "En attente",
  initializing: "Initialisation de PeerJS...",
  ready:        "Pret - en attente de connexion",
  connecting:   "Connexion au pair distant...",
  connected:    "Connecte ! Pret pour la synchronisation",
  sending:      "Envoi des donnees en cours...",
  receiving:    "Reception des donnees...",
  merging:      "Fusion de la base de donnees...",
  success:      "Synchronisation reussie !",
  error:        "Une erreur est survenue",
};

export function useP2PSync(): UseP2PSyncReturn {
  const [peerId, setPeerId]           = useState<string | null>(null);
  const [status, setStatus]           = useState<SyncStatus>("idle");
  const [progress, setProgress]       = useState(0);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const peerRef     = useRef<Peer | null>(null);
  const connRef     = useRef<DataConnection | null>(null);
  const deviceIdRef = useRef<string>(
    localStorage.getItem("p2p_device_id") ??
      (() => {
        const id = `device_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem("p2p_device_id", id);
        return id;
      })(),
  );

  function setupConnection(conn: DataConnection) {
    connRef.current = conn;
    setStatus("connecting");
    setProgress(10);

    conn.on("open", () => {
      setStatus("connected");
      setProgress(20);
    });

    conn.on("data", async (rawData: unknown) => {
      try {
        setStatus("receiving");
        setProgress(50);
        const payload = rawData as P2PSyncPayload;
        if (!payload || !payload.data) throw new Error("Payload P2P invalide recu.");

        setStatus("merging");
        setProgress(75);
        const result = await mergeDatabases(payload);
        setMergeResult(result);

        setStatus("sending");
        setProgress(90);
        const localPayload = await exportLocalDatabaseForSync(deviceIdRef.current);
        conn.send(localPayload);

        setStatus("success");
        setProgress(100);
      } catch (err: any) {
        setError(err.message ?? "Erreur lors de la reception des donnees.");
        setStatus("error");
      }
    });

    conn.on("close", () => {
      if (status !== "success" && status !== "error") setStatus("idle");
    });

    conn.on("error", (err) => {
      setError(`Connexion : ${err.message}`);
      setStatus("error");
    });
  }

  const initPeer = useCallback(() => {
    if (peerRef.current) return;
    setStatus("initializing");
    setError(null);

    const peer = new Peer({
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });
    peerRef.current = peer;

    peer.on("open", (id) => {
      setPeerId(id);
      setStatus("ready");
    });

    peer.on("error", (err) => {
      setError(`PeerJS : ${err.message ?? String(err)}`);
      setStatus("error");
    });

    peer.on("connection", (conn) => {
      setupConnection(conn);
    });
  }, []);

  useEffect(() => {
    initPeer();
    return () => {
      peerRef.current?.destroy();
      peerRef.current = null;
    };
  }, [initPeer]);

  const connectToPeer = useCallback((remotePeerId: string) => {
    if (!peerRef.current) {
      setError("PeerJS non initialise. Veuillez reessayer.");
      return;
    }
    const conn = peerRef.current.connect(remotePeerId.trim(), { reliable: true, serialization: "json" });
    setupConnection(conn);
  }, []);

  const syncNow = useCallback(async () => {
    if (!connRef.current) {
      setError("Aucune connexion active. Connectez-vous dabord a un pair.");
      return;
    }
    try {
      setStatus("sending");
      setProgress(30);
      const payload = await exportLocalDatabaseForSync(deviceIdRef.current);
      connRef.current.send(payload);
      setProgress(60);
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'envoi.");
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    connRef.current?.close();
    connRef.current = null;
    setStatus(peerId ? "ready" : "idle");
    setProgress(0);
    setMergeResult(null);
    setError(null);
  }, [peerId]);

  return {
    peerId,
    status,
    statusMessage: STATUS_MESSAGES[status],
    progress,
    mergeResult,
    error,
    connectToPeer,
    syncNow,
    reset,
  };
}