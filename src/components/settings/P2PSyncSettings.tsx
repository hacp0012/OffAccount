/**
 * P2PSyncSettings.tsx
 * Page de Synchronisation P2P dans les Parametres.
 */

import React, { useState, useRef, useCallback } from "react";
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
  Clipboard,
} from "lucide-react";
import { useP2PSync, type SyncStatus } from "../../hooks/useP2PSync";

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
      return { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: React.createElement(Wifi, { className: "w-4 h-4" }) };
    case "initializing":
    case "connecting":
    case "sending":
    case "receiving":
    case "merging":
      return { color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", icon: React.createElement(Loader2, { className: "w-4 h-4 animate-spin" }), pulse: true };
    case "connected":
      return { color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", icon: React.createElement(Wifi, { className: "w-4 h-4" }), pulse: true };
    case "success":
      return { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: React.createElement(CheckCircle2, { className: "w-4 h-4" }) };
    case "error":
      return { color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", icon: React.createElement(AlertTriangle, { className: "w-4 h-4" }) };
    default:
      return { color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200", icon: React.createElement(WifiOff, { className: "w-4 h-4" }) };
  }
}

type Mode = "emit" | "receive";

export const P2PSyncSettings: React.FC = () => {
  const { peerId, connectedPeerId, status, statusMessage, progress, mergeResult, error, connectToPeer, syncNow, reset } = useP2PSync();
  const [mode, setMode] = useState<Mode>("emit");
  const [remotePeerId, setRemotePeerId] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyId = useCallback(async () => {
    if (!peerId) return;
    await navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [peerId]);

  const handlePasteId = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setRemotePeerId(text.trim());
    } catch {
      // Ignore clipboard read denial
    }
  }, []);

  const handleConnect = useCallback(() => {
    if (!remotePeerId.trim()) return;
    connectToPeer(remotePeerId.trim());
  }, [remotePeerId, connectToPeer]);

  const handleSync = useCallback(async () => { await syncNow(); }, [syncNow]);

  const canSync = status === "connected";
  const isLoading = ["initializing","connecting","sending","receiving","merging"].includes(status);
  const cfg = getStatusConfig(status);

  return (
    <div className="space-y-5 pb-24 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
          Synchronisation P2P
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Transferez et fusionnez votre base de donnees en direct entre deux appareils sans serveur intermediaire.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" />
        <p className="leading-relaxed">
          La synchronisation utilise <strong>WebRTC (PeerJS)</strong> : les donnees voyagent directement de navigateur
          a navigateur. Aucune donnee ne transite par un serveur de stockage.{" "}
          <strong>Les deux appareils doivent etre en ligne</strong> au meme moment.
        </p>
      </div>

      {/* Status indicator */}
      <div className={`flex items-center gap-3 p-4 rounded-2xl border ${cfg.bg} ${cfg.border} transition-all`}>
        <div className={`shrink-0 ${cfg.color} ${cfg.pulse ? "animate-pulse" : ""}`}>{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-bold ${cfg.color}`}>{statusMessage}</span>
          {error && <p className="text-[11px] text-rose-600 mt-0.5 break-words">{error}</p>}
        </div>
        {(status === "success" || status === "error") && (
          <button onClick={reset} className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer">
            <RefreshCw className="w-3 h-3" />
            Reinitialiser
          </button>
        )}
      </div>

      {/* Progress bar */}
      {isLoading && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Mode tabs */}
      <div className="bg-slate-100 rounded-2xl p-1 grid grid-cols-2 gap-1">
        {(["emit", "receive"] as Mode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${mode === m ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
            {m === "emit" ? <><Radio className="w-3.5 h-3.5" />Emettre (Generer)</> : <><Smartphone className="w-3.5 h-3.5" />Recevoir (Se connecter)</>}
          </button>
        ))}
      </div>

      {/* Emit mode */}
      {mode === "emit" && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Votre ID de Pair</h2>
              <p className="text-xs text-slate-500">Partagez cet ID ou ce QR Code avec l'autre appareil.</p>
            </div>
          </div>
          {peerId ? (
            <>
              <div className="flex justify-center">
                <div className="p-4 bg-white border-2 border-indigo-100 rounded-3xl shadow-inner inline-block">
                  <QRCodeSVG value={peerId} size={180} bgColor="#ffffff" fgColor="#3730a3" level="M" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 break-all text-slate-700 select-all">{peerId}</div>
                <button onClick={handleCopyId} className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer">
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 text-center">Restez sur cette page - le pair distant doit coller cet ID dans son champ "Recevoir".</p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-xs">Generation de votre ID PeerJS...</p>
            </div>
          )}
        </div>
      )}

      {/* Receive mode */}
      {mode === "receive" && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Se Connecter a un Pair</h2>
              <p className="text-xs text-slate-500">Saisissez l'ID PeerJS affiche sur l'autre appareil.</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide block">ID du pair distant</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                placeholder="ex: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                disabled={isLoading || status === "connected"}
                className="flex-1 font-mono text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handlePasteId}
                disabled={isLoading || status === "connected"}
                title="Coller depuis le presse-papier"
                className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <Clipboard className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Coller</span>
              </button>
              <button
                onClick={handleConnect}
                disabled={!remotePeerId.trim() || isLoading || status === "connected"}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Wifi className="w-3.5 h-3.5" />Connecter
              </button>
            </div>
          </div>
          {connectedPeerId && (
            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-between text-xs text-sky-800">
              <span className="font-medium">Connecté à : <span className="font-mono text-[11px] font-bold">{connectedPeerId.slice(0, 18)}...</span></span>
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Canal P2P Actif
              </span>
            </div>
          )}
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-2.5 text-xs text-amber-800">
            <QrCode className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <p><strong>Astuce :</strong> Affichez le QR Code sur l'autre appareil, copiez son ID ou scannez-le, puis cliquez sur <strong>Coller</strong> et <strong>Connecter</strong>.</p>
          </div>
        </div>
      )}

      {/* Sync button */}
      <button onClick={handleSync} disabled={!canSync || isLoading}
        className={`w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer ${canSync && !isLoading ? "bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 text-white shadow-lg shadow-indigo-200 active:scale-[0.98]" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        {isLoading
          ? "Synchronisation en cours..."
          : status === "connected"
          ? "Lancer la Synchronisation"
          : status === "success"
          ? "Synchronisation Réussie (Re-synchroniser si connecté)"
          : "Connectez-vous d'abord à un pair pour synchroniser"}
      </button>

      {/* Merge result */}
      {mergeResult && status === "success" && (
        <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-emerald-900">Fusion Terminee avec Succes</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-2xl p-3 border border-emerald-100">
              <span className="text-2xl font-black text-emerald-700 tabular-nums">{mergeResult.added}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Ajoutes</span>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-emerald-100">
              <span className="text-2xl font-black text-sky-600 tabular-nums">{mergeResult.updated}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Mis a jour</span>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-emerald-100">
              <span className="text-2xl font-black text-slate-600 tabular-nums">{mergeResult.deleted}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Supprimes</span>
            </div>
          </div>
          <div className="space-y-1">
            {Object.entries(mergeResult.tables).map(([table, stats]) => {
              const total = stats.added + stats.updated + stats.deleted;
              if (total === 0) return null;
              return (
                <div key={table} className="flex items-center justify-between text-[11px] text-slate-600 px-1">
                  <span className="font-semibold capitalize">{table}</span>
                  <span className="text-slate-400">+{stats.added} ~{stats.updated} -{stats.deleted}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Comment ca marche ?</h3>
        <ol className="space-y-2 text-xs text-slate-500 list-none">
          {[
            { n: "1", t: "Appareil A (Emettre)", d: "Ouvrez cette page et copiez votre ID ou faites scanner le QR Code." },
            { n: "2", t: "Appareil B (Recevoir)", d: "Collez l'ID dans le champ Recevoir et cliquez sur Connecter." },
            { n: "3", t: "Lancer la Sync", d: "Cliquez Lancer la Synchronisation sur l'un ou l'autre appareil." },
            { n: "4", t: "Fusion LWW", d: "Seules les versions les plus recentes sont retenues. Aucune donnee n'est perdue." },
          ].map((step) => (
            <li key={step.n} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">{step.n}</span>
              <div><span className="font-semibold text-slate-700">{step.t}</span><span className="text-slate-400"> - {step.d}</span></div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};