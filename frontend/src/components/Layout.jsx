import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Home' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/analysis', label: 'Analysis Details' },
  { to: '/report', label: 'Report Export' }
];

export default function Layout({ children }) {
  const loc = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <Link to="/" className="font-display font-semibold text-lg text-primary-600">
            SalesSight
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="sm:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
          <nav className={`absolute sm:relative top-14 left-0 right-0 sm:top-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2 bg-white sm:bg-transparent border-b sm:border-0 border-slate-200 sm:border-0 py-2 sm:py-0 ${menuOpen ? 'flex' : 'hidden sm:flex'}`}>
            {nav.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`px-4 sm:px-3 py-3 sm:py-2 rounded-lg text-sm font-medium transition-colors ${
                  loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to))
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-sm text-slate-500">
        SalesSight © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
