import { useState, useEffect } from 'react';
import { getEditHistory } from '../../utils/editHistory';

const ACTION_ICONS = {
  photos_uploaded: '📷',
  layout_changed: '🔀',
  photo_swapped: '🔄',
  crop_changed: '✂️',
  project_saved: '💾',
  admin_viewed: '👁️',
  admin_edited: '✏️',
  order_created: '🛒',
};

const ROLE_COLORS = {
  customer: '#3D6B5E',
  admin: '#8B5CF6',
};

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Acum';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}z`;
}

export default function EditHistory({ projectId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    getEditHistory(projectId).then((events) => {
      setHistory(events);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <div className="text-xs text-gray-400 py-2">Se incarca istoricul...</div>;
  }

  if (history.length === 0) {
    return <div className="text-xs text-gray-400 py-2">Nicio modificare inregistrata</div>;
  }

  const shown = expanded ? history : history.slice(0, 5);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Istoric editari</h4>
        <span className="text-[10px] text-gray-400">{history.length} evenimente</span>
      </div>

      <div className="space-y-0.5">
        {shown.map((evt, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-sm mt-0.5">{ACTION_ICONS[evt.action] || '📝'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700">{evt.detail}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{
                    color: ROLE_COLORS[evt.role] || '#666',
                    background: (ROLE_COLORS[evt.role] || '#666') + '15',
                  }}
                >
                  {evt.user || (evt.role === 'admin' ? 'Admin' : 'Client')}
                </span>
                <span className="text-[10px] text-gray-400">{timeAgo(evt.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {history.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-[#3D6B5E] hover:underline mt-1"
        >
          {expanded ? 'Arata mai putin' : `Arata toate (${history.length})`}
        </button>
      )}
    </div>
  );
}
