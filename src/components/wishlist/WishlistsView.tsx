import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Heart,
  ListPlus,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/database';
import type { WishlistCategory, WishlistItem } from '../../types';
import { formatDate, formatMoney } from '../../utils/formatters';
import { ConfirmModal } from '../ConfirmModal';
import { Modal } from '../Modal';
import { useAppCurrency } from '../../context/CurrencyContext';

const today = () => {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const categoryEmojis = ['✨', '🎁', '🏠', '✈️', '🎓', '💡', '🎯', '💝', '🎮', '📚', '👗', '🚗', '🌱', '🎉', '🛍️', '📝'];

export const WishlistsView: React.FC = () => {
  const navigate = useNavigate();
  const { currency } = useAppCurrency();
  const categories = useLiveQuery(() => db.wishlistCategories.orderBy('createdAt').toArray()) ?? [];
  const items = useLiveQuery(() => db.wishlistItems.orderBy('createdAt').reverse().toArray()) ?? [];
  const shoppingLists = useLiveQuery(() => db.shoppingLists.toArray()) ?? [];
  const activeShoppingLists = shoppingLists.filter((list) => list.status === 'active');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryToEdit, setCategoryToEdit] = useState<WishlistCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<WishlistCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isWishModalOpen, setIsWishModalOpen] = useState(false);
  const [wishToEdit, setWishToEdit] = useState<WishlistItem | null>(null);
  const [wishToDelete, setWishToDelete] = useState<WishlistItem | null>(null);
  const [wishToMove, setWishToMove] = useState<WishlistItem | null>(null);
  const [targetShoppingListId, setTargetShoppingListId] = useState('');
  const [movePrice, setMovePrice] = useState('0');
  const [moveError, setMoveError] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [wishTitle, setWishTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [theme, setTheme] = useState('');
  const [wishAmount, setWishAmount] = useState('');
  const [wishAmountError, setWishAmountError] = useState('');
  const [wishLabel, setWishLabel] = useState('');
  const [priority, setPriority] = useState(3);
  const [searchTerm, setSearchTerm] = useState('');
  const [completionFilter, setCompletionFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [categoryEmoji, setCategoryEmoji] = useState(categoryEmojis[0]);

  useEffect(() => {
    if (!categories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0]?.id ?? '');
    }
  }, [categories, selectedCategoryId]);

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const categoryItems = items
    .filter((item) => item.listId === selectedCategoryId)
    .sort((a, b) => b.priority - a.priority || b.createdAt.localeCompare(a.createdAt));
  const normalizedSearch = searchTerm
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
  const displayedItems = categoryItems.filter((item) =>
    (completionFilter === 'todo' ? !item.completed : completionFilter === 'done' ? item.completed : true) &&
    [item.title, item.theme ?? '', item.label ?? '']
      .some((value) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase()
          .includes(normalizedSearch)
      )
  );
  const openNewCategory = () => {
    setCategoryToEdit(null);
    setCategoryName('');
    setCategoryEmoji(categoryEmojis[0]);
    setIsCategoryModalOpen(true);
  };
  const openEditCategory = (category: WishlistCategory) => {
    setCategoryToEdit(category);
    setCategoryName(category.name);
    setCategoryEmoji(category.emoji ?? '');
    setIsCategoryModalOpen(true);
  };
  const openNewWish = () => {
    setWishToEdit(null);
    setWishTitle('');
    setDueDate('');
    setTheme('');
    setWishAmount('');
    setWishAmountError('');
    setWishLabel('');
    setPriority(0);
    setIsWishModalOpen(true);
  };
  const openEditWish = (wish: WishlistItem) => {
    setWishToEdit(wish);
    setWishTitle(wish.title);
    setDueDate(wish.dueDate ?? '');
    setTheme(wish.theme ?? '');
    setWishAmount(wish.amount?.toString() ?? '');
    setWishAmountError('');
    setWishLabel(wish.label ?? '');
    setPriority(wish.priority);
    setIsWishModalOpen(true);
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    try {
      if (categoryToEdit) {
        await db.wishlistCategories.update(categoryToEdit.id, { name, emoji: categoryEmoji || undefined, updatedAt: now });
      } else {
        const newCategory: WishlistCategory = {
          id: `wishlist_category_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name,
          emoji: categoryEmoji || undefined,
          createdAt: now,
          updatedAt: now,
        };
        await db.wishlistCategories.add(newCategory);
        setSelectedCategoryId(newCategory.id);
      }
      setIsCategoryModalOpen(false);
    } catch (error) {
      console.error('Failed to save wishlist category:', error);
    }
  };

  const saveWish = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = wishTitle.trim();
    if (!title || !selectedCategory) return;
    const now = new Date().toISOString();
    const parsedAmount = wishAmount.trim() ? Number(wishAmount) : undefined;
    if (parsedAmount !== undefined && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
      setWishAmountError('Entrez un montant valide supérieur ou égal à zéro.');
      return;
    }
    try {
      if (wishToEdit) {
        await db.wishlistItems.update(wishToEdit.id, {
          title,
          dueDate: dueDate || undefined,
          theme: theme.trim() || undefined,
          amount: parsedAmount,
          amountCurrency: parsedAmount === undefined ? undefined : currency,
          label: wishLabel.trim() || undefined,
          priority,
          updatedAt: now,
        });
      } else {
        await db.wishlistItems.add({
          id: `wish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          listId: selectedCategory.id,
          title,
          addedDate: today(),
          dueDate: dueDate || undefined,
          completed: false,
          theme: theme.trim() || undefined,
          amount: parsedAmount,
          amountCurrency: parsedAmount === undefined ? undefined : currency,
          label: wishLabel.trim() || undefined,
          priority,
          createdAt: now,
          updatedAt: now,
        });
      }
      setIsWishModalOpen(false);
    } catch (error) {
      console.error('Failed to save wishlist item:', error);
    }
  };

  const openMoveWish = (wish: WishlistItem) => {
    const firstList = activeShoppingLists[0];
    setWishToMove(wish);
    setTargetShoppingListId(firstList?.id ?? '');
    setMovePrice(
      firstList && wish.amount !== undefined && (wish.amountCurrency ?? currency) === firstList.currency
        ? String(wish.amount)
        : '0'
    );
    setMoveError('');
  };

  const moveWishToShoppingList = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!wishToMove || !targetShoppingListId) return;
    const parsedMovePrice = Number(movePrice);
    if (!movePrice.trim() || !Number.isFinite(parsedMovePrice) || parsedMovePrice < 0) {
      setMoveError('Entrez un prix valide supérieur ou égal à zéro.');
      return;
    }

    try {
      await db.transaction('rw', [db.wishlistItems, db.shoppingItems, db.shoppingLists], async () => {
        const [wish, targetList] = await Promise.all([
          db.wishlistItems.get(wishToMove.id),
          db.shoppingLists.get(targetShoppingListId),
        ]);
        if (!wish) throw new Error('Ce souhait n’existe plus.');
        if (!targetList || targetList.status !== 'active') {
          throw new Error('Cette liste de courses n’est plus disponible.');
        }

        const wishCurrency = wish.amountCurrency ?? currency;
        const amountMatchesCurrency = wishCurrency === targetList.currency;
        const notes = [
          wish.label?.trim(),
          wish.amount !== undefined && !amountMatchesCurrency
            ? `Budget indicatif : ${formatMoney(wish.amount, wishCurrency)}`
            : undefined,
        ].filter(Boolean).join('\n');

        await db.shoppingItems.add({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          listId: targetList.id,
          name: wish.title,
          quantity: 1,
          unit: 'pcs',
          unitPrice: parsedMovePrice,
          category: wish.theme?.trim() || 'Autre',
          checked: false,
          notes: notes || undefined,
          createdAt: new Date().toISOString(),
        });
        await db.wishlistItems.delete(wish.id);
      });
      setWishToMove(null);
      setMoveError('');
    } catch (error) {
      console.error('Failed to move wishlist item to shopping list:', error);
      setMoveError(error instanceof Error ? error.message : 'Impossible de déplacer ce souhait.');
    }
  };

  const toggleWish = async (wish: WishlistItem) => {
    try {
      await db.wishlistItems.update(wish.id, {
        completed: !wish.completed,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update wishlist item:', error);
    }
  };

  const deleteWish = async () => {
    if (!wishToDelete) return;
    try {
      await db.wishlistItems.delete(wishToDelete.id);
      setWishToDelete(null);
    } catch (error) {
      console.error('Failed to delete wishlist item:', error);
    }
  };

  const deleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await db.transaction('rw', [db.wishlistCategories, db.wishlistItems], async () => {
        await db.wishlistItems.where('listId').equals(categoryToDelete.id).delete();
        await db.wishlistCategories.delete(categoryToDelete.id);
      });
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Failed to delete wishlist category:', error);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <header className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-xs dark:bg-slate-900 sm:rounded-3xl sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/applications')}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:flex"
            aria-label="Retour à Plus"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            <Heart className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              Liste de souhaits
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gardez vos envies et projets à portée de main.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openNewCategory}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
        >
          <ListPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouvelle catégorie</span>
          <span className="sm:hidden">Catégorie</span>
        </button>
      </header>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <ListPlus className="mx-auto mb-3 h-9 w-9 text-slate-300 dark:text-slate-600" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Créez votre première catégorie</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Regroupez vos souhaits par thème, par exemple « À venir », « Maison » ou « Idées sans date ».
          </p>
          <button
            type="button"
            onClick={openNewCategory}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            Créer une catégorie
          </button>
        </div>
      ) : (
        <>
          <section aria-label="Catégories de souhaits" className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => {
              const count = items.filter((item) => item.listId === category.id).length;
              const active = selectedCategoryId === category.id;
              return (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`min-w-32 rounded-xl px-2.5 py-2 text-left transition sm:min-w-36 sm:rounded-2xl sm:px-3 sm:py-2.5 ${
                    active
                      ? 'bg-emerald-100 dark:bg-emerald-950/60'
                      : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {category.emoji && <span className="text-sm leading-none" aria-hidden="true">{category.emoji}</span>}
                    <span className="block truncate text-[11px] font-bold text-slate-900 dark:text-white sm:text-xs">
                      {category.name}
                    </span>
                  </span>
                  <span className="mt-1 block text-[9px] leading-none text-slate-500 dark:text-slate-400 sm:text-[10px] sm:leading-normal">
                    {count} souhait{count === 1 ? '' : 's'}
                  </span>
                </button>
              );
            })}
          </section>

          {selectedCategory && (
            <section className="overflow-hidden rounded-2xl bg-white shadow-xs dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {selectedCategory.emoji && <span className="mr-1.5" aria-hidden="true">{selectedCategory.emoji}</span>}
                    {selectedCategory.name}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {categoryItems.filter((wish) => wish.completed).length} réalisé(s) sur {categoryItems.length}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditCategory(selectedCategory)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                    aria-label={`Renommer ${selectedCategory.name}`}
                    title="Renommer la catégorie"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(selectedCategory)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    aria-label={`Supprimer ${selectedCategory.name}`}
                    title="Supprimer la catégorie"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={openNewWish}
                    className="ml-1 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un souhait
                  </button>
                </div>
              </div>

              {categoryItems.length > 0 && (
                <div className="mx-4 mt-3 flex flex-col gap-2 sm:flex-row">
                  <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Search className="h-4 w-4 shrink-0" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Rechercher un souhait..."
                      aria-label="Rechercher dans cette liste de souhaits"
                      className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        aria-label="Effacer la recherche"
                        className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </label>
                  <div className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                    {([
                      ['all', 'Tout'],
                      ['todo', 'À faire'],
                      ['done', 'Réalisés'],
                    ] as const).map(([filter, label]) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setCompletionFilter(filter)}
                        aria-pressed={completionFilter === filter}
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                          completionFilter === filter
                            ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {displayedItems.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Heart className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {normalizedSearch || completionFilter !== 'all'
                      ? 'Aucun souhait trouvé'
                      : 'Aucun souhait dans cette catégorie'}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {normalizedSearch || completionFilter !== 'all'
                      ? 'Modifiez la recherche ou le filtre sélectionné.'
                      : 'Ajoutez une envie ou un projet à garder en tête.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedItems.map((wish) => (
                    <li key={wish.id} className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => void toggleWish(wish)}
                          className={`mt-0.5 shrink-0 ${wish.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 hover:text-emerald-600 dark:text-slate-600'}`}
                          aria-label={wish.completed ? `Marquer ${wish.title} comme non réalisé` : `Marquer ${wish.title} comme réalisé`}
                        >
                          {wish.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className={`break-words text-sm font-bold ${wish.completed ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                              {wish.title}
                            </h3>
                            {wish.theme && (
                              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                                {wish.theme}
                              </span>
                            )}
                          </div>
                          {wish.label && (
                            <p className="mt-0.5 break-words text-[11px] text-slate-600 dark:text-slate-300">
                              {wish.label}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <span>Ajouté le {formatDate(wish.addedDate)}</span>
                            {wish.dueDate && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                Cible : {formatDate(wish.dueDate)}
                              </span>
                            )}
                            {wish.amount !== undefined && (
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                {formatMoney(wish.amount, wish.amountCurrency || currency)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pl-7 sm:justify-end sm:pl-0">
                        <div className="flex" aria-label={`Priorité ${wish.priority} sur 5`}>
                          {Array.from({ length: 5 }, (_, index) => (
                            <Star
                              key={index}
                              className={`h-3.5 w-3.5 ${index < wish.priority ? 'fill-amber-400 text-amber-500' : 'text-slate-200 dark:text-slate-700'}`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditWish(wish)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                            aria-label={`Modifier ${wish.title}`}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openMoveWish(wish)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                            aria-label={`Déplacer ${wish.title} vers une liste de courses`}
                            title="Déplacer vers une liste de courses"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setWishToDelete(wish)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                            aria-label={`Supprimer ${wish.title}`}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={categoryToEdit ? 'Renommer la catégorie' : 'Nouvelle catégorie de souhaits'}
        maxWidth="sm"
      >
        <form onSubmit={saveCategory} className="space-y-4">
          <fieldset>
            <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">Icône de la catégorie</legend>
            <div className="mt-2 grid grid-cols-8 gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryEmoji('')}
                aria-label="Ne pas utiliser d’emoji"
                aria-pressed={!categoryEmoji}
                className={`col-span-2 flex h-9 items-center justify-center rounded-lg border px-2 text-[10px] font-semibold transition ${
                  !categoryEmoji
                    ? 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-950/60'
                    : 'border-transparent bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
                }`}
              >
                Aucun
              </button>
              {categoryEmojis.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setCategoryEmoji(emoji)}
                  aria-label={`Choisir l’emoji ${emoji}`}
                  aria-pressed={categoryEmoji === emoji}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${
                    categoryEmoji === emoji
                      ? 'bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-950/60'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Nom de la catégorie *
            <input
              autoFocus
              required
              maxLength={60}
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Ex. À venir, Maison, Idées sans date"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">Annuler</button>
            <button type="submit" disabled={!categoryName.trim()} className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white disabled:opacity-50">
              {categoryToEdit ? 'Enregistrer' : 'Créer la catégorie'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isWishModalOpen}
        onClose={() => setIsWishModalOpen(false)}
        title={wishToEdit ? 'Modifier le souhait' : 'Ajouter un souhait'}
        description={selectedCategory ? `Catégorie : ${selectedCategory.name}` : undefined}
        maxWidth="sm"
      >
        <form onSubmit={saveWish} className="space-y-3.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Titre *
            <input
              autoFocus
              required
              maxLength={120}
              value={wishTitle}
              onChange={(event) => setWishTitle(event.target.value)}
              placeholder="Ex. Acheter un vélo"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Date cible <span className="font-normal text-slate-400">(facultative)</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Thème <span className="font-normal text-slate-400">(facultatif)</span>
            <input
              maxLength={50}
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              placeholder="Ex. Anniversaire, Voyage"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Libellé <span className="font-normal text-slate-400">(facultatif)</span>
            <textarea
              maxLength={250}
              rows={2}
              value={wishLabel}
              onChange={(event) => setWishLabel(event.target.value)}
              placeholder="Une précision sur ce souhait..."
              className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Montant estimé <span className="font-normal text-slate-400">(facultatif, {currency})</span>
            <input
              type="number"
              min="0"
              step="any"
              value={wishAmount}
              onChange={(event) => {
                setWishAmount(event.target.value);
                setWishAmountError('');
              }}
              placeholder="0"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {wishAmountError && (
              <span role="alert" className="mt-1 block text-[11px] font-medium text-rose-600 dark:text-rose-400">
                {wishAmountError}
              </span>
            )}
          </label>
          <fieldset>
            <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">Priorité</legend>
            <div className="mt-1 flex items-center gap-1">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setPriority(value)}
                    aria-label={`${value} étoile${value > 1 ? 's' : ''}`}
                    aria-pressed={priority === value}
                    className="rounded-md p-1 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  >
                    <Star className={`h-6 w-6 ${value <= priority ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                  </button>
                );
              })}
            </div>
          </fieldset>
          <p className="text-[10px] text-slate-400">
            La date d’ajout ({formatDate(wishToEdit?.addedDate ?? today())}) est enregistrée automatiquement.
          </p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setIsWishModalOpen(false)} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">Annuler</button>
            <button type="submit" disabled={!wishTitle.trim()} className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white disabled:opacity-50">
              {wishToEdit ? 'Enregistrer' : 'Ajouter le souhait'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={wishToMove !== null}
        onClose={() => {
          setWishToMove(null);
          setMoveError('');
        }}
        title="Déplacer vers une liste de courses"
        description={wishToMove?.title}
        maxWidth="sm"
      >
        {activeShoppingLists.length > 0 ? (
          <form onSubmit={moveWishToShoppingList} className="space-y-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Liste de destination
              <select
                required
                value={targetShoppingListId}
                onChange={(event) => {
                  const newListId = event.target.value;
                  const newList = activeShoppingLists.find((list) => list.id === newListId);
                  setTargetShoppingListId(newListId);
                  setMovePrice(
                    newList && wishToMove?.amount !== undefined &&
                    (wishToMove.amountCurrency ?? currency) === newList.currency
                      ? String(wishToMove.amount)
                      : '0'
                  );
                  setMoveError('');
                }}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {activeShoppingLists.map((shoppingList) => (
                  <option key={shoppingList.id} value={shoppingList.id}>
                    {shoppingList.title} ({shoppingList.currency})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Prix de l’article ({activeShoppingLists.find((list) => list.id === targetShoppingListId)?.currency ?? currency})
              <input
                type="number"
                required
                min="0"
                step="any"
                value={movePrice}
                onChange={(event) => {
                  setMovePrice(event.target.value);
                  setMoveError('');
                }}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            {wishToMove?.amount !== undefined &&
              activeShoppingLists.find((list) => list.id === targetShoppingListId)?.currency !== (wishToMove.amountCurrency ?? currency) && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Le montant estimé du souhait est dans une autre devise ; ajustez le prix dans la devise de la liste. L’estimation d’origine sera conservée en note.
                </p>
              )}
            {moveError && <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">{moveError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWishToMove(null)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!targetShoppingListId}
                className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >
                Déplacer le souhait
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Créez d’abord une liste de courses pour pouvoir y déplacer ce souhait.
            </p>
            <button
              type="button"
              onClick={() => {
                setWishToMove(null);
                navigate('/shopping');
              }}
              className="w-full rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
            >
              Ouvrir les listes de courses
            </button>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!wishToDelete}
        onClose={() => setWishToDelete(null)}
        onConfirm={() => void deleteWish()}
        title="Supprimer ce souhait ?"
        message={`Le souhait « ${wishToDelete?.title ?? ''} » sera supprimé définitivement.`}
        confirmLabel="Supprimer"
      />
      <ConfirmModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => void deleteCategory()}
        title="Supprimer cette catégorie ?"
        message={`La catégorie « ${categoryToDelete?.name ?? ''} » et tous les souhaits qu’elle contient seront supprimés définitivement.`}
        confirmLabel="Supprimer la catégorie"
      />
    </div>
  );
};
