import { Link, useLocation } from 'react-router-dom';
import { Terminal, Server, Home, LayoutDashboard } from 'lucide-react';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const showTopHeader = !location.pathname.startsWith('/enterprise');

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Fixed Header with Navigation */}
      {showTopHeader && (
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-cyan-400/15">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            {/* Navigation Menu */}
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1">
              <Link
                to="/ssh-terminal"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive('/ssh-terminal')
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-300/30 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-300 border border-transparent hover:text-white hover:border-cyan-300/20 hover:bg-slate-800/50'
                }`}
              >
                <Terminal className="w-5 h-5" />
                <span className="font-medium whitespace-nowrap">SSH Terminal</span>
              </Link>

              <Link
                to="/config-switch"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive('/config-switch')
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-300/30 shadow-lg shadow-amber-500/10'
                    : 'text-slate-300 border border-transparent hover:text-white hover:border-amber-300/20 hover:bg-slate-800/50'
                }`}
              >
                <Server className="w-5 h-5" />
                <span className="font-medium whitespace-nowrap">ConfigSwitch</span>
              </Link>

              <Link
                to="/enterprise"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive('/enterprise')
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-300/30 shadow-lg shadow-emerald-500/10'
                    : 'text-slate-300 border border-transparent hover:text-white hover:border-emerald-300/20 hover:bg-slate-800/50'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="font-medium whitespace-nowrap">Enterprise</span>
              </Link>
            </div>

            {/* Home Button */}
            <a
              href="/enterprise"
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600/60 rounded-lg transition-colors duration-200 whitespace-nowrap"
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Home</span>
            </a>
          </div>
        </div>
      </div>
      )}

      {/* Main Content with padding for fixed header */}
      <div className={showTopHeader ? 'pt-16' : ''}>
        {children}
      </div>
    </div>
  );
}
