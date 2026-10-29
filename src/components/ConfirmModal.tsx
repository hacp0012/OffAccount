import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  isDestructive = true,
}) => {
  const resolvedConfirmLabel = confirmLabel || confirmText || 'Confirmer';
  const resolvedCancelLabel = cancelLabel || cancelText || 'Annuler';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-3.5">
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
            {message}
          </p>
        </div>

        <div className="pt-1 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-3 text-xs font-bold text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
