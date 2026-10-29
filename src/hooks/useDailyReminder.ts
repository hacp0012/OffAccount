import { useEffect, useState } from 'react';

export interface DailyReminderSettings {
  enabled: boolean;
  time: string;
  days: number[];
  message: string;
}

const SETTINGS_KEY = 'offaccount_daily_reminder';
const LAST_REMINDER_KEY = 'offaccount_daily_reminder_last_date';
const SETTINGS_EVENT = 'offaccount-daily-reminder-settings';

export const DEFAULT_DAILY_REMINDER_SETTINGS: DailyReminderSettings = {
  enabled: false,
  time: '20:00',
  days: [1, 2, 3, 4, 5, 6, 7],
  message: 'N’oubliez pas de faire le rapport de vos dépenses du jour.',
};

export function readDailyReminderSettings(): DailyReminderSettings {
  try {
    const savedValue = localStorage.getItem(SETTINGS_KEY);
    if (!savedValue) return DEFAULT_DAILY_REMINDER_SETTINGS;

    const saved: unknown = JSON.parse(savedValue);
    if (!saved || typeof saved !== 'object') return DEFAULT_DAILY_REMINDER_SETTINGS;
    const settings = saved as Partial<DailyReminderSettings>;
    const validTime =
      typeof settings.time === 'string' &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.time);
    const validDays =
      Array.isArray(settings.days) &&
      settings.days.every(
        (day): day is number => Number.isInteger(day) && day >= 1 && day <= 7
      );

    return {
      enabled: settings.enabled === true,
      time: validTime ? settings.time! : DEFAULT_DAILY_REMINDER_SETTINGS.time,
      days: validDays ? [...new Set(settings.days!)] : DEFAULT_DAILY_REMINDER_SETTINGS.days,
      message:
        typeof settings.message === 'string' && settings.message.trim()
          ? settings.message.slice(0, 180)
          : DEFAULT_DAILY_REMINDER_SETTINGS.message,
    };
  } catch {
    return DEFAULT_DAILY_REMINDER_SETTINGS;
  }
}

export function saveDailyReminderSettings(settings: DailyReminderSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Impossible d’enregistrer les réglages : ${error.message}`
        : 'Impossible d’enregistrer les réglages de rappel.'
    );
  }
}

export async function showReminderNotification(message: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    throw new Error('Les notifications ne sont pas autorisées dans ce navigateur.');
  }

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.showNotification('Rappel OA', {
        body: message,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'offaccount-daily-expense-reminder',
      });
      return;
    }
  }

  new Notification('Rappel OA', { body: message, tag: 'offaccount-daily-expense-reminder' });
}

export function useDailyReminderScheduler(isReady: boolean): void {
  const [settings, setSettings] = useState(readDailyReminderSettings);

  useEffect(() => {
    const refreshSettings = () => setSettings(readDailyReminderSettings());
    window.addEventListener(SETTINGS_EVENT, refreshSettings);
    window.addEventListener('storage', refreshSettings);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, refreshSettings);
      window.removeEventListener('storage', refreshSettings);
    };
  }, []);

  useEffect(() => {
    if (!isReady || !settings.enabled) return;

    let isShowing = false;
    const checkAndNotify = async () => {
      if (
        isShowing ||
        !('Notification' in window) ||
        Notification.permission !== 'granted'
      ) {
        return;
      }

      const now = new Date();
      const day = now.getDay() || 7;
      if (!settings.days.includes(day)) return;

      const [hours, minutes] = settings.time.split(':').map(Number);
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hours, minutes, 0, 0);
      const elapsed = now.getTime() - scheduledTime.getTime();
      if (elapsed < 0 || elapsed > 10 * 60 * 1000) return;

      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (localStorage.getItem(LAST_REMINDER_KEY) === dateKey) return;

      isShowing = true;
      localStorage.setItem(LAST_REMINDER_KEY, dateKey);
      try {
        await showReminderNotification(settings.message);
      } catch (error) {
        localStorage.removeItem(LAST_REMINDER_KEY);
        console.error('Unable to show daily reminder notification:', error);
      } finally {
        isShowing = false;
      }
    };

    void checkAndNotify();
    const intervalId = window.setInterval(() => void checkAndNotify(), 30_000);
    document.addEventListener('visibilitychange', checkAndNotify);
    window.addEventListener('focus', checkAndNotify);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', checkAndNotify);
      window.removeEventListener('focus', checkAndNotify);
    };
  }, [isReady, settings]);
}
