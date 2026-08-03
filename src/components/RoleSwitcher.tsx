import { useAuth } from "../lib/auth";
import type { Role } from "../lib/types";

export function RoleSwitcher() {
  const { setDevRole, role } = useAuth();

  // Only render in development mode
  if (!import.meta.env.DEV) return null;

  const roles: Role[] = ["admin", "referee", "coach", "player", "viewer"];

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 w-64">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Dev Role Switcher</h3>
        <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">DEV ONLY</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Instantly switch your permissions without logging in.
      </p>
      
      <div className="grid grid-cols-2 gap-2">
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => setDevRole(r)}
            className={`text-xs px-2 py-1.5 rounded-md font-medium transition-colors ${
              role === r 
                ? "bg-blue-600 text-white shadow-sm" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
