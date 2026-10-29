import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useModalHistory } from '../hooks/useModalHistory';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  dismissible?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  dismissible = true,
}) => {
  const requestClose = useModalHistory(isOpen, onClose, dismissible);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxWidthClass = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
  }[maxWidth];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop with enter & exit fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={requestClose}
            aria-hidden="true"
          />

          {/* Modal / Bottom Sheet Box with enter & exit slide/scale */}
          <motion.div
            initial={
              isMobile
                ? { y: '100%', opacity: 0.6 }
                : { scale: 0.95, y: 12, opacity: 0 }
            }
            animate={
              isMobile
                ? { y: 0, opacity: 1 }
                : { scale: 1, y: 0, opacity: 1 }
            }
            exit={
              isMobile
                ? { y: '100%', opacity: 0 }
                : { scale: 0.95, y: 10, opacity: 0 }
            }
            transition={
              isMobile
                ? { type: 'spring', damping: 28, stiffness: 320 }
                : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
            }
            className={`fixed inset-x-0 bottom-0 z-10 w-full ${maxWidthClass} bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden sm:relative sm:inset-auto`}
            role="dialog"
            aria-modal="true"
          >
            {/* Mobile Grab Handle */}
            <div className="sm:hidden pt-2.5 pb-0.5 flex justify-center">
              <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 pt-2.5 pb-2.5 sm:px-5 sm:pt-4 sm:pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h2>
                {description && (
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {description}
                  </p>
                )}
              </div>
              {dismissible && (
                <button
                  onClick={requestClose}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>

            {/* Scrollable Content */}
            <div className="px-4 py-3 sm:px-5 sm:py-4 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
