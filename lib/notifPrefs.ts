const KEY = 'samruq:notif';

export interface NotifPrefs {
  newLead: boolean;
  newDeal: boolean;
  stageChange: boolean;
  taskDone: boolean;
  taskOverdue: boolean;
}

const DEFAULTS: NotifPrefs = {
  newLead: true,
  newDeal: true,
  stageChange: false,
  taskDone: false,
  taskOverdue: true,
};

export function getNotifPrefs(): NotifPrefs {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {
    return DEFAULTS;
  }
}

export function saveNotifPrefs(prefs: NotifPrefs): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function isTelegramEnabled(event: keyof NotifPrefs): boolean {
  return getNotifPrefs()[event] === true;
}
