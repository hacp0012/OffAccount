/**
 * useP2PSync.ts
 * Hook React encapsulant la logique PeerJS pour la synchronisation P2P.
 * Protocole à étapes finies (SYNC_REQUEST -> SYNC_RESPONSE -> SYNC_COMPLETE)
 * pour éliminer tout risque de boucle infinie d'envoi.
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

export type P2PMessage =
  | {
      type: "SYNC_REQUEST";
      syncId: string;
      deviceId: string;
      payload: P2PSyncPayload;
    }
  | {
      type: "SYNC_RESPONSE";
      syncId: string;
      deviceId: string;
      payload: P2PSyncPayload;
    }
  | {
      type: "SYNC_COMPLETE";
      syncId: string;
      deviceId: string;
    };

interface P2PSyncChunk {
  type: "SYNC_CHUNK";
  transferId: string;
  index: number;
  total: number;
  totalLength: number;
  checksum: string;
  data: string;
}

interface IncomingTransfer {
  total: number;
  totalLength: number;
  checksum: string;
  chunks: string[];
  received: number;
}

const SYNC_CHUNK_SIZE = 8 * 1024;
const MAX_SYNC_MESSAGE_SIZE = 50 * 1024 * 1024;
const MAX_SYNC_CHUNKS = Math.ceil(MAX_SYNC_MESSAGE_SIZE / SYNC_CHUNK_SIZE);

function checksumMessage(message: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < message.length; index++) {
    hash = Math.imul(hash ^ message.charCodeAt(index), 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function sendSyncMessage(conn: DataConnection, message: P2PMessage): Promise<void> {
  const serialized = JSON.stringify(message);
  if (serialized.length > MAX_SYNC_MESSAGE_SIZE) {
    throw new Error("Les données à synchroniser dépassent la taille maximale autorisée (50 Mo).");
  }

  const total = Math.ceil(serialized.length / SYNC_CHUNK_SIZE);
  const checksum = checksumMessage(serialized);
  const transferId = `${message.type}_${message.syncId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  for (let index = 0; index < total; index++) {
    if (!conn.open) {
      throw new Error("La connexion a été interrompue pendant l’envoi des données.");
    }

    const start = index * SYNC_CHUNK_SIZE;
    const chunk: P2PSyncChunk = {
      type: "SYNC_CHUNK",
      transferId,
      index,
      total,
      totalLength: serialized.length,
      checksum,
      data: serialized.slice(start, start + SYNC_CHUNK_SIZE),
    };
    conn.send(chunk);

    if (index > 0 && index % 32 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
}

export interface UseP2PSyncReturn {
  peerId: string | null;
  connectedPeerId: string | null;
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
  idle:         "En attente de connexion",
  initializing: "Initialisation du pair P2P...",
  ready:        "Prêt — en attente de connexion",
  connecting:   "Connexion au pair distant...",
  connected:    "Connecté ! Prêt pour la synchronisation",
  sending:      "Envoi des données en cours...",
  receiving:    "Réception des données du pair...",
  merging:      "Fusion intelligente de la base...",
  success:      "Synchronisation réussie avec succès !",
  error:        "Une erreur est survenue",
};

export function useP2PSync(): UseP2PSyncReturn {
  const [peerId, setPeerId]                   = useState<string | null>(null);
  const [connectedPeerId, setConnectedPeerId] = useState<string | null>(null);
  const [status, setStatus]                   = useState<SyncStatus>("idle");
  const [progress, setProgress]               = useState(0);
  const [mergeResult, setMergeResult]         = useState<MergeResult | null>(null);
  const [error, setError]                     = useState<string | null>(null);

  const peerRef         = useRef<Peer | null>(null);
  const connRef         = useRef<DataConnection | null>(null);
  const connectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef    = useRef<boolean>(false);

  const deviceIdRef = useRef<string>(
    localStorage.getItem("p2p_device_id") ??
      (() => {
        const id = `device_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem("p2p_device_id", id);
        return id;
      })(),
  );

  const clearConnectTimer = () => {
    if (connectTimerRef.current) {
      clearTimeout(connectTimerRef.current);
      connectTimerRef.current = null;
    }
  };

  const setupConnection = useCallback((conn: DataConnection) => {
    const incomingTransfers = new Map<string, IncomingTransfer>();
    connRef.current = conn;
    setStatus("connecting");
    setProgress(15);
    setConnectedPeerId(conn.peer);

    const onOpen = () => {
      clearConnectTimer();
      setStatus("connected");
      setProgress(25);
      setError(null);
    };

    if (conn.open) {
      onOpen();
    } else {
      conn.on("open", onOpen);
    }

    conn.on("data", async (rawData: unknown) => {
      try {
        let msg = rawData as any;
        if (!msg) return;

        if (msg.type === "SYNC_CHUNK") {
          const chunk = msg as P2PSyncChunk;
          if (
            typeof chunk.transferId !== "string" ||
            !Number.isInteger(chunk.index) ||
            !Number.isInteger(chunk.total) ||
            !Number.isInteger(chunk.totalLength) ||
            chunk.total < 1 ||
            chunk.total > MAX_SYNC_CHUNKS ||
            chunk.totalLength < 1 ||
            chunk.totalLength > MAX_SYNC_MESSAGE_SIZE ||
            chunk.total !== Math.ceil(chunk.totalLength / SYNC_CHUNK_SIZE) ||
            chunk.index < 0 ||
            chunk.index >= chunk.total ||
            typeof chunk.checksum !== "string" ||
            typeof chunk.data !== "string" ||
            chunk.data.length > SYNC_CHUNK_SIZE
          ) {
            throw new Error("Bloc de synchronisation invalide reçu.");
          }

          let transfer = incomingTransfers.get(chunk.transferId);
          if (!transfer) {
            transfer = {
              total: chunk.total,
              totalLength: chunk.totalLength,
              checksum: chunk.checksum,
              chunks: new Array<string>(chunk.total),
              received: 0,
            };
            incomingTransfers.set(chunk.transferId, transfer);
          } else if (
            transfer.total !== chunk.total ||
            transfer.totalLength !== chunk.totalLength ||
            transfer.checksum !== chunk.checksum
          ) {
            incomingTransfers.delete(chunk.transferId);
            throw new Error("Les informations des blocs reçus ne correspondent pas.");
          }

          const expectedChunkLength =
            chunk.index === chunk.total - 1
              ? chunk.totalLength - chunk.index * SYNC_CHUNK_SIZE
              : SYNC_CHUNK_SIZE;
          if (chunk.data.length !== expectedChunkLength) {
            incomingTransfers.delete(chunk.transferId);
            throw new Error("Un bloc de synchronisation est incomplet ou corrompu.");
          }

          if (transfer.chunks[chunk.index] === undefined) {
            transfer.chunks[chunk.index] = chunk.data;
            transfer.received++;
          }

          if (transfer.received < transfer.total) return;

          incomingTransfers.delete(chunk.transferId);
          const serialized = transfer.chunks.join("");
          if (
            serialized.length !== transfer.totalLength ||
            checksumMessage(serialized) !== transfer.checksum
          ) {
            throw new Error("La vérification des données reçues a échoué. Relancez la synchronisation.");
          }
          try {
            msg = JSON.parse(serialized);
          } catch {
            throw new Error("Le message de synchronisation reçu est illisible.");
          }
          if (!msg || typeof msg !== "object" || msg.type === "SYNC_CHUNK") {
            throw new Error("Le message de synchronisation reconstitué est invalide.");
          }
        }

        // Détection du format de message (nouveau protocole typé ou legacy)
        const isRequest = msg.type === "SYNC_REQUEST" || (!msg.type && msg.data);
        const isResponse = msg.type === "SYNC_RESPONSE";
        const isComplete = msg.type === "SYNC_COMPLETE";

        if (isRequest) {
          isSyncingRef.current = true;
          const payload = (msg.type ? msg.payload : msg) as P2PSyncPayload;
          const syncId = msg.syncId || `sync_${Date.now()}`;

          setStatus("receiving");
          setProgress(40);

          if (!payload || !payload.data) {
            throw new Error("Données de synchronisation invalides reçues.");
          }

          setStatus("merging");
          setProgress(65);
          const result = await mergeDatabases(payload);
          setMergeResult(result);

          // On exporte notre base fusionnée et on répond à l'initiateur (Peer A)
          setStatus("sending");
          setProgress(85);
          const localPayload = await exportLocalDatabaseForSync(deviceIdRef.current);
          const responseMsg: P2PMessage = {
            type: "SYNC_RESPONSE",
            syncId,
            deviceId: deviceIdRef.current,
            payload: localPayload,
          };
          await sendSyncMessage(conn, responseMsg);

          setStatus("success");
          setProgress(100);
          isSyncingRef.current = false;
          return;
        }

        if (isResponse) {
          const payload = msg.payload as P2PSyncPayload;
          const syncId = msg.syncId;

          setStatus("receiving");
          setProgress(70);

          if (!payload || !payload.data) {
            throw new Error("Réponse de synchronisation invalide.");
          }

          setStatus("merging");
          setProgress(85);
          const result = await mergeDatabases(payload);
          setMergeResult(result);

          // CRUCIAL : on envoie UNIQUEMENT un accusé de terminaison (SYNC_COMPLETE)
          // On ne ré-envoie JAMAIS les données pour éviter toute boucle ping-pong infinie !
          const completeMsg: P2PMessage = {
            type: "SYNC_COMPLETE",
            syncId,
            deviceId: deviceIdRef.current,
          };
          conn.send(completeMsg);

          setStatus("success");
          setProgress(100);
          isSyncingRef.current = false;
          return;
        }

        if (isComplete) {
          // La synchronisation est achevée avec succès des deux côtés
          setStatus("success");
          setProgress(100);
          isSyncingRef.current = false;
          return;
        }
      } catch (err: any) {
        console.error("Erreur de synchronisation P2P:", err);
        setError(err?.message ?? "Erreur lors de la synchronisation des données.");
        setStatus("error");
        isSyncingRef.current = false;
        incomingTransfers.clear();
      }
    });

    conn.on("close", () => {
      clearConnectTimer();
      connRef.current = null;
      setConnectedPeerId(null);
      isSyncingRef.current = false;
      incomingTransfers.clear();
      setStatus((current) => (current === "success" ? "success" : peerRef.current?.open ? "ready" : "idle"));
    });

    conn.on("error", (err: any) => {
      clearConnectTimer();
      setError(`Connexion : ${err?.message || String(err)}`);
      setStatus("error");
      isSyncingRef.current = false;
    });
  }, []);

  const initPeer = useCallback(() => {
    if (peerRef.current && !peerRef.current.destroyed) return;
    setStatus("initializing");
    setError(null);

    const peer = new Peer({
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      },
    });
    peerRef.current = peer;

    peer.on("open", (id) => {
      setPeerId(id);
      setStatus("ready");
    });

    peer.on("error", (err: any) => {
      setError(`PeerJS : ${err?.message ?? String(err)}`);
      setStatus("error");
    });

    peer.on("connection", (conn) => {
      setupConnection(conn);
    });
  }, [setupConnection]);

  useEffect(() => {
    initPeer();
    return () => {
      clearConnectTimer();
      connRef.current?.close();
      peerRef.current?.destroy();
      peerRef.current = null;
    };
  }, [initPeer]);

  const connectToPeer = useCallback(
    (remotePeerId: string) => {
      const cleanId = remotePeerId.trim();
      if (!cleanId) return;

      if (!peerRef.current || !peerRef.current.open) {
        setError("PeerJS non encore initialisé. Veuillez patienter.");
        return;
      }

      if (cleanId === peerId) {
        setError("Impossible de se connecter à soi-même. Utilisez l'ID d'un autre appareil.");
        return;
      }

      if (connRef.current) {
        try {
          connRef.current.close();
        } catch {}
        connRef.current = null;
      }

      clearConnectTimer();
      setError(null);
      setStatus("connecting");
      setProgress(15);

      try {
        const conn = peerRef.current.connect(cleanId, {
          reliable: true,
          serialization: "json",
        });

        setupConnection(conn);

        // Timeout de sécurité au bout de 20s si le pair distant ne répond pas
        connectTimerRef.current = setTimeout(() => {
          if (!conn.open) {
            conn.close();
            connRef.current = null;
            setStatus("error");
            setError("Délai dépassé. Vérifiez l'ID et que l'autre appareil a bien l'application ouverte.");
          }
        }, 20000);
      } catch (err: any) {
        setError(`Échec de connexion : ${err?.message || String(err)}`);
        setStatus("error");
      }
    },
    [peerId, setupConnection],
  );

  const syncNow = useCallback(async () => {
    if (!connRef.current || !connRef.current.open) {
      setError("Aucune connexion active avec un pair. Veuillez d'abord vous connecter.");
      return;
    }

    if (isSyncingRef.current) {
      return;
    }

    try {
      isSyncingRef.current = true;
      setError(null);
      setStatus("sending");
      setProgress(20);

      const syncId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const payload = await exportLocalDatabaseForSync(deviceIdRef.current);
      setProgress(40);

      const msg: P2PMessage = {
        type: "SYNC_REQUEST",
        syncId,
        deviceId: deviceIdRef.current,
        payload,
      };

      await sendSyncMessage(connRef.current, msg);
      setProgress(55);
    } catch (err: any) {
      isSyncingRef.current = false;
      setError(err?.message ?? "Erreur lors de l'envoi de la synchronisation.");
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    clearConnectTimer();
    connRef.current?.close();
    connRef.current = null;
    isSyncingRef.current = false;
    setConnectedPeerId(null);
    setStatus(peerRef.current?.open ? "ready" : "idle");
    setProgress(0);
    setMergeResult(null);
    setError(null);
  }, []);

  return {
    peerId,
    connectedPeerId,
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