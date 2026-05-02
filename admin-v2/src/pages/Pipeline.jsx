import { ORDERS } from '../data/mock';
import StatusBadge from '../components/StatusBadge';

const COLUMNS = [
  { status: 'awaiting_photos',  label: 'Poze',         color: 'border-yellow-300' },
  { status: 'awaiting_payment', label: 'Plată',        color: 'border-orange-300' },
  { status: 'making_layout',    label: 'Maketă',       color: 'border-blue-300' },
  { status: 'client_reviewing', label: 'Aprobare',     color: 'border-violet-300' },
  { status: 'ready_to_print',   label: 'Gata tipar',   color: 'border-green-300' },
  { status: 'printing',         label: 'Tipar',        color: 'border-red-300' },
  { status: 'delivered',        label: 'Livrat',       color: 'border-emerald-300' },
  { status: 'post_delivery',    label: 'Re-vânzare',   color: 'border-amber-400' },
];

export default function Pipeline() {
  // Group orders into "close enough" columns
  function getColumn(status) {
    if (status === 'awaiting_photos' || status === 'abandoned') return 'awaiting_photos';
    if (status === 'awaiting_payment') return 'awaiting_payment';
    if (status === 'making_layout' || status === 'client_editing' || status === 'revision_requested') return 'making_layout';
    if (status === 'client_reviewing') return 'client_reviewing';
    if (status === 'ready_to_print') return 'ready_to_print';
    if (status === 'printing' || status === 'printing_urgent' || status === 'packaging' || status === 'ready_to_ship') return 'printing';
    if (status === 'delivered') return 'delivered';
    if (status === 'post_delivery') return 'post_delivery';
    return 'awaiting_photos';
  }

  const grouped = {};
  COLUMNS.forEach((c) => { grouped[c.status] = []; });
  ORDERS.forEach((o) => {
    const col = getColumn(o.status);
    if (grouped[col]) grouped[col].push(o);
  });

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Pipeline</h2>
      <p className="text-sm text-gray-500 mb-6">Vizualizare Kanban — toți clienții la fiecare etapă</p>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col.status} className={`min-w-[200px] w-[200px] shrink-0 border-t-4 ${col.color} bg-white rounded-xl shadow-sm`}>
            <div className="px-3 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">{col.label}</span>
                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {grouped[col.status].length}
                </span>
              </div>
            </div>
            <div className="p-2 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Re-vânzare column: special cards from delivered clients */}
              {col.status === 'post_delivery' && grouped['post_delivery'].length === 0 && grouped['delivered'].length > 0 && (
                grouped['delivered'].map((o) => (
                  <div key={o.id + '-resell'} className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-gray-500">{o.id}</span>
                      <span className="text-[9px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded font-bold">FOLLOW-UP</span>
                    </div>
                    <div className="text-xs font-semibold text-gray-800">{o.clientName}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">A comandat: {o.productName || o.product}</div>
                    <div className="text-[10px] text-gray-500">Livrat: {o.dates.delivered || '—'}</div>
                    <div className="mt-2 space-y-1">
                      <div className="text-[9px] font-bold text-amber-700">Propune:</div>
                      <div className="text-[9px] text-gray-600">💒 Album Nuntă — 189 lei (-24%)</div>
                      <div className="text-[9px] text-gray-600">👶 Album Copii — 99 lei (-24%)</div>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <a href={`tel:${o.clientPhone}`} className="flex-1 text-center px-2 py-1.5 text-[9px] font-bold bg-[#3D6B5E] text-white rounded hover:bg-[#2d5445]">📞 Sună</a>
                      <button className="flex-1 px-2 py-1.5 text-[9px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700">📧 Ofertă</button>
                      <button className="flex-1 px-2 py-1.5 text-[9px] font-bold bg-green-600 text-white rounded hover:bg-green-700">💬 WhatsApp</button>
                    </div>
                    <div className="mt-1.5 text-[8px] text-gray-400">Mulțumire + recenzie: trimis ✓</div>
                  </div>
                ))
              )}
              {grouped[col.status].map((o) => (
                <div key={o.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 cursor-pointer transition border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] font-bold text-gray-500">{o.id}</span>
                    <span className="text-[10px] text-gray-400">{o.device === 'mobile' ? '📱' : '💻'}</span>
                  </div>
                  <div className="text-xs font-semibold text-gray-800 mb-1">{o.clientName}</div>
                  <div className="text-[10px] text-gray-500 mb-2">{o.product} · {o.format} · {o.pages}p</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{o.photos} poze</span>
                    <span className="text-[10px] font-bold text-gray-700">{o.price} lei</span>
                  </div>
                  {o.designer && (
                    <div className="mt-1 text-[10px] text-blue-600">Designer: {o.designer}</div>
                  )}
                  {/* Print dates — shown for orders in print/delivery stages */}
                  {o.dates.toPrint && (
                    <div className="mt-1.5 pt-1.5 border-t border-gray-200 space-y-0.5">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-gray-400">La tipar:</span>
                        <span className="font-semibold text-gray-600">{o.dates.toPrint}</span>
                      </div>
                      {o.dates.factoryReady ? (
                        <div className="flex justify-between text-[9px]">
                          <span className="text-gray-400">Gata fabrică:</span>
                          <span className="font-semibold text-green-600">{o.dates.factoryReady}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-[9px]">
                          <span className="text-gray-400">Estimat gata:</span>
                          <span className="font-semibold text-orange-500">~10 zile</span>
                        </div>
                      )}
                      {o.dates.delivered && (
                        <div className="flex justify-between text-[9px]">
                          <span className="text-gray-400">Livrat:</span>
                          <span className="font-semibold text-emerald-600">{o.dates.delivered}</span>
                        </div>
                      )}
                      {o.printCode && (
                        <div className="flex justify-between text-[9px]">
                          <span className="text-gray-400">Cod:</span>
                          <span className="font-mono font-semibold text-gray-500">{o.printCode}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {grouped[col.status].length === 0 && (
                <div className="text-center py-6 text-xs text-gray-300">Gol</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
