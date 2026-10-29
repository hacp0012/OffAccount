import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, X, AlertTriangle, FlipHorizontal } from "lucide-react";
import { useModalHistory } from "../../hooks/useModalHistory";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const requestClose = useModalHistory(isOpen, onClose);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let isSubscribed = true;

    async function startCamera() {
      stopCamera();
      setErrorMessage(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setErrorMessage("L'accès à la caméra n'est pas supporté par ce navigateur.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Start scanning loop if BarcodeDetector is available
        if ("BarcodeDetector" in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          });

          const scanFrame = async () => {
            if (!isSubscribed || !videoRef.current) return;
            if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  const scannedValue = barcodes[0].rawValue.trim();
                  if (scannedValue) {
                    onScan(scannedValue);
                    onClose();
                    return;
                  }
                }
              } catch {
                // Ignore frame detection failures
              }
            }
            animFrameRef.current = requestAnimationFrame(scanFrame);
          };

          animFrameRef.current = requestAnimationFrame(scanFrame);
        } else {
          setErrorMessage(
            "Le détecteur matériel natif de QR Code n'est pas disponible sur ce navigateur. Vous pouvez coller manuellement l'identifiant."
          );
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        setHasCamera(false);
        setErrorMessage(
          err.name === "NotAllowedError"
            ? "Permission d'accès à la caméra refusée. Veuillez autoriser l'accès dans les paramètres du navigateur."
            : `Impossible d'activer la caméra : ${err.message || String(err)}`
        );
      }
    }

    startCamera();

    return () => {
      isSubscribed = false;
      stopCamera();
    };
  }, [isOpen, facingMode, onScan, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={requestClose}
          />

          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Scanner le QR Code du Pair</span>
              </div>
              <button
                onClick={requestClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewport */}
            <div className="relative bg-black aspect-square flex items-center justify-center overflow-hidden">
              {hasCamera && (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {/* Scanner Overlay Box */}
              {hasCamera && !errorMessage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-56 h-56 border-2 border-indigo-500 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-xl" />

                    {/* Animated scan bar */}
                    <div className="absolute inset-x-2 h-0.5 bg-sky-400 animate-pulse top-1/2 -translate-y-1/2 shadow-[0_0_8px_#38bdf8]" />
                  </div>
                </div>
              )}

              {/* Error display */}
              {errorMessage && (
                <div className="absolute inset-x-6 p-4 rounded-2xl bg-slate-900/90 text-white text-xs space-y-2 border border-slate-700 text-center">
                  <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() =>
                  setFacingMode((prev) =>
                    prev === "environment" ? "user" : "environment"
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <FlipHorizontal className="w-4 h-4 text-slate-500" />
                <span>Changer de caméra</span>
              </button>

              <button
                type="button"
                onClick={requestClose}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
