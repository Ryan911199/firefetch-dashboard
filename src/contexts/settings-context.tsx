"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  DashboardSettings,
  DisplaySettings,
  NotificationSettings,
  QuickLink,
  getSettings as getLocalSettings,
  saveSettings as saveLocalSettings,
  DEFAULT_SETTINGS,
} from "@/lib/settings";
import {
  getSettings as getAppwriteSettings,
  saveSettings as saveAppwriteSettings,
} from "@/lib/appwrite-service";

interface SettingsContextType {
  settings: DashboardSettings;
  updateDisplay: (settings: Partial<DisplaySettings>) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  updateQuickLinks: (links: QuickLink[]) => void;
  addQuickLink: (link: Omit<QuickLink, "id">) => void;
  removeQuickLink: (id: string) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load settings from Appwrite first, fallback to localStorage
    async function loadSettings() {
      try {
        // Try to load from Appwrite
        const appwriteSettings = await getAppwriteSettings();

        if (appwriteSettings) {
          console.log('Loaded settings from Appwrite');
          setSettings(appwriteSettings);
          // Sync to localStorage as backup
          saveLocalSettings(appwriteSettings);
        } else {
          // Fallback to localStorage
          console.log('Loading settings from localStorage (Appwrite unavailable)');
          const localSettings = getLocalSettings();
          setSettings(localSettings);
        }
      } catch (error) {
        console.error('Failed to load settings from Appwrite:', error);
        // Fallback to localStorage
        const localSettings = getLocalSettings();
        setSettings(localSettings);
      } finally {
        setMounted(true);
      }
    }

    loadSettings();
  }, []);

  // Helper function to save settings to both Appwrite and localStorage
  const persistSettings = async (newSettings: DashboardSettings) => {
    // Always save to localStorage immediately
    saveLocalSettings(newSettings);

    // Try to save to Appwrite asynchronously (don't block on this)
    try {
      await saveAppwriteSettings(newSettings);
    } catch (error) {
      console.error('Failed to sync settings to Appwrite:', error);
      // Continue anyway - localStorage is our fallback
    }
  };

  const updateDisplay = (newSettings: Partial<DisplaySettings>) => {
    const updated = {
      ...settings,
      display: { ...settings.display, ...newSettings },
    };
    setSettings(updated);
    persistSettings(updated);
  };

  const updateNotifications = (newSettings: Partial<NotificationSettings>) => {
    const updated = {
      ...settings,
      notifications: { ...settings.notifications, ...newSettings },
    };
    setSettings(updated);
    persistSettings(updated);
  };

  const updateQuickLinks = (links: QuickLink[]) => {
    const updated = {
      ...settings,
      quickLinks: links,
    };
    setSettings(updated);
    persistSettings(updated);
  };

  const addQuickLink = (link: Omit<QuickLink, "id">) => {
    const newLink: QuickLink = {
      ...link,
      id: `custom-${Date.now()}`,
    };
    const updated = {
      ...settings,
      quickLinks: [...settings.quickLinks, newLink],
    };
    setSettings(updated);
    persistSettings(updated);
  };

  const removeQuickLink = (id: string) => {
    const updated = {
      ...settings,
      quickLinks: settings.quickLinks.filter((link) => link.id !== id),
    };
    setSettings(updated);
    persistSettings(updated);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    persistSettings(DEFAULT_SETTINGS);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateDisplay,
        updateNotifications,
        updateQuickLinks,
        addQuickLink,
        removeQuickLink,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
