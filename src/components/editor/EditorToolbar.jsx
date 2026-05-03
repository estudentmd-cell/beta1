import useUIStore from '../../stores/useUIStore';

export default function EditorToolbar({ activePanel, onPanelChange }) {
  const tools = [
    {
      id: 'gallery',
      label: 'Galerie',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      ),
    },
    {
      id: 'templates',
      label: 'Colaje',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      id: 'autofill',
      label: 'Auto AI',
      action: () => useUIStore.getState().openModal('autoFill'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-[48px] shrink-0 bg-[#FAF8F5] border-r border-[#E8E4DB] flex flex-col items-center py-3 gap-1.5">
      {tools.map((tool) => {
        const isActive = activePanel === tool.id;
        return (
          <button key={tool.id}
            onClick={() => {
              if (tool.action) { tool.action(); return; }
              onPanelChange(isActive ? null : tool.id);
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive ? 'bg-[#3D6B5E] text-white shadow-sm' : 'text-[#8A8078] hover:bg-[#E8E4DB]'
            }`}
            title={tool.label}>
            {tool.icon}
          </button>
        );
      })}
    </div>
  );
}
