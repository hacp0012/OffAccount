import React, { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Edit2,
  Plus,
  Printer,
  ShoppingBasket,
  Tag,
  Trash2,
} from 'lucide-react';
import type { ProductPrice, ShoppingList } from '../../types';
import { db } from '../../db/database';
import { useAppCurrency } from '../../context/CurrencyContext';
import { formatMoney } from '../../utils/formatters';
import { Modal } from '../Modal';
import { ConfirmModal } from '../ConfirmModal';
import { ShoppingItemModal } from './ShoppingItemModal';

interface ProductPricesViewProps {
  lists: ShoppingList[];
}

export const ProductPricesView: React.FC<ProductPricesViewProps> = ({ lists }) => {
  const navigate = useNavigate();
  const { currency } = useAppCurrency();
  const products = useLiveQuery(
    () => db.productPrices.orderBy('name').toArray(),
    [],
  ) ?? [];
  const [productToEdit, setProductToEdit] = useState<ProductPrice | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductPrice | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productName, setProductName] = useState('');
  const [productLabel, setProductLabel] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [productToAdd, setProductToAdd] = useState<ProductPrice | null>(null);
  const [selectedListId, setSelectedListId] = useState('');
  const [isListPickerOpen, setIsListPickerOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [itemInitialValues, setItemInitialValues] = useState<{
    name: string;
    unitPrice: number;
    notes?: string;
  } | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const pendingItemModalRef = useRef(false);

  const activeListsForProduct = useMemo(
    () =>
      productToAdd
        ? lists.filter(
            (list) => list.status === 'active' && list.currency === productToAdd.currency,
          )
        : [],
    [lists, productToAdd],
  );

  const openNewProduct = () => {
    setProductToEdit(null);
    setProductName('');
    setProductLabel('');
    setUnitPrice('');
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const openEditProduct = (product: ProductPrice) => {
    setProductToEdit(product);
    setProductName(product.name);
    setProductLabel(product.label ?? '');
    setUnitPrice(product.unitPrice.toString());
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = productName.trim();
    const parsedPrice = Number(unitPrice);
    if (!trimmedName || !Number.isFinite(parsedPrice) || parsedPrice < 0) return;

    try {
      const now = new Date().toISOString();
      if (productToEdit) {
        await db.productPrices.update(productToEdit.id, {
          name: trimmedName,
          label: productLabel.trim() || undefined,
          unitPrice: parsedPrice,
          updatedAt: now,
        });
      } else {
        const product: ProductPrice = {
          id: `price_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: trimmedName,
          label: productLabel.trim() || undefined,
          unitPrice: parsedPrice,
          currency,
          createdAt: now,
          updatedAt: now,
        };
        await db.productPrices.add(product);
      }
      setIsProductModalOpen(false);
      setProductToEdit(null);
    } catch (error) {
      console.error('Failed to save product price:', error);
      setFormError(
        error instanceof Error ? error.message : 'Impossible d’enregistrer ce produit.',
      );
    }
  };

  const deleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await db.productPrices.delete(productToDelete.id);
      setProductToDelete(null);
    } catch (error) {
      console.error('Failed to delete product price:', error);
      setOperationError(
        error instanceof Error ? error.message : 'Impossible de supprimer ce produit.',
      );
    }
  };

  const exportCsv = () => {
    const escapeCell = (value: string, protectFormula = false) => {
      const safeValue =
        protectFormula && /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
      return /[;"\r\n]/.test(safeValue)
        ? `"${safeValue.replace(/"/g, '""')}"`
        : safeValue;
    };
    const rows = [
      ['Produit', 'Libellé', 'Prix unitaire', 'Devise'],
      ...products.map((product) => [
        product.name,
        product.label ?? '',
        String(product.unitPrice).replace('.', ','),
        product.currency,
      ]),
    ];
    const csv = `\uFEFF${rows
      .map((row, index) =>
        row.map((cell, cellIndex) => escapeCell(cell, index > 0 && cellIndex < 2)).join(';'),
      )
      .join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'oa-fiche-prix-produits.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openAddToList = (product: ProductPrice) => {
    setProductToAdd(product);
    setSelectedListId(
      lists.find((list) => list.status === 'active' && list.currency === product.currency)?.id ?? '',
    );
    setIsListPickerOpen(true);
  };

  const continueAddToList = () => {
    if (!productToAdd) return;
    const list = activeListsForProduct.find((candidate) => candidate.id === selectedListId);
    if (!list) {
      setOperationError('Choisissez une liste de courses active dans la devise du produit.');
      return;
    }
    setSelectedList(list);
    setItemInitialValues({
      name: productToAdd.name,
      unitPrice: productToAdd.unitPrice,
      notes: productToAdd.label,
    });
    pendingItemModalRef.current = true;
    setIsListPickerOpen(false);
  };

  const openItemModalAfterPickerExit = () => {
    if (pendingItemModalRef.current) {
      pendingItemModalRef.current = false;
      setIsItemModalOpen(true);
    }
  };

  return (
    <div
      id="product-prices-print-root"
      className="mx-auto max-w-5xl space-y-4 pb-20 print:max-w-none print:space-y-4 print:pb-0"
    >
      <header className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/shopping')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-xs transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Retour aux listes de courses"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              Fiche des prix
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {products.length} produit{products.length === 1 ? '' : 's'} enregistré
              {products.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-3"
            title="Exporter en CSV compatible avec Excel"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:px-3"
            title="Imprimer la fiche"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimer</span>
          </button>
          <button
            type="button"
            onClick={openNewProduct}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-2.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 sm:px-3"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </header>

      {operationError && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 print:hidden">
          {operationError}
          <button type="button" className="ml-2 underline" onClick={() => setOperationError(null)}>
            Fermer
          </button>
        </p>
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-xs dark:bg-slate-900 print:overflow-visible print:rounded-none print:bg-white print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800 print:border-black">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-emerald-700 dark:text-emerald-400 print:text-black" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white print:text-black">
              Produits et prix unitaires
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 print:text-black">
            Nouvelle fiche : {currency}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="px-4 py-12 text-center print:hidden">
            <ShoppingBasket className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
            <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              Aucun produit dans la fiche
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ajoutez des produits et leurs prix pour les retrouver facilement.
            </p>
            <button
              type="button"
              onClick={openNewProduct}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              Ajouter un produit
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-xs print:min-w-0">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400 print:border-black print:text-black">
                  <th className="px-4 py-2.5 font-bold">Produit</th>
                  <th className="px-4 py-2.5 text-right font-bold">Prix unitaire</th>
                  <th className="px-4 py-2.5 font-bold">Libellé</th>
                  <th className="px-4 py-2.5 text-right font-bold print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800 print:border-slate-300"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100 print:text-black">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900 dark:text-white print:text-black">
                      {formatMoney(product.unitPrice, product.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 print:text-black">
                      {product.label || '—'}
                    </td>
                    <td className="px-4 py-2 print:hidden">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAddToList(product)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70"
                          title="Ajouter à une liste de courses"
                        >
                          <ShoppingBasket className="h-3.5 w-3.5" />
                          <span>Ajouter aux courses</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditProduct(product)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                          title="Modifier le produit"
                          aria-label={`Modifier ${product.name}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(product)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                          title="Supprimer le produit"
                          aria-label={`Supprimer ${product.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setProductToEdit(null);
        }}
        title={productToEdit ? 'Modifier le produit' : 'Ajouter un produit'}
        description="Enregistrez son nom et son prix unitaire."
      >
        <form onSubmit={saveProduct} className="space-y-4">
          <div>
            <label htmlFor="price-product-name" className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Nom du produit *
            </label>
            <input
              id="price-product-name"
              type="text"
              required
              maxLength={100}
              autoFocus
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Ex. Riz, lait, savon…"
            />
          </div>
          <div>
            <label htmlFor="price-product-amount" className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Prix unitaire ({productToEdit?.currency ?? currency}) *
            </label>
            <input
              id="price-product-amount"
              type="number"
              required
              min="0"
              step="any"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="price-product-label" className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              Libellé (optionnel)
            </label>
            <textarea
              id="price-product-label"
              rows={2}
              maxLength={250}
              value={productLabel}
              onChange={(event) => setProductLabel(event.target.value)}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Informations complémentaires sur le produit"
            />
          </div>
          {formError && (
            <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!productName.trim() || unitPrice === '' || !Number.isFinite(Number(unitPrice)) || Number(unitPrice) < 0}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isListPickerOpen}
        onExitComplete={openItemModalAfterPickerExit}
        onClose={() => {
          setIsListPickerOpen(false);
          setProductToAdd(null);
        }}
        title="Ajouter à une liste de courses"
        description={
          productToAdd
            ? `${productToAdd.name} — ${formatMoney(productToAdd.unitPrice, productToAdd.currency)}`
            : undefined
        }
      >
        <div className="space-y-4">
          {activeListsForProduct.length > 0 ? (
            <>
              <div>
                <label htmlFor="product-shopping-list" className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Liste active *
                </label>
                <select
                  id="product-shopping-list"
                  value={selectedListId}
                  onChange={(event) => setSelectedListId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {activeListsForProduct.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.title} ({list.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsListPickerOpen(false)}
                  className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={continueAddToList}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  Continuer
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Aucune liste active en {productToAdd?.currency}.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Créez d’abord une liste dans cette devise pour ajouter ce produit sans modifier son prix.
              </p>
              <button
                type="button"
                onClick={() => navigate('/shopping')}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
              >
                Ouvrir les listes de courses
              </button>
            </div>
          )}
        </div>
      </Modal>

      <ShoppingItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setItemInitialValues(null);
          setProductToAdd(null);
          setSelectedList(null);
        }}
        listId={selectedList?.id ?? ''}
        currency={selectedList?.currency ?? currency}
        initialValues={itemInitialValues}
      />

      <ConfirmModal
        isOpen={productToDelete !== null}
        onClose={() => setProductToDelete(null)}
        onConfirm={deleteProduct}
        title="Supprimer ce produit ?"
        message={`Voulez-vous vraiment supprimer "${productToDelete?.name}" de la fiche des prix ?`}
        confirmText="Supprimer"
        isDestructive
      />
    </div>
  );
};
