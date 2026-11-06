import React, { useEffect, useState } from 'react';
import type { ShoppingList } from '../../types';
import { db } from '../../db/database';
import { Modal } from '../Modal';

const shoppingListEmojis = ['🛒', '🛍️', '🥬', '🍎', '🥖', '🥛', '🍽️', '🏠', '🎉', '🧹', '💊', '✨'];

interface ShoppingListRenameModalProps {
  list: ShoppingList | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShoppingListRenameModal: React.FC<ShoppingListRenameModalProps> = ({
  list,
  isOpen,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && list) {
      setTitle(list.title);
      setEmoji(list.emoji ?? '');
      setErrorMessage(null);
    }
  }, [isOpen, list]);

  const renameList = async (event: React.FormEvent) => {
    event.preventDefault();
    const updatedTitle = title.trim();
    if (!list || !updatedTitle) return;

    try {
      await db.shoppingLists.update(list.id, { title: updatedTitle, emoji: emoji || undefined });
      onClose();
    } catch (error) {
      console.error('Failed to rename shopping list:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Impossible de modifier le nom de la liste.',
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen && list !== null}
      onClose={onClose}
      title="Renommer la liste"
      description="Modifiez le nom de cette liste de courses."
      maxWidth="sm"
    >
      <form onSubmit={renameList} className="space-y-4">
        <div>
          <label htmlFor="shopping-list-title" className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
            Nom de la liste
          </label>
          <input
            id="shopping-list-title"
            autoFocus
            required
            maxLength={100}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <fieldset>
          <legend className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
            Icône de la liste
          </legend>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setEmoji('')}
              aria-pressed={!emoji}
              className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-[10px] font-semibold transition ${
                !emoji
                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 dark:bg-emerald-950/50 dark:ring-emerald-900'
                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700'
              }`}
            >
              Aucun
            </button>
            {shoppingListEmojis.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setEmoji(option)}
                aria-label={`Choisir l’emoji ${option}`}
                aria-pressed={emoji === option}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition ${
                  emoji === option
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 dark:bg-emerald-950/50 dark:ring-emerald-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
        {errorMessage && (
          <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-300">
            {errorMessage}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
};
