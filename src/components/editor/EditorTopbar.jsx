import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useEditorStore from '../../stores/useEditorStore';
import useProjectStore from '../../stores/useProjectStore';
import useAuthStore from '../../stores/useAuthStore';
import useUIStore from '../../stores/useUIStore';
import { getProject } from '../../utils/projectStorage';
import { getPagePrice } from '../../utils/pricing';
import { useLivePricing } from '../../hooks/usePricingAdmin';
import { formatPrice } from '../../utils/format';
import { renderAllSpreads } from '../../utils/renderEngine';
import PagePicker from './PagePicker';

function DesktopSaveIndicator({ localSaveState }) {
  const autoSaveStatus = useEditorStore((s) => s.saveStatus);
  const status = localSaveState === 'saved' ? 'saved' : localSaveState === 'saving' ? 'saving' : autoSaveStatus;
  if (status === 'saving') return <span className="text-[10px] font-semibold mr-1 text-tx-4 animate-pulse">Se salvează...</span>;
  if (status === 'saved') return <span className="text-[10px] font-semibold mr-1 text-ok">✓ Salvat</span>;
  return <span className="text-[10px] mr-1" />;
}

export default function EditorTopbar({ onSave }) {
  const navigate = useNavigate();
  const { productConfig, currentSpreadCount, currentProjectId } = useProjectStore();
  const { clientName } = useAuthStore();
  const { addToast, openModal } = useUIStore();
  const { guides, toggleGuides, spreads, currentSpread } = useEditorStore();
  const undoStack = useEditorStore((s) => s.undoStack);
  const redoStack = useEditorStore((s) => s.redoStack);
  const toggleFullBleed = useEditorStore((s) => s.toggleFullBleed);
  const spread = useEditorStore((s) => s.spreads[s.currentSpread]);
  const isFullBleed = !spread?.full?.bounds || (spread?.full?.bounds?.top === 0 && spread?.full?.bounds?.bottom === 0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [renderState, setRenderState] = useState('idle'); // idle | rendering | done

  const pages = currentSpreadCount * 2 || productConfig.initialPages;
  const { getPrice: liveGetPrice } = useLivePricing();
  const standardPrice = liveGetPrice ? liveGetPrice(productConfig.format, pages, productConfig.slug) : getPagePrice(productConfig.format, pages, productConfig.slug);
  const price = productConfig._offerId ? (productConfig.basePrice || standardPrice) : standardPrice;

  const handleSave = async () => {
    setSaveState('saving');
    if (onSave) await onSave();
    setSaveState('saved');
    addToast('Salvat!');
    setTimeout(() => setSaveState('idle'), 2500);
  };

  const handlePageSelect = (newPages) => {
    useProjectStore.getState().setSpreadCount(newPages / 2);
    // Resize actual spreads in editor to match new page count
    useEditorStore.getState().resizeSpreads(newPages);
    // Update product config
    useProjectStore.setState((s) => ({
      productConfig: { ...s.productConfig, initialPages: newPages },
    }));
  };

  return (
    <div className="h-11 border-b border-bdr flex items-center px-3 gap-1 shrink-0 z-30 relative" style={{ background: 'rgba(255,255,255,0.80)', backdropFilter: 'blur(12px) saturate(160%)', WebkitBackdropFilter: 'blur(12px) saturate(160%)' }}>
      {/* Logo + Back */}
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm font-serif font-bold mr-1 hover:opacity-70 transition-opacity">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        fotocarte<span className="text-[#3D6B5E]">.</span>
      </button>

      {/* Project ID badge */}
      {currentProjectId && (
        <span className="text-[10px] text-tx-4 bg-bg-2 px-2 py-0.5 rounded font-mono tracking-wide hidden lg:inline" title={`Album: ${currentProjectId}`}>
          {currentProjectId}
        </span>
      )}

      <div className="w-px h-5 bg-bdr mx-1" />

      {/* Undo/Redo */}
      <button
        onClick={() => useEditorStore.getState().undo()}
        disabled={undoStack.length === 0}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-bg-2 transition-colors disabled:opacity-20"
        title="Anulează (Ctrl+Z)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14l-4-4 4-4" /><path d="M5 10h11a4 4 0 0 1 0 8h-1" />
        </svg>
      </button>
      <button
        onClick={() => useEditorStore.getState().redo()}
        disabled={redoStack.length === 0}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-bg-2 transition-colors disabled:opacity-20"
        title="Refă (Ctrl+Y)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 14l4-4-4-4" /><path d="M19 10H8a4 4 0 0 0 0 8h1" />
        </svg>
      </button>

      <div className="w-px h-5 bg-bdr mx-1" />

      {/* Full Bleed Toggle */}
      {!spread?.isCover && (
        <button
          onClick={() => toggleFullBleed()}
          className={`p-1.5 rounded-lg transition-all ${
            isFullBleed ? 'bg-[#3D6B5E] text-white' : 'hover:bg-gray-100 text-gray-600'
          }`}
          title={isFullBleed ? 'Adaugă margine' : 'Fără margine (full bleed)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="1" />
            {isFullBleed ? (
              <>
                <path d="M3 3L8 8M21 3L16 8M3 21L8 16M21 21L16 16" />
              </>
            ) : (
              <rect x="6" y="6" width="12" height="12" rx="0.5" strokeDasharray="2 2" />
            )}
          </svg>
        </button>
      )}

      <div className="w-px h-5 bg-bdr mx-1" />

      {/* Format tag */}
      <span className="text-[11px] font-bold text-tx-1 whitespace-nowrap">{productConfig.name}
        <span className="ml-1 text-[9px] font-bold bg-ac/10 text-ac px-1.5 py-0.5 rounded-full uppercase">{productConfig.format}</span>
      </span>

      {/* Center: pages + price picker */}
      <div className="flex-1 flex justify-center">
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="relative flex items-center gap-2 text-[12px] font-medium hover:bg-bg rounded px-2 py-1 transition-colors"
        >
          <span className="text-tx-3">{pages} pagini</span>
          <span className="w-px h-3 bg-bdr" />
          <span className="font-bold text-tx-1">{formatPrice(price)}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tx-4"><path d="M6 9l6 6 6-6" /></svg>
          {pickerOpen && <PagePicker onClose={() => setPickerOpen(false)} onSelect={handlePageSelect} />}
        </button>
      </div>

      {/* Save status — from global store */}
      <DesktopSaveIndicator localSaveState={saveState} />

      <div className="w-px h-5 bg-bdr mx-1" />

      {/* Spread counter */}
      <span className="text-[10px] text-tx-3 font-semibold">{currentSpread + 1}/{spreads.length}</span>

      <div className="w-px h-5 bg-bdr mx-1" />

      {/* Save project */}
      <button
        onClick={async () => {
          if (onSave) await onSave();
          window.dispatchEvent(new CustomEvent('openSavePopup'));
        }}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-all active:scale-[0.97]"
        style={{ background: 'rgba(0,0,0,0.05)', color: '#2E2E2E', fontFamily: 'Outfit, sans-serif' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.09)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg>
        <span className="hidden md:inline">Salvează</span>
      </button>

      {/* Account */}
      <button
        onClick={() => {
          const { user, authMethod } = useAuthStore.getState();
          const hasIdentity = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
          navigate(hasIdentity ? '/app/cabinet' : '/app/login?returnTo=/app/editor');
        }}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-semibold transition-all"
        style={{ background: 'rgba(0,0,0,0.05)', color: '#2E2E2E', fontFamily: 'Outfit, sans-serif' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.09)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
      >
        <div className="w-5 h-5 rounded-full bg-[#3D6B5E] text-white flex items-center justify-center text-[9px] font-bold">
          {clientName ? clientName.charAt(0).toUpperCase() : '?'}
        </div>
        <span className="hidden sm:inline">Contul meu</span>
      </button>

      {/* Order — hidden in approval mode */}
      {(() => {
        const project = getProject(currentProjectId);
        const isApproval = project && (project.status === 'pending_client_approval' || project.status === 'pending_approval');
        if (isApproval) return null;
        return (
          <button
            onClick={() => {
              const { chosenPath } = useProjectStore.getState();
              const { spreads: sp } = useEditorStore.getState();
              const hasPhotosOnSpreads = sp.some(s => s.photos?.length > 0 || s.full || s.left || s.right);

              if (chosenPath !== 'designer' && !hasPhotosOnSpreads) {
                openModal('servicePicker');
                return;
              }

              if (onSave) onSave();
              import('../../utils/errorTracker').then(({ trackStep }) => trackStep('click_order')).catch(() => {});
              navigate('/app/checkout');
            }}
            className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-[12px] font-semibold text-white bg-[#1C1C1E] hover:bg-[#333] active:scale-[0.97] transition-all"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            <span className="hidden md:inline">Comandă albumul</span>
            <span className="md:hidden">Comandă</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        );
      })()}
    </div>
  );
}
