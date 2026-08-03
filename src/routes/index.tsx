import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      
      {/* Navigation Bar */}
      <nav className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-500 tracking-tight">DroneSoccer</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors">Log In</Link>
              <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">Register Team</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow">
        <div className="relative bg-white dark:bg-slate-900 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="relative z-10 pb-8 bg-white dark:bg-slate-900 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32 pt-20 px-4 sm:px-6 lg:px-8">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-slate-900 dark:text-white sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">The Future of</span>{' '}
                  <span className="block text-blue-600 dark:text-blue-500">Competitive Sports</span>
                </h1>
                <p className="mt-3 text-base text-slate-500 dark:text-slate-400 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Manage your teams, follow live tournaments, and track real-time drone soccer scores on our unified competition platform.
                </p>
                <div className="mt-5 sm:mt-8 flex flex-col sm:flex-row sm:justify-center lg:justify-start gap-4">
                  <Link to="/scoreboard" className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-8 shadow-sm transition-all hover:shadow-md">
                    Live Scoreboard
                  </Link>
                  <Link to="/matches" className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 md:py-4 md:text-lg md:px-8 shadow-sm transition-all hover:shadow-md">
                    Referee Dashboard
                  </Link>
                  <Link to="/dashboard" className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-slate-300 dark:border-slate-700 text-base font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 md:py-4 md:text-lg md:px-8 transition-colors">
                    Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative Background */}
          <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 bg-slate-100 dark:bg-slate-800 hidden lg:flex items-center justify-center">
            <div className="text-slate-300 dark:text-slate-700">
               <svg className="w-64 h-64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
               </svg>
            </div>
          </div>
        </div>

        {/* Public Content - Standings & Matches (Mocks) */}
        <div className="bg-slate-50 dark:bg-slate-950 py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Tournament Highlights
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Mock Standings */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">Current Standings</h3>
                <div className="space-y-3">
                  {[
                    { team: "Aero Strikers", pts: 12, gd: "+8" },
                    { team: "Phantom Drones", pts: 9, gd: "+3" },
                    { team: "Velocity FC", pts: 7, gd: "-1" },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-400 w-4">{i+1}</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{row.team}</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-slate-500">GD: {row.gd}</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{row.pts} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock Matches */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">Upcoming Matches</h3>
                <div className="space-y-4">
                  {[
                    { t1: "Aero Strikers", t2: "Velocity FC", time: "Today, 14:00" },
                    { t1: "Phantom Drones", t2: "Sky Hawks", time: "Tomorrow, 09:30" },
                  ].map((match, i) => (
                    <div key={i} className="flex flex-col p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-500 mb-2">{match.time}</div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{match.t1}</span>
                        <span className="text-slate-400 font-bold mx-2">VS</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{match.t2}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500 dark:text-slate-400">
          &copy; 2026 Online Drone Soccer Management System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
