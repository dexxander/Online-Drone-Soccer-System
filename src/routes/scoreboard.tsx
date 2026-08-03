import { createFileRoute } from '@tanstack/react-router';

/**
 * PLACEHOLDER: Live Scoreboard Screen
 * 
 * WHAT THIS FILE CHANGES:
 * Creates the dedicated, public-facing, fullscreen-friendly scoreboard view.
 * 
 * TODO FOR THE TEAM:
 * 1. Build a React component tailored for TV / Fullscreen display.
 * 2. Design with large typography, clear team logos, and high contrast colors.
 * 3. Connect to the WebSocket (`socketService`) to listen for 'scoreboard:sync' events.
 * 4. Instantly update the UI state when a score or penalty event arrives over WebSockets (no page refresh).
 */

export const Route = createFileRoute('/scoreboard')({
  component: ScoreboardPlaceholder,
});

function ScoreboardPlaceholder() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">Live Scoreboard</h1>
        <p className="text-xl text-slate-400">WebSocket integration pending...</p>
      </div>
    </div>
  );
}
