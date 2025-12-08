"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  global?: boolean; // Works on all pages
}

interface KeyboardShortcutsProps {
  children: ReactNode;
  onRefresh?: () => void;
}

export function KeyboardShortcuts({ children, onRefresh }: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: "?",
      description: "Show keyboard shortcuts",
      action: () => setShowHelp(!showHelp),
      global: true,
    },
    {
      key: "r",
      description: "Refresh data",
      action: () => onRefresh?.(),
      global: true,
    },
    {
      key: "h",
      description: "Go to home / dashboard",
      action: () => router.push("/"),
      global: true,
    },
    {
      key: "s",
      description: "Go to services",
      action: () => router.push("/services"),
      global: true,
    },
    {
      key: "d",
      description: "Go to docker containers",
      action: () => router.push("/docker"),
      global: true,
    },
    {
      key: "m",
      description: "Go to metrics",
      action: () => router.push("/metrics"),
      global: true,
    },
    {
      key: "Escape",
      description: "Close modals / help",
      action: () => setShowHelp(false),
      global: true,
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape to work in inputs
        if (e.key === "Escape") {
          target.blur();
          setShowHelp(false);
        }
        return;
      }

      // Find matching shortcut
      const shortcut = shortcuts.find((s) => {
        if (s.key === "?") {
          return e.key === "?" || (e.shiftKey && e.key === "/");
        }
        return s.key.toLowerCase() === e.key.toLowerCase();
      });

      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, onRefresh, router]);

  return (
    <>
      {children}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-background/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Keyboard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-sm text-text-muted">Navigate faster with your keyboard</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 rounded-lg hover:bg-border transition-colors"
              >
                <X className="h-5 w-5 text-text-muted" />
              </button>
            </div>

            {/* Shortcuts List */}
            <div className="p-6 max-h-[500px] overflow-y-auto scrollbar-thin">
              <div className="space-y-3">
                {shortcuts
                  .filter((s) => s.key !== "Escape") // Don't show escape in list
                  .map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 hover:border-border transition-colors"
                    >
                      <span className="text-sm text-text-secondary">
                        {shortcut.description}
                      </span>
                      <kbd className="px-3 py-1.5 text-sm font-semibold text-text-primary bg-surface border border-border rounded-lg shadow-sm">
                        {shortcut.key === "?" ? "?" : shortcut.key.toUpperCase()}
                      </kbd>
                    </div>
                  ))}
              </div>

              {/* Tips */}
              <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <h3 className="text-sm font-semibold text-primary mb-2">Pro Tips</h3>
                <ul className="space-y-1 text-xs text-text-muted">
                  <li>• Shortcuts work globally unless you're typing in an input field</li>
                  <li>• Press <kbd className="px-1 py-0.5 bg-surface border border-border rounded text-text-primary">Esc</kbd> to close this modal or blur inputs</li>
                  <li>• Press <kbd className="px-1 py-0.5 bg-surface border border-border rounded text-text-primary">?</kbd> anytime to toggle this help</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-background/50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowHelp(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Keyboard shortcut indicator component (optional - can be placed in footer)
export function KeyboardShortcutIndicator() {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Show indicator for first-time users
    const hasSeenIndicator = localStorage.getItem("keyboard-shortcuts-seen");
    if (!hasSeenIndicator) {
      setShowIndicator(true);
      localStorage.setItem("keyboard-shortcuts-seen", "true");

      // Auto-hide after 5 seconds
      setTimeout(() => setShowIndicator(false), 5000);
    }
  }, []);

  if (!showIndicator) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 animate-in slide-in-from-bottom-4">
      <div className="bg-surface border border-primary/50 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Keyboard className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              Keyboard Shortcuts Available
            </h3>
            <p className="text-xs text-text-muted mb-2">
              Press <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-text-primary">?</kbd> to see all shortcuts
            </p>
          </div>
          <button
            onClick={() => setShowIndicator(false)}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
