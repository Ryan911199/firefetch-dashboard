// Settings types and localStorage helpers

export type RefreshInterval = 15 | 30 | 60 | 300 | 0; // seconds (0 = manual)
export type ViewMode = "comfortable" | "compact";

export interface DisplaySettings {
  refreshInterval: RefreshInterval;
  cardsPerRow: number;
  viewMode: ViewMode;
}

export interface NotificationSettings {
  enabled: boolean;
  cpuThreshold: number;
  memoryThreshold: number;
  diskThreshold: number;
}

export interface QuickLink {
  id: string;
  name: string;
  url: string;
  external?: boolean;
}

export interface DashboardSettings {
  display: DisplaySettings;
  notifications: NotificationSettings;
  quickLinks: QuickLink[];
  version: string;
}

// Default settings
export const DEFAULT_SETTINGS: DashboardSettings = {
  display: {
    refreshInterval: 30,
    cardsPerRow: 2,
    viewMode: "comfortable",
  },
  notifications: {
    enabled: false,
    cpuThreshold: 80,
    memoryThreshold: 85,
    diskThreshold: 90,
  },
  quickLinks: [
    {
      id: "appwrite",
      name: "Appwrite",
      url: "https://backend.firefetch.org/console",
      external: true,
    },
    {
      id: "uptime-kuma",
      name: "Uptime Kuma",
      url: "https://status.firefetch.org",
      external: true,
    },
  ],
  version: "1.0.0",
};

// LocalStorage key
const SETTINGS_KEY = "firefetch_dashboard_settings";

// Get settings from localStorage
export function getSettings(): DashboardSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(stored);
    // Merge with defaults to ensure new settings are added
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      display: { ...DEFAULT_SETTINGS.display, ...parsed.display },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
    };
  } catch (error) {
    console.error("Failed to load settings:", error);
    return DEFAULT_SETTINGS;
  }
}

// Save settings to localStorage
export function saveSettings(settings: DashboardSettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

// Update specific settings
export function updateDisplaySettings(settings: Partial<DisplaySettings>): void {
  const current = getSettings();
  saveSettings({
    ...current,
    display: { ...current.display, ...settings },
  });
}

export function updateNotificationSettings(settings: Partial<NotificationSettings>): void {
  const current = getSettings();
  saveSettings({
    ...current,
    notifications: { ...current.notifications, ...settings },
  });
}

export function updateQuickLinks(links: QuickLink[]): void {
  const current = getSettings();
  saveSettings({
    ...current,
    quickLinks: links,
  });
}

// Add a new quick link
export function addQuickLink(link: Omit<QuickLink, "id">): void {
  const current = getSettings();
  const newLink: QuickLink = {
    ...link,
    id: `custom-${Date.now()}`,
  };
  saveSettings({
    ...current,
    quickLinks: [...current.quickLinks, newLink],
  });
}

// Remove a quick link
export function removeQuickLink(id: string): void {
  const current = getSettings();
  saveSettings({
    ...current,
    quickLinks: current.quickLinks.filter((link) => link.id !== id),
  });
}

// Reset to defaults
export function resetSettings(): void {
  saveSettings(DEFAULT_SETTINGS);
}

// Format refresh interval for display
export function formatRefreshInterval(seconds: RefreshInterval): string {
  if (seconds === 0) return "Manual";
  if (seconds < 60) return `${seconds}s`;
  return `${seconds / 60}m`;
}
