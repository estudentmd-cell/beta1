const TABS = [
  { key: 'projects', label: 'Proiecte' },
  { key: 'cart', label: 'De achitat' },
  { key: 'orders', label: 'Comenzi' },
];

export default function CabinetTabs({ activeTab, onTabChange, counts }) {
  return (
    <div className="flex border-b border-bdr mb-4">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = counts[tab.key] || 0;

        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 py-3 text-sm font-medium text-center relative transition-colors min-h-[44px]
              ${isActive ? 'text-tx-1 font-bold' : 'glass-btn-ghost text-tx-3'}`}
          >
            {tab.label}
            {count > 0 && (
              <span className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold
                ${isActive ? 'bg-ac text-white' : 'bg-bg-2 text-tx-3'}`}>
                {count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-ac rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
