import React from 'react';

/**
 * PLACEHOLDER: Development Mode Role Switcher
 * 
 * WHAT THIS FILE CHANGES:
 * Adds a floating UI element to let developers/testers instantly switch roles without logging in.
 * 
 * TODO FOR THE TEAM:
 * 1. Create a floating dropdown component (bottom right corner).
 * 2. Make it visible ONLY in development mode (`import.meta.env.DEV`).
 * 3. Provide buttons: Admin, Referee, Team Manager, Viewer.
 * 4. On click, update the `AuthService` mock user state and force a context re-render to grant immediate permissions.
 */

export function RoleSwitcher() {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
      <h3 className="text-sm font-semibold mb-2">Dev Role Switcher</h3>
      <p className="text-xs text-slate-500">Implementation pending...</p>
    </div>
  );
}
