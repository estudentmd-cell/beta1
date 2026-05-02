import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrders, getAllOrdersAsync, addContactEntry, getContactLog, CONTACT_OUTCOMES } from '../../utils/adminData';

function fmtDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}z`;
}

export default function Abandonati() {
  const [leads, setLeads] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [callLogFor, setCallLogFor] = useState(null); // orderId
  const [callOutcome, setCallOutcome] = useState('');
  const [callNote, setCallNote] = useState('');
  const navigate = useNavigate();

  function load() {
    getAllOrdersAsync().then(all => {
      // Find phones that already have a paid order (not a lead anymore)
      const norm = (ph) => (ph || '').replace(/\D/g, '').slice(-8);
      const paidPhones = new Set();
      all.forEach(o => {
        if (o.status && o.status !== 'draft') {
          const ph = norm(o.clientPhone || o.client_phone);
          if (ph) paidPhones.add(ph);
        }
      });

      // Lead-uri = draft cu clientPhone, EXCLUDING clients who already paid
      const drafts = all.filter(o => {
        if (o.status && o.status !== 'draft') return false;
        const phone = o.clientPhone || o.client_phone || '';
        if (!phone) return false;
        // Skip if this client already has a paid order
        if (paidPhones.has(norm(phone))) return false;
        return true;
      });
      drafts.sort((a, b) => (b.createdAt || b.created_at || '').localeCompare(a.createdAt || a.created_at || ''));
      setLeads(drafts);
    }).catch(() => {
      const local = getAllOrders();
      const norm = (ph) => (ph || '').replace(/\D/g, '').slice(-8);
      const paidPhones = new Set();
      local.forEach(o => {
        if (o.status && o.status !== 'draft') {
          const ph = norm(o.clientPhone || o.client_phone);
          if (ph) paidPhones.add(ph);
        }
      });
      setLeads(local.filter(o => {
        if (o.status && o.status !== 'draft') return false;
        const phone = o.clientPhone || o.client_phone || '';
        if (!phone) return false;
        if (paidPhones.has(norm(phone))) return false;
        return true;
      }));
    });
  }

  useEffect(() => { load(); }, []);

  function flash(msg) { setFeedback(msg); setTimeout(() => setFeedback(''), 3000); }

  function handleCallLog(order) {
    if (!callOutcome) return;
    const phone = order.clientPhone || order.client_phone || '';
    addContactEntry(phone, order.clientName, order.id, callOutcome, callNote.trim());
    setCallLogFor(null);
    setCallOutcome('');
    setCallNote('');
    flash('Apel logat');
    load();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg">📋</div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Lead-uri</h2>
          <p className="text-sm text-gray-500">
            {leads.length === 0 ? 'Niciun lead' : `${leads.length} persoane au intrat, au pus nr, dar nu au achitat`}
          </p>
        </div>
      </div>

      {feedback && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-4 text-sm text-green-800 font-medium">✓ {feedback}</div>
      )}

      {leads.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm py-16 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-400">Niciun lead momentan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-gray-400 border-b uppercase tracking-wider">
                <th className="px-4 py-3">Nume / Telefon</th>
                <th className="px-4 py-3">Produs</th>
                <th className="px-4 py-3 text-center">Poze</th>
                <th className="px-4 py-3">Progres</th>
                <th className="px-4 py-3">Intrat la</th>
                <th className="px-4 py-3">Ultima activitate</th>
                <th className="px-4 py-3">Notă follow-up</th>
                <th className="px-4 py-3">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(o => {
                const phone = o.clientPhone || o.client_phone || '';
                const lastContact = getContactLog(phone).length > 0 ? getContactLog(phone)[0] : null;
                const lastOutcome = lastContact ? (CONTACT_OUTCOMES[lastContact.outcome] || { label: lastContact.outcome, icon: '📞' }) : null;
                const isCallOpen = callLogFor === o.id;

                return (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-[13px]">{o.clientName || '—'}</div>
                      {phone && <div className="text-[11px] text-gray-400">{phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-600">
                      {o.productConfig?.name || '—'}
                      <div className="text-[10px] text-gray-400">{o.productConfig?.format}{o.productConfig?.initialPages ? ` · ${o.productConfig.initialPages} pag` : ''}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-gray-800">{o.totalPhotos || 0}</span>
                      {(o.usedPhotos || 0) > 0 && <div className="text-[10px] text-gray-400">{o.usedPhotos} plasate</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${(o.progress || 0) >= 50 ? 'bg-blue-500' : (o.progress || 0) > 0 ? 'bg-orange-400' : 'bg-gray-300'}`}
                            style={{ width: `${o.progress || 0}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-500">{o.progress || 0}%</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{o.filledSpreads || 0}/{o.totalSpreads || 0} rotații</div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-600">
                      {fmtDateTime(o.createdAt || o.created_at)}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">
                      {timeAgo(o.updatedAt || o.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {lastContact ? (
                        <div>
                          <span className="text-[11px] font-semibold text-gray-700">{lastOutcome.icon} {lastOutcome.label}</span>
                          {lastContact.note && <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{lastContact.note}</div>}
                          <div className="text-[9px] text-gray-300 mt-0.5">{fmtDateTime(lastContact.timestamp)}</div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300">Necontactat</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {phone && (
                          <a href={`tel:${phone}`} className="px-2.5 py-1 bg-green-600 text-white rounded-lg text-[11px] font-semibold hover:bg-green-700 transition text-center">
                            📞 Sună
                          </a>
                        )}
                        <button onClick={() => setCallLogFor(isCallOpen ? null : o.id)}
                          className="px-2.5 py-1 border border-gray-300 text-gray-600 rounded-lg text-[11px] font-semibold hover:bg-gray-50 transition">
                          {isCallOpen ? '✕ Închide' : '✓ Am sunat'}
                        </button>
                      </div>

                      {/* Call log inline */}
                      {isCallOpen && (
                        <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex flex-wrap gap-1 mb-2">
                            {Object.entries(CONTACT_OUTCOMES).map(([key, info]) => (
                              <button key={key} onClick={() => setCallOutcome(key)}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition border ${
                                  callOutcome === key ? 'bg-[#3D6B5E] text-white border-[#3D6B5E]' : 'bg-white text-gray-500 border-gray-200'
                                }`}>
                                {info.icon} {info.label}
                              </button>
                            ))}
                          </div>
                          <input type="text" value={callNote} onChange={e => setCallNote(e.target.value)}
                            placeholder="Notă scurtă..."
                            className="w-full rounded border border-gray-200 px-2 py-1 text-[11px] mb-1.5" />
                          <button onClick={() => handleCallLog(o)} disabled={!callOutcome}
                            className="px-3 py-1 bg-[#3D6B5E] text-white rounded text-[10px] font-semibold disabled:opacity-40">
                            Salvează
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
