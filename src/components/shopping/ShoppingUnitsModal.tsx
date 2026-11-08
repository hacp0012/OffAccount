import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Ruler, X } from 'lucide-react';
import { db } from '../../db/database';
import { DEFAULT_SHOPPING_UNITS } from '../../utils/shoppingUnits';
import { Modal } from '../Modal';

interface ShoppingUnitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShoppingUnitsModal: React.FC<ShoppingUnitsModalProps> = ({ isOpen, onClose }) => {
  const settings = useLiveQuery(() => db.settings.get('default_config'));
  const customUnits = (settings?.shoppingUnits ?? []).filter(
    (unit) => !DEFAULT_SHOPPING_UNITS.some((defaultUnit) => defaultUnit.toLocaleLowerCase() === unit.toLocaleLowerCase()),
  );
  const [newUnit, setNewUnit] = useState('');
  const [error, setError] = useState<string | null>(null);

  const saveCustomUnits = async (units: string[]): Promise<boolean> => {
    try {
      await db.settings.put({
        ...settings,
        id: 'default_config',
        defaultCurrency: settings?.defaultCurrency ?? 'FRw',
        shoppingUnits: units,
      });
      setError(null);
      return true;
    } catch (saveError) {
      console.error('Failed to save shopping units:', saveError);
      setError('Impossible d’enregistrer les unités. Réessayez.');
      return false;
    }
  };

  const addUnit = async (event: React.FormEvent) => {
    event.preventDefault();
    const unit = newUnit.trim();
    if (!unit) return;
    if ([...DEFAULT_SHOPPING_UNITS, ...customUnits].some((value) => value.toLocaleLowerCase() === unit.toLocaleLowerCase())) {
      setError('Cette unité existe déjà.');
      return;
    }
    if (unit.length > 24) {
      setError('L’unité ne peut pas dépasser 24 caractères.');
      return;
    }

    if (await saveCustomUnits([...customUnits, unit])) {
      setNewUnit('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unités de mesure"
      description="Choisissez les unités proposées lors de l’ajout d’un article."
    >
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">Unités intégrées</h3>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_SHOPPING_UNITS.map((unit) => (
              <span key={unit} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {unit}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">Mes unités</h3>
          {customUnits.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customUnits.map((unit) => (
                <span key={unit} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 pl-2.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {unit}
                  <button
                    type="button"
                    onClick={() => void saveCustomUnits(customUnits.filter((candidate) => candidate !== unit))}
                    className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900"
                    aria-label={`Supprimer l’unité ${unit}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">Aucune unité personnalisée.</p>
          )}
        </div>

        <form onSubmit={addUnit} className="flex items-start gap-2">
          <label htmlFor="new-shopping-unit" className="sr-only">Nouvelle unité</label>
          <input
            id="new-shopping-unit"
            type="text"
            maxLength={24}
            value={newUnit}
            onChange={(event) => {
              setNewUnit(event.target.value);
              setError(null);
            }}
            placeholder="Ex. douzaine, tasse…"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={!newUnit.trim()}
            className="flex shrink-0 items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </form>

        {error && <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</p>}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <Ruler className="h-3.5 w-3.5" />
          Les unités déjà utilisées par des articles restent inchangées.
        </div>
      </div>
    </Modal>
  );
};
