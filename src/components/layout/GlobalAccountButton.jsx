import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';

const VISIBLE_ROUTES = ['phone', 'editor', 'cabinet'];

export default function GlobalAccountButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { clientName, logout } = useAuthStore();

  const segment = location.pathname.split('/').pop();
  if (!VISIBLE_ROUTES.includes(segment)) return null;

  const initial = clientName ? clientName.charAt(0).toUpperCase() : '?';

  return (
    <div className="fixed top-3 right-3 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-card shadow flex items-center justify-center border border-bdr hover:shadow-lg transition-shadow"
      >
        <span className="text-sm font-semibold text-ac">{initial}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-56 bg-card rounded shadow-lg border border-bdr z-50 animate-[modalIn_0.2s_ease] overflow-hidden">
            {clientName && (
              <div className="px-4 py-3 border-b border-bdr bg-bg">
                <p className="text-sm font-semibold text-tx-1">{clientName}</p>
              </div>
            )}
            <button
              onClick={() => { navigate('/app/cabinet'); setOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm hover:bg-bg flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8M8 12h8M8 17h4"/></svg>
              Comenzile mele
            </button>
            <button
              onClick={() => { navigate('/app/cabinet'); setOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm hover:bg-bg flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Comenzi în lucru
            </button>
            <button
              onClick={() => { navigate('/app/editor'); setOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm hover:bg-bg flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              Comandă nouă
            </button>
            {clientName && (
              <button
                onClick={() => { logout(); navigate('/app/phone'); setOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-danger-light text-danger flex items-center gap-2 border-t border-bdr"
              >
                Deconectare
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
