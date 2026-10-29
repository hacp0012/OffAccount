/**
 * P2PSyncSettings.tsx
 * Page / Onglet de Synchronisation Peer-to-Peer (WebRTC/PeerJS).
 */

import React, { useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Radio,
  QrCode,
  ArrowRightLeft,
  RefreshCw,
  Smartphone,
  Zap,
  Info,
  Camera,
  Clipboard,
} from "lucide-react";
import { useP2PSync, type SyncStatus } from "../../hooks/useP2PSync";
import { QRScannerModal } from "./QRScannerModal";

interface StatusConfig {
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  pulse?: boolean;
}

function getStatusConfig(status: SyncStatus): StatusConfig {
  switch (status) {
    case "ready":
      return {
        color: "text-emerald-700 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        border: "border-emerald-200 dark:border-emerald-800",
        icon: <Wifi className="w-4 h-4" />,
      };
    case "initializing":
    case "connecting":
    case "sending":
    case "receiving":
    case "merging":
      return {
        color: "text-indigo-700 dark:text-indigo-400",
        bg: "bg-indigo-50 dark:bg-indigo-950/40",
        border: "border-indigo-200 dark:border-indigo-800",
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        pulse: true,
      };
    case "connected":
      return {
        color: "text-sky-700 dark:text-sky-400",
        bg: "bg-sky-50 dark:bg-sky-950/40",
        border: "border-sky-200 dark:border-sky-800",
        icon: <Wifi className="w-4 h-4" />,
        pulse: true,
      };
    case "success":
      return {
        color: "text-emerald-700 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        border: "border-emerald-200 dark:border-emerald-800",
        icon: <CheckCircle2 className="w-4 h-4" />,
      };
    case "error":
      return {
        color: "text-rose-700 dark:text-rose-400",
        bg: "bg-rose-50 dark:bg-rose-950/40",
        border: "border-rose-200 dark:border-rose-800",
        icon: <AlertTriangle className="w-4 h-4" />,
      };
    default:
      return {
        color: "text-slate-500 dark:text-slate-400",
        bg: "bg-slate-50 dark:bg-slate-900/60",
        border: "border-slate-200 dark:border-slate-800",
        icon: <WifiOff className="w-4 h-4" />,
      };
  }
}

type Mode = "emit" | "receive";

export const P2PSyncSettings: React.FC = () => {
  const {
    peerId,
    connectedPeerId,
    status,
    statusMessage,
    progress,
    mergeResult,
    error,
    connectToPeer,
    syncNow,
    reset,
  } = useP2PSync();

  const [mode, setMode] = useState<Mode>("emit");
  const [remotePeerId, setRemotePeerId] = useState("");
  const [copied, setCopied] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleCopyId = useCallback(async () => {
    if (!peerId) return;
    await navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [peerId]);

  const handlePasteId = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRemotePeerId(text.trim());
      }
    } catch {
      // Ignore clipboard read permission denial
    }
  }, []);

  const handleConnect = useCallback(() => {
    if (!remotePeerId.trim()) return;
    connectToPeer(remotePeerId.trim());
  }, [remotePeerId, connectToPeer]);

  const handleScanSuccess = useCallback(
    (scannedId: string) => {
      setRemotePeerId(scannedId);
      connectToPeer(scannedId);
    },
    [connectToPeer],
  );

  const handleSync = useCallback(async () => {
    await syncNow();
  }, [syncNow]);

  const canSync = status === "connected";
  const isLoading = [
    "initializing",
    "connecting",
    "sending",
    "receiving",
    "merging",
  ].includes(status);
  const cfg = getStatusConfig(status);

  return (
    <div className="space-y-4 sm:space-y-5 pb-16 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Synchronisation P2P Directe
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Transférez et fusionnez votre base de données locale en direct entre deux appareils sans aucun serveur de stockage.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <p className="leading-relaxed">
          La synchronisation s'effectue via <strong>WebRTC (PeerJS)</strong> : les données circulent directement de navigateur à navigateur avec une fusion intelligente sans perte (<em>Last-Write-Wins</em>). Les deux appareils doivent être connectés au même moment.
        </p>
      </div>

      {/* Status indicator */}
      <div
        className={`flex items-center gap-3 p-4 rounded-2xl border ${cfg.bg} ${cfg.border} transition-all`}
      >
        <div className={`shrink-0 ${cfg.color} ${cfg.pulse ? "animate-pulse" : ""}`}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-bold ${cfg.color}`}>{statusMessage}</span>
          {error && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 break-words">
              {error}
            </p>
          )}
        </div>
        {(status === "success" || status === "error" || status === "connected") && (
          <button
            onClick={reset}
            className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Progress bar */}
      {isLoading && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1">
            <span>Progression du transfert</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Mode selection tabs */}
      <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-1 grid grid-cols-2 gap-1">
        {(["emit", "receive"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              mode === m
                ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {m === "emit" ? (
              <>
                <Radio className="w-3.5 h-3.5" />
                Émettre (Générer QR)
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                Recevoir / Se connecter
              </>
            )}
          </button>
        ))}
      </div>

      {/* Emit mode */}
      {mode === "emit" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Votre Identifiant de Pair
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Faites scanner ce QR Code ou partagez cet ID avec l'autre appareil.
              </p>
            </div>
          </div>

          {peerId ? (
            <>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-3xl shadow-md border-2 border-indigo-100 dark:border-indigo-900/60 inline-block">
                  <QRCodeSVG
                    value={peerId}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#312e81"
                    level="M"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-[11px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 break-all text-slate-700 dark:text-slate-200 select-all">
                  {peerId}
                </div>
                <button
                  onClick={handleCopyId}
                  className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 transition cursor-pointer"
                  title="Copier l'identifiant"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                Restez sur cet écran. Dès que l'autre appareil se connecte, le bouton de synchronisation s'activera.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs">Génération de votre identifiant PeerJS...</p>
            </div>
          )}
        </div>
      )}

      {/* Receive mode */}
      {mode === "receive" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Se Connecter à un Pair
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saisissez l'ID du pair ou scannez directement son QR Code avec votre webcam.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide block">
              ID du pair distant
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                placeholder="ex: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                disabled={isLoading || status === "connected"}
                className="flex-1 font-mono text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handlePasteId}
                disabled={isLoading || status === "connected"}
                title="Coller depuis le presse-papier"
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <Clipboard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline">Coller</span>
              </button>
              <button
                type="button"
                onClick={handleConnect}
                disabled={!remotePeerId.trim() || isLoading || status === "connected"}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Wifi className="w-3.5 h-3.5" />
                Connecter
              </button>
            </div>
          </div>

          {/* Camera Scanner Trigger */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            disabled={isLoading || status === "connected"}
            className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Scanner le QR Code (Webcam)</span>
          </button>

          {/* Connected state badge */}
          {connectedPeerId && (
            <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 flex items-center justify-between text-xs text-sky-900 dark:text-sky-200">
              <span className="font-medium">
                Connecté à :{" "}
                <span className="font-mono text-[11px] font-bold">
                  {connectedPeerId.slice(0, 18)}...
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Canal P2P Prêt
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sync trigger button */}
      <button
        onClick={handleSync}
        disabled={!canSync || isLoading}
        className={`w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
          canSync && !isLoading
            ? "bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        {isLoading
          ? "Synchronisation en cours..."
          : status === "connected"
          ? "Lancer la Synchronisation"
          : status === "success"
          ? "Synchronisation Terminée (Re-synchroniser si connecté)"
          : "Connectez-vous d'abord à un pair pour synchroniser"}
      </button>

      {/* Merge results detailed feedback */}
      {mergeResult && status === "success" && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl p-5 border border-emerald-200 dark:border-emerald-800 shadow-xs space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
              Fusion Bidirectionnelle Réussie
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/60 shadow-xs">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                {mergeResult.added}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Ajoutés
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/60 shadow-xs">
              <span className="text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
                {mergeResult.updated}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Mis à jour
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/60 shadow-xs">
              <span className="text-2xl font-black text-slate-600 dark:text-slate-400 tabular-nums">
                {mergeResult.deleted}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                Supprimés
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            {Object.entries(mergeResult.tables).map(([table, stats]) => {
              const total = stats.added + stats.updated + stats.deleted;
              if (total === 0) return null;
              return (
                <div
                  key={table}
                  className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg bg-white/70 dark:bg-slate-900/60"
                >
                  <span className="font-semibold capitalize">{table}</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">
                    +{stats.added} ~{stats.updated} -{stats.deleted}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How it works educational guide */}
      <div className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
          Comment fonctionne la synchronisation P2P ?
        </h4>
        <ol className="space-y-2 text-xs text-slate-500 dark:text-slate-400 list-none">
          {[
            {
              n: "1",
              t: "Appareil A (Émetteur)",
              d: "Ouvre l'onglet Émettre et affiche son QR Code.",
            },
            {
              n: "2",
              t: "Appareil B (Récepteur)",
              d: "Scanne le QR Code avec sa Webcam ou colle l'identifiant.",
            },
            {
              n: "3",
              t: "Lancement de la Sync",
              d: "Cliquez sur 'Lancer la Synchronisation' dès que l'état affiche 'Connecté'.",
            },
            {
              n: "4",
              t: "Fusion LWW (Last-Write-Wins)",
              d: "Les enregistrements les plus récents (selon updatedAt) sont conservés sans aucune perte de données.",
            },
          ].map((step) => (
            <li key={step.n} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                {step.n}
              </span>
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {step.t}
                </span>
                <span className="text-slate-400 dark:text-slate-500">
                  {" "}
                  — {step.d}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Webcam QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanSuccess}
      />
    </div>
  );
};