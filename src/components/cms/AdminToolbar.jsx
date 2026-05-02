import { useState, useEffect } from 'react';
import useAuthStore from '../../stores/useAuthStore';
import useCmsStore from './useCmsStore';

export default function AdminToolbar() {
  const { isAdmin } = useAuthStore();
  const { editMode, toggleEditMode } = useCmsStore();
  const [saving, setSaving] = useState(false);

  // ── Global link interceptor — blocks ALL navigation in edit mode (like Tilda) ──
  useEffect(() => {
    if (!isAdmin || !editMode) return;

    const blockNavigation = (e) => {
      // Find closest <a> from click target
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;

      // Allow clicks inside the CMS toolbar itself
      if (anchor.closest('.cms-toolbar')) return;

      // Allow external links (target="_blank")
      if (anchor.target === '_blank') return;

      // Block all other link navigation
      e.preventDefault();
      e.stopPropagation();
    };

    // Capture phase — intercepts before React Router handles it
    document.addEventListener('click', blockNavigation, true);
    return () => document.removeEventListener('click', blockNavigation, true);
  }, [isAdmin, editMode]);

  const [hidden, setHidden] = useState(false);

  if (!isAdmin) return null;

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="fixed top-2 left-2 z-[9000] w-8 h-8 bg-white border border-[#E0E0E0] rounded-lg shadow-sm flex items-center justify-center text-[#888] hover:text-[#333] hover:bg-[#F5F5F5] transition-colors"
        title="Arată toolbar CMS"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
    );
  }

  const handlePublish = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    // Switch to preview after publish
    if (editMode) toggleEditMode();
  };

  return (
    <>
      {/* ── Fixed toolbar — always at top (like Tilda) ── */}
      <div className="fixed top-0 left-0 right-0 z-[9000] cms-toolbar">
        <div className="h-[46px] bg-white border-b border-[#E0E0E0] flex items-center justify-between px-4 shadow-sm">

          {/* Left: breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <a href="/" className="text-[#888] hover:text-[#333] transition-colors flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <path d="M5.83 9.92H9.17V14.5H12.92L13 7.5H15L7.5 0L0 7.5H2.08V14.5H5.83V9.92Z" fill="currentColor"/>
              </svg>
              <span>fotocarte</span>
            </a>
            <span className="text-[#CCC]">/</span>
            <span className="text-[#333] font-medium">Homepage</span>
          </div>

          {/* Center: view toggle */}
          <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-lg p-0.5">
            <button
              onClick={() => { if (!editMode) toggleEditMode(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                editMode ? 'bg-white shadow text-[#333]' : 'text-[#888] hover:text-[#333]'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => { if (editMode) toggleEditMode(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                !editMode ? 'bg-white shadow text-[#333]' : 'text-[#888] hover:text-[#333]'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <a
              href="/admin_panel"
              className="text-xs text-[#888] hover:text-[#333] transition-colors px-2 py-1.5 rounded hover:bg-[#F5F5F5] no-underline"
            >
              Admin Panel
            </a>
            <button
              onClick={handlePublish}
              disabled={saving}
              className="px-4 py-1.5 bg-[#333] text-white text-xs font-bold rounded-lg hover:bg-[#555] transition-colors disabled:opacity-50"
            >
              {saving ? 'Se publica...' : 'Publish'}
            </button>
            <button
              onClick={() => setHidden(true)}
              className="ml-2 px-2 py-1.5 text-xs text-[#888] hover:text-[#333] hover:bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg transition-colors"
              title="Ascunde toolbar"
            >
              Ascunde ✕
            </button>
          </div>
        </div>

        {/* Edit mode indicator bar */}
        {editMode && (
          <div className="h-[3px] bg-[#3D6B5E]" />
        )}
      </div>

      {/* Edit mode floating indicator */}
      {editMode && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] bg-[#3D6B5E] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-[fadeIn_0.3s_ease]">
          <span className="w-2 h-2 rounded-full bg-white animate-[pulse_2s_ease-in-out_infinite]" />
          Edit Mode — click pe text sau imagini pentru a edita
        </div>
      )}
    </>
  );
}
