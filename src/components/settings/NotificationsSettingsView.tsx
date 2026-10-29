import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, BellRing, Check, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_DAILY_REMINDER_SETTINGS,
  readDailyReminderSettings,
  saveDailyReminderSettings,
  showReminderNotification,
  type DailyReminderSettings,
} from '../../hooks/useDailyReminder';

const WEEKDAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 7, label: 'Dim' },
];

export const NotificationsSettingsView: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<DailyReminderSettings>(
    readDailyReminderSettings
  );
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    () => ('Notification' in window ? Notification.permission : 'unsupported')
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const refreshPermission = () => {
      if ('Notification' in window) setPermission(Notification.permission);
    };
    window.addEventListener('focus', refreshPermission);
    return () => window.removeEventListener('focus', refreshPermission);
  }, []);

  const updateSettings = (nextSettings: DailyReminderSettings) => {
    try {
      saveDailyReminderSettings(nextSettings);
      setSettings(nextSettings);
      setErrorMessage(null);
      setFeedback('Réglages enregistrés.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Impossible d’enregistrer les réglages.'
      );
      setFeedback(null);
    }
  };

  const toggleReminder = async () => {
    setFeedback(null);
    setErrorMessage(null);

    if (settings.enabled) {
      updateSettings({ ...settings, enabled: false });
      return;
    }

    if (!('Notification' in window)) {
      setErrorMessage('Les notifications ne sont pas prises en charge par ce navigateur.');
      return;
    }

    try {
      const currentPermission =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
      setPermission(currentPermission);

      if (currentPermission !== 'granted') {
        setErrorMessage(
          currentPermission === 'denied'
            ? 'Les notifications sont bloquées. Autorisez-les dans les réglages du navigateur, puis réessayez.'
            : 'L’autorisation des notifications est nécessaire pour activer le rappel.'
        );
        return;
      }

      updateSettings({ ...settings, enabled: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Impossible d’activer les notifications : ${error.message}`
          : 'Impossible d’activer les notifications.'
      );
    }
  };

  const toggleDay = (day: number) => {
    const days = settings.days.includes(day)
      ? settings.days.filter((selectedDay) => selectedDay !== day)
      : [...settings.days, day].sort((a, b) => a - b);
    updateSettings({ ...settings, days });
  };

  const sendTestNotification = async () => {
    setFeedback(null);
    setErrorMessage(null);
    try {
      await showReminderNotification(
        settings.message || DEFAULT_DAILY_REMINDER_SETTINGS.message
      );
      setFeedback('Notification de test envoyée.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible d’envoyer la notification de test.'
      );
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-20">
      <header className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-xs transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Retour aux paramètres"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Rappels et notifications
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choisissez quand OA vous rappelle de faire le point sur vos dépenses.
          </p>
        </div>
      </header>

      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-xs dark:bg-slate-900 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              {settings.enabled ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Rappel du rapport quotidien
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Recevez une notification à l’heure choisie pour penser à noter vos
                dépenses et revenus du jour.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            aria-label="Activer le rappel quotidien"
            onClick={() => void toggleReminder()}
            className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition ${
              settings.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                settings.enabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="daily-reminder-time"
              className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <Clock3 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              Heure du rappel
            </label>
            <input
              id="daily-reminder-time"
              type="time"
              value={settings.time}
              onChange={(event) =>
                updateSettings({ ...settings, time: event.target.value })
              }
              className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              Jours de rappel
            </legend>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map(({ value, label }) => {
                const isSelected = settings.days.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleDay(value)}
                    className={`flex min-h-10 items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition ${
                      isSelected
                        ? 'bg-emerald-700 text-white dark:bg-emerald-600'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label
              htmlFor="daily-reminder-message"
              className="text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Message de rappel
            </label>
            <textarea
              id="daily-reminder-message"
              rows={3}
              maxLength={180}
              value={settings.message}
              onChange={(event) =>
                updateSettings({ ...settings, message: event.target.value })
              }
              className="w-full resize-y rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
            />
            <p className="text-right text-[10px] text-slate-400">
              {settings.message.length}/180
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Autorisation navigateur :{' '}
              <span className="font-semibold">
                {permission === 'granted'
                  ? 'accordée'
                  : permission === 'denied'
                    ? 'bloquée'
                    : permission === 'unsupported'
                      ? 'non prise en charge'
                      : 'non demandée'}
              </span>
            </p>
            <button
              type="button"
              onClick={() => void sendTestNotification()}
              disabled={permission !== 'granted'}
              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Envoyer une notification de test
            </button>
          </div>
        </div>
      </section>

      <aside className="rounded-2xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        Les rappels fonctionnent localement, sans serveur, lorsque OA est ouverte
        ou laissée en arrière-plan. Le navigateur peut suspendre les tâches quand
        l’application est fermée : les notifications ne sont donc pas garanties
        dans ce cas. Sur iPhone/iPad, OA doit être installée sur l’écran d’accueil
        et les notifications doivent être autorisées.
      </aside>

      {feedback && (
        <p role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {feedback}
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
