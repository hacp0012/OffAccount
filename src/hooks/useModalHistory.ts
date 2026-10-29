import { useCallback, useEffect, useId, useRef } from 'react';

let openModalCount = 0;
let previousBodyOverflow = '';

export const useModalHistory = (
  isOpen: boolean,
  onClose: () => void,
  dismissible = true
) => {
  const modalId = useId();
  const closeHandlerRef = useRef(onClose);
  const historyEntryRef = useRef(false);

  useEffect(() => {
    closeHandlerRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    if (openModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openModalCount += 1;

    if (dismissible) {
      const currentState = window.history.state;
      window.history.pushState(
        {
          ...(currentState && typeof currentState === 'object' ? currentState : {}),
          __offAccountModal: modalId,
        },
        ''
      );
      historyEntryRef.current = true;
    }

    const handlePopState = () => {
      if (
        historyEntryRef.current &&
        window.history.state?.__offAccountModal !== modalId
      ) {
        historyEntryRef.current = false;
        closeHandlerRef.current();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        window.history.state?.__offAccountModal === modalId
      ) {
        event.preventDefault();
        window.history.back();
      }
    };
    if (dismissible) {
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      openModalCount -= 1;
      if (openModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }

      if (
        historyEntryRef.current &&
        window.history.state?.__offAccountModal === modalId
      ) {
        historyEntryRef.current = false;
        window.history.back();
      }
    };
  }, [isOpen, modalId, dismissible]);

  return useCallback(() => {
    if (!dismissible) return;
    if (
      historyEntryRef.current &&
      window.history.state?.__offAccountModal === modalId
    ) {
      window.history.back();
    } else {
      closeHandlerRef.current();
    }
  }, [dismissible, modalId]);
};
