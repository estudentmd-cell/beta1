import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrdersAsync, updateOrderStatus } from '../../utils/adminData';
import { db } from '../../firebase/config';

const STAGES = [
  { id: 'approved_print', label: 'Gata de tipar', color: 'bg-amber-500' },
  { id: 'in_print', label: 'Trimise la tipar', color: 'bg-blue-500' },
  { id: 'print_ready', label: 'Primite de la tipar', color: 'bg-purple-500' },
  { id: 'shipped', label: 'Expediate', color: 'bg-cyan-500' },
  { id: 'delivered', label: 'Livrate', color: 'bg-green-600' },
];

const NEXT_STATUS = {
  approved_print: { status: 'in_print', label: 'Trimis la tipar', detail: 'Comandă trimisă la tipografie' },
  in_print: { status: 'print_ready', label: 'Primit de la tipar', detail: 'Album primit de la tipografie' },
  print_ready: { status: 'shipped', label: 'Expediat', detail: 'Colet expediat către client' },
  shipped: { status: 'delivered', label: 'Livrat', detail: 'Comandă livrată clientului' },
};

function getDateField(status) {
  switch (status) {
    case 'in_print': return 'sentToPrintAt';
    case 'print_ready': return 'receivedFromPrintAt';
    case 'shipped': return 'shippedAt';
    case 'delivered': return 'deliveredAt';
    default: return null;
  }
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}z`;
}

export default function DeTiparit() {
  const [allOrders, setAllOrders] = useState([]);
  const [filter, setFilter] = useState('approved_print');
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    getAllOrdersAsync().then(all => {
      const production = all.filter(o =>
        ['approved_print', 'in_print', 'print_ready', 'shipped', 'delivered'].includes(o.status)
      );
      setAllOrders(production);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  // Count per stage
  const stageCounts = {};
  STAGES.forEach(s => { stageCounts[s.id] = allOrders.filter(o => o.status === s.id).length; });

  // Filtered orders
  const filtered = allOrders
    .filter(o => o.status === filter)
    .sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));

  // Toggle select
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(o => o.id)));
  };

  // Bulk action
  const handleBulkAction = async () => {
    const next = NEXT_STATUS[filter];
    if (!next || selected.size === 0) return;
    if (!confirm(`Schimbi ${selected.size} comenzi în „${next.label}"?`)) return;

    const now = new Date().toISOString();
    const dateField = getDateField(next.status);
    for (const id of selected) {
      await updateOrderStatus(id, next.status, next.detail);
      if (db) {
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          const update = { status: next.status, updated_at: now };
          if (dateField) update[dateField] = now;
          await setDoc(doc(db, 'orders', id), update, { merge: true });
          await setDoc(doc(db, 'projects', id), update, { merge: true });
        } catch {}
      }
    }
    setFeedback(`✓ ${selected.size} comenzi → ${next.label}`);
    setSelected(new Set());
    setTimeout(() => setFeedback(''), 3000);
    load();
  };

  const nextAction = NEXT_STATUS[filter];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Producție & Livrare</h2>
        <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg">
          ↻ Refresh
        </button>
      </div>

      {/* Stage filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STAGES.map(s => (
          <button key={s.id} onClick={() => { setFilter(s.id); setSelected(new Set()); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === s.id
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
            {s.label}
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              filter === s.id ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {stageCounts[s.id] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-medium">
          {feedback}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && nextAction && (
        <div className="flex items-center justify-between bg-gray-900 text-white px-5 py-3 rounded-xl">
          <span className="text-sm font-medium">{selected.size} comenzi selectate</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(new Set())} className="text-xs text-white/60 hover:text-white">Deselectează</button>
            <button onClick={handleBulkAction}
              className="px-4 py-2 bg-white text-gray-900 text-sm font-bold rounded-lg hover:bg-gray-100 transition">
              {nextAction.label} →
            </button>
          </div>
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Se încarcă...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-3">✓</div>
          <p className="text-gray-400 text-sm">Nicio comandă în această etapă</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Select all header */}
          <div className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50/50">
            <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
              onChange={selectAll} className="w-4 h-4 rounded border-gray-300 accent-[#3D6B5E]" />
            <span className="text-xs text-gray-400 font-medium">Selectează toate ({filtered.length})</span>
          </div>

          <div className="divide-y divide-gray-50">
            {filtered.map(o => {
              const isSelected = selected.has(o.id);
              const coverImg = o.coverTemplate?.coverStyle?.bgImage || o.coverTemplate?.coverStyle?.designSquare;
              const addr = typeof o.address === 'object'
                ? `${o.address.street || ''}, ${o.address.city || ''}`.replace(/^, |, $/g, '')
                : (o.address || '—');

              return (
                <div key={o.id} className={`flex items-center gap-4 px-5 py-3 transition ${isSelected ? 'bg-[#3D6B5E]/5' : 'hover:bg-gray-50'}`}>
                  {/* Checkbox */}
                  <input type="checkbox" checked={isSelected}
                    onChange={() => toggleSelect(o.id)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#3D6B5E] shrink-0" />

                  {/* Cover thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {coverImg ? (
                      <img src={coverImg} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">📖</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{o.clientName || '—'}</span>
                      <span className="text-[10px] font-mono text-[#3D6B5E]">{o.orderNumber || `#${o.id}`}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {o.productConfig?.name || 'Album'} · {o.productConfig?.format || ''} · {o.productConfig?.initialPages || '—'} pag
                    </div>

                    {/* Delivery info — expanded for print_ready stage */}
                    {filter === 'print_ready' ? (() => {
                      const phone = (o.clientPhone || '').replace(/\+373\s?/, '').replace(/^0/, '');
                      const city = typeof o.address === 'object' ? (o.address.city || '') : (o.city || '');
                      const addrOnly = typeof o.address === 'object' ? (o.address.street || addr) : (o.address || addr);
                      const copyField = (val, label) => {
                        navigator.clipboard.writeText(val);
                        setFeedback(`✓ Copiat ${label}`);
                        setTimeout(() => setFeedback(''), 1500);
                      };
                      return (
                        <div className="mt-2 bg-gray-50 rounded-lg p-2.5 text-xs space-y-1.5" onClick={e => e.stopPropagation()}>
                          {city && <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">📍 {city}</div>}
                          <CopyRow label="Nume" value={o.clientName || '—'} onCopy={() => copyField(o.clientName || '', 'numele')} />
                          <CopyRow label="Telefon" value={phone || '—'} onCopy={() => copyField(phone, 'telefonul')} />
                          <CopyRow label="Adresa" value={addrOnly || '—'} onCopy={() => copyField(addrOnly, 'adresa')} />
                        </div>
                      );
                    })() : (
                      <div className="text-xs text-gray-400 mt-0.5">
                        📍 {addr} · 📞 {o.clientPhone || '—'}
                      </div>
                    )}

                    {/* Timeline dates */}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400 flex-wrap">
                      {o.approvedAt && <span>✓ Aprobat: {formatDate(o.approvedAt)}</span>}
                      {o.sentToPrintAt && <span>🖨 Tipar: {formatDate(o.sentToPrintAt)}</span>}
                      {o.receivedFromPrintAt && <span>📦 Primit: {formatDate(o.receivedFromPrintAt)}</span>}
                      {o.shippedAt && <span>🚚 Expediat: {formatDate(o.shippedAt)}</span>}
                      {o.deliveredAt && <span>✅ Livrat: {formatDate(o.deliveredAt)}</span>}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex flex-col gap-1.5 shrink-0 items-end">
                    {o.priceTotal > 0 && <div className="text-sm font-bold text-gray-900">{o.priceTotal} lei</div>}
                    <div className="text-[10px] text-gray-400 mb-1">{timeAgo(o.updatedAt || o.createdAt)}</div>

                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {/* Export */}
                      {filter === 'approved_print' && (
                        <button onClick={async (e) => {
                          e.stopPropagation();
                          // Mark as exported in Firestore
                          if (db) {
                            const { doc, setDoc } = await import('firebase/firestore');
                            await setDoc(doc(db, 'orders', o.id), { exported: true, exportedAt: new Date().toISOString() }, { merge: true });
                            await setDoc(doc(db, 'projects', o.id), { exported: true, exportedAt: new Date().toISOString() }, { merge: true });
                          }
                          navigate(`/admin_panel/editor/${o.id}`);
                        }}
                          className={`text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                            o.exported ? 'text-green-700 bg-green-100' : 'text-white bg-green-600 hover:bg-green-700'
                          }`}>
                          {o.exported ? '✓ Exportat' : 'Export'}
                        </button>
                      )}
                      {/* Editor */}
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/admin_panel/editor/${o.id}`); }}
                        className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg hover:bg-gray-200 transition whitespace-nowrap">
                        Editor
                      </button>
                      {/* Detalii */}
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/admin_panel/orders/${o.id}`); }}
                        className="text-[10px] font-medium text-gray-400 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition whitespace-nowrap">
                        ⋯
                      </button>
                    </div>

                    {/* Status change — blocked until exported for approved_print */}
                    {nextAction && (() => {
                      const needsExport = filter === 'approved_print' && !o.exported;
                      return (
                      <button
                        disabled={needsExport}
                        title={needsExport ? 'Exportă mai întâi albumul' : ''}
                        onClick={async (e) => {
                        e.stopPropagation();
                        if (needsExport) return;
                        const now = new Date().toISOString();
                        const df = getDateField(nextAction.status);
                        await updateOrderStatus(o.id, nextAction.status, nextAction.detail);
                        if (db) {
                          const { doc, setDoc } = await import('firebase/firestore');
                          const update = { status: nextAction.status, updated_at: now };
                          if (df) update[df] = now;
                          await setDoc(doc(db, 'orders', o.id), update, { merge: true });
                          await setDoc(doc(db, 'projects', o.id), update, { merge: true });
                        }
                        load();
                      }}
                        className={`text-xs font-semibold px-3 py-2 rounded-lg transition whitespace-nowrap w-full text-center ${
                          needsExport
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'text-white bg-[#3D6B5E] hover:bg-[#2f5549]'
                        }`}>
                        {needsExport ? 'Exportă mai întâi' : `${nextAction.label} →`}
                      </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CopyRow({ label, value, onCopy }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };
  return (
    <div className="flex items-center justify-between group cursor-pointer hover:bg-white rounded px-1 -mx-1 transition"
      onClick={handleCopy}>
      <div>
        <span className="text-gray-400">{label}: </span>
        <span className="font-semibold text-gray-900">{value}</span>
      </div>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded transition ${
        copied ? 'text-green-600 bg-green-50' : 'text-gray-300 group-hover:text-[#3D6B5E]'
      }`}>
        {copied ? '✓' : '📋'}
      </span>
    </div>
  );
}
