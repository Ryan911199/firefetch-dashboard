"use strict";
// Settings types and localStorage helpers
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = void 0;
exports.getSettings = getSettings;
exports.saveSettings = saveSettings;
exports.updateDisplaySettings = updateDisplaySettings;
exports.updateNotificationSettings = updateNotificationSettings;
exports.updateQuickLinks = updateQuickLinks;
exports.addQuickLink = addQuickLink;
exports.removeQuickLink = removeQuickLink;
exports.resetSettings = resetSettings;
exports.formatRefreshInterval = formatRefreshInterval;
// Default settings
exports.DEFAULT_SETTINGS = {
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
function getSettings() {
    if (typeof window === "undefined")
        return exports.DEFAULT_SETTINGS;
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (!stored)
            return exports.DEFAULT_SETTINGS;
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure new settings are added
        return {
            ...exports.DEFAULT_SETTINGS,
            ...parsed,
            display: { ...exports.DEFAULT_SETTINGS.display, ...parsed.display },
            notifications: { ...exports.DEFAULT_SETTINGS.notifications, ...parsed.notifications },
        };
    }
    catch (error) {
        console.error("Failed to load settings:", error);
        return exports.DEFAULT_SETTINGS;
    }
}
// Save settings to localStorage
function saveSettings(settings) {
    if (typeof window === "undefined")
        return;
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
    catch (error) {
        console.error("Failed to save settings:", error);
    }
}
// Update specific settings
function updateDisplaySettings(settings) {
    const current = getSettings();
    saveSettings({
        ...current,
        display: { ...current.display, ...settings },
    });
}
function updateNotificationSettings(settings) {
    const current = getSettings();
    saveSettings({
        ...current,
        notifications: { ...current.notifications, ...settings },
    });
}
function updateQuickLinks(links) {
    const current = getSettings();
    saveSettings({
        ...current,
        quickLinks: links,
    });
}
// Add a new quick link
function addQuickLink(link) {
    const current = getSettings();
    const newLink = {
        ...link,
        id: `custom-${Date.now()}`,
    };
    saveSettings({
        ...current,
        quickLinks: [...current.quickLinks, newLink],
    });
}
// Remove a quick link
function removeQuickLink(id) {
    const current = getSettings();
    saveSettings({
        ...current,
        quickLinks: current.quickLinks.filter((link) => link.id !== id),
    });
}
// Reset to defaults
function resetSettings() {
    saveSettings(exports.DEFAULT_SETTINGS);
}
// Format refresh interval for display
function formatRefreshInterval(seconds) {
    if (seconds === 0)
        return "Manual";
    if (seconds < 60)
        return `${seconds}s`;
    return `${seconds / 60}m`;
}
