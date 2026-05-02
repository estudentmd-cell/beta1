import { useState, useEffect, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrders, getAllOrdersAsync, updateOrderStatus, assignDesigner, calculateSLA, getTeamMembers, deleteOrder, deleteClient, invalidateCache } from '../../utils/adminData';
import { sendUserNotification } from '../../firebase/notifications';
import useAdminStore from '../../stores/useAdminStore';
import StatusBadge, { getGranularStatus } from './StatusBadge';

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Acum';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}z`;
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [search, setLocalSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [assigningId, setAssigningId] = useState(null);
  const [designerInput, setDesignerInput] = useState('');
  const [activityLog, setActivityLog] = useState([]); // real-time event log
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'client' | 'designer' | 'admin'
  const navigate = useNavigate();
  const globalSearch = useAdminStore(s => s.searchQuery);

  const addLogEntry = (msg, type = 'info', role = 'client', projectId = null, linkTo = null) => {
    const entry = { id: Date.now(), time: new Date().toLocaleTimeString('ro-RO'), msg, type, role, projectId, linkTo };
    setActivityLog(prev => [entry, ...prev].slice(0, 50));
  };

  const refreshFromFirestore = async (dbRef) => {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const [projSnap, ordSnap] = await Promise.all([
        getDocs(collection(dbRef, 'projects')),
        getDocs(collection(dbRef, 'orders')),
      ]);
      const all = [
        ...projSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        ...ordSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      ];
      const map = new Map();
      all.forEach(p => { if (p.id) map.set(p.id, { ...map.get(p.id), ...p }); });
      const merged = Array.from(map.values()).filter(o =>
        o.orderNumber || o.paymentStatus === 'paid' || (o.totalPhotos || 0) > 0 || (o.photos?.length > 0)
      );
      merged.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
      setOrders(merged);
    } catch {}
  };

  useEffect(() => {
    // Fetch from Firestore directly (no stale cache flash)
    getAllOrdersAsync().then(merged => {
      merged.sort((a, b) => (b.createdAt || b.created_at || '').localeCompare(a.createdAt || a.created_at || ''));
      setOrders(merged);
    }).catch(() => {});

    // Real-time listener for orders list refresh only (Activity Feed moved to Live page)
    let unsub;
    (async () => {
      try {
        const { db } = await import('../../firebase/config');
        if (!db) return;
        const { collection, onSnapshot } = await import('firebase/firestore');
        const unsubProjects = onSnapshot(collection(db, 'projects'), () => refreshFromFirestore(db));
        const unsubOrders = onSnapshot(collection(db, 'orders'), () => refreshFromFirestore(db));
        unsub = () => { unsubProjects(); unsubOrders(); };
      } catch {}
    })();

    return () => { if (unsub) unsub(); };
  }, []);

  function reload() {
    invalidateCache();
    getAllOrdersAsync().then(merged => {
      merged.sort((a, b) => (b.createdAt || b.created_at || '').localeCompare(a.createdAt || a.created_at || ''));
      setOrders(merged);
    }).catch(() => {});
  }

  function flash(msg) { setFeedback(msg); setTimeout(() => setFeedback(''), 3000); }

  // "Toate comenzile" = ONLY clients who reached checkout (paid or attempted payment)
  // Exclude: drafts (visitors), and orders that moved to other sidebar sections
  const MOVED_SECTIONS = ['approved_print', 'in_print', 'shipped', 'delivered'];

  const q = (search || globalSearch || '').toLowerCase();
  const filtered = useMemo(() => {
    let list = orders.filter(o => {
      // Exclude orders in other sidebar sections
      if (MOVED_SECTIONS.includes(o.status)) return false;
      // Exclude empty entries with no useful data
      if (!o.orderNumber && !(o.totalPhotos > 0) && !(o.photos?.length > 0)) return false;
      // Keep: drafts with photos/client info, paid orders, pending designer, etc.
      return true;
    });
    if (q) {
      list = list.filter(o =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.id || '').toLowerCase().includes(q) ||
        (o.clientName || '').toLowerCase().includes(q) ||
        (o.clientPhone || '').toLowerCase().includes(q) ||
        (o.clientEmail || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, q]);

  const designers = getTeamMembers().filter(m => m.role === 'designer');

  // ── Status change + notify client ──
  async function changeStatus(order, newStatus, detail) {
    updateOrderStatus(order.id, newStatus, detail);
    const clientNotifs = {
      pending_client_approval: { title: 'Macheta ta e gata!', message: 'Verifică albumul și aprobă sau cere modificări.' },
      approved_print: { title: 'Macheta a fost aprobată!', message: 'Albumul va fi trimis la tipar.' },
      in_print: { title: 'Albumul tău e la tipar!', message: 'Te anunțăm când e gata.' },
      shipped: { title: 'Comanda a fost expediată!', message: 'Albumul e pe drum!' },
      delivered: { title: 'Albumul a fost livrat!', message: 'Bucură-te de albumul tău foto!' },
    };
    if (clientNotifs[newStatus]) {
      const cid = order.client_id || order.activeClientId;
      if (cid) {
        await sendUserNotification({
          clientId: cid,
          orderId: order.id,
          ...clientNotifs[newStatus],
          actionUrl: '/app/cabinet',
        });
      }
    }
    flash(detail);
    reload();
  }

  function doAssign(orderId, name) {
    assignDesigner(orderId, name);
    setAssigningId(null);
    setDesignerInput('');
    flash(`Designer ${name} asignat`);
    reload();
  }

  return (
    <div>
      {/* Search + actions */}
      <div className="mb-4">
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-3 text-sm text-green-800 font-medium">
          ✓ {feedback}
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-gray-400 mb-3">{filtered.length} comenzi</p>

      {/* ══ TABLE ══ */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[600px] md:min-w-0">
          <thead>
            <tr className="text-left text-[11px] text-gray-400 border-b uppercase tracking-wider">
              <th className="px-3 md:px-4 py-3">Nr.</th>
              <th className="px-3 md:px-4 py-3">Client</th>
              <th className="px-3 md:px-4 py-3">Status</th>
              <th className="px-3 md:px-4 py-3 hidden md:table-cell">Produs</th>
              <th className="px-3 md:px-4 py-3 text-center">Poze</th>
              <th className="px-3 md:px-4 py-3 hidden md:table-cell">Data</th>
              <th className="px-3 md:px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-16 text-center text-gray-400">Nicio comandă.</td></tr>
            )}
            {filtered.map(o => {
              const isOpen = expanded === o.id;
              const phone = o.clientPhone || o.client_phone || '';
              return (
                <Fragment key={o.id}>
                  {/* ── Row ── */}
                  <tr className={`border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition ${isOpen ? 'bg-gray-50' : ''}`}
                    onClick={() => setExpanded(isOpen ? null : o.id)}>
                    <td className="px-3 md:px-4 py-3">
                      <span className="font-mono text-[12px] font-bold text-[#3D6B5E]">{o.orderNumber || '—'}</span>
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                          className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <span className="font-medium text-gray-900 text-[13px] truncate">
                          {(phone || o.clientEmail) ? (
                            <span className="hover:text-[#3D6B5E] hover:underline cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); navigate(`/admin_panel/clients/${encodeURIComponent(phone || o.clientEmail || o.client_id)}`); }}
                            >{o.clientName || o.clientEmail || phone || '—'}</span>
                          ) : (o.clientName || '—')}
                        </span>
                      </div>
                      {phone && <div className="text-[10px] text-gray-400 ml-4">{o.deviceType === 'mobile' ? '📱' : '💻'} {phone}</div>}
                    </td>
                    <td className="px-3 md:px-4 py-3 hidden md:table-cell">
                      <div className="text-[12px] text-gray-700">{o.productConfig?.name || '—'}</div>
                      <div className="text-[10px] text-gray-400">
                        {o.productConfig?.format}{o.productConfig?.initialPages ? ` · ${o.productConfig.initialPages} pag` : ''}
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <StatusBadge order={o} />
                    </td>
                    <td className="px-3 md:px-4 py-3 text-center">
                      <span className="font-semibold text-gray-800 text-sm">
                        {(o.totalPhotos || o.photos?.length || 0) || '—'}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-3 text-[11px] text-gray-500 hidden md:table-cell">
                      {fmtDate(o.createdAt || o.created_at)}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-right">
                      {o.priceTotal ? (
                        <>
                          <span className="font-semibold text-gray-800">{o.priceTotal} lei</span>
                          {o.paymentStatus === 'paid' && <div className="text-[10px] text-green-600 font-semibold">achitat</div>}
                        </>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>

                  {/* ── Expanded panel ── */}
                  {isOpen && (
                    <tr>
                      <td colSpan={8} className="bg-[#FAFAF9] border-b border-gray-200 px-4 py-4">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {/* ── ACȚIUNI PE STATUS ── */}

                          {/* Vizitator / Draft — sună */}
                          {(!o.status || o.status === 'draft') && phone && (
                            <a href={`tel:${phone}`} className="btn-action bg-green-600 text-white hover:bg-green-700">📞 Sună</a>
                          )}

                          {/* Așteaptă achitarea → marchează achitat */}
                          {o.status === 'awaiting_payment' && (
                            <>
                              {phone && <a href={`tel:${phone}`} className="btn-action bg-green-600 text-white hover:bg-green-700">📞 Sună</a>}
                              <button onClick={(e) => { e.stopPropagation();
                                const nextStatus = o.orderType === 'self' ? 'paid_pending_verification' : 'paid_pending_designer';
                                changeStatus(o, nextStatus, 'Achitat — confirmat de manager');
                              }} className="btn-action bg-[#3D6B5E] text-white hover:bg-[#2d5246]">💰 Marchează achitat</button>
                            </>
                          )}

                          {/* Plătit fără designer → asignează */}
                          {o.status === 'paid_pending_designer' && (
                            assigningId === o.id ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                {designers.map(d => (
                                  <button key={d.id} onClick={(e) => { e.stopPropagation(); doAssign(o.id, d.name); }}
                                    className="btn-action bg-indigo-600 text-white hover:bg-indigo-700">{d.name}</button>
                                ))}
                                {designers.length === 0 && (
                                  <>
                                    <input type="text" value={designerInput} onChange={e => setDesignerInput(e.target.value)}
                                      placeholder="Nume..." className="rounded border px-2 py-1 text-xs w-32"
                                      onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') doAssign(o.id, designerInput); }} />
                                    <button onClick={(e) => { e.stopPropagation(); doAssign(o.id, designerInput); }}
                                      className="btn-action bg-indigo-600 text-white">OK</button>
                                  </>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); setAssigningId(null); }} className="text-xs text-gray-400">✕</button>
                              </div>
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); setAssigningId(o.id); }}
                                className="btn-action bg-indigo-600 text-white hover:bg-indigo-700">👤 Asignează designer</button>
                            )
                          )}

                          {/* Designer lucrează sau revizie → Trimite la client pentru aprobare */}
                          {(o.status === 'designer_working' || o.status === 'revision_requested') && (
                            <button onClick={(e) => { e.stopPropagation(); changeStatus(o, 'pending_client_approval', 'Macheta trimisă la client pentru aprobare'); }}
                              className="btn-action bg-purple-600 text-white hover:bg-purple-700">📤 Trimite la client</button>
                          )}

                          {/* Verificare album (clientul a făcut singur) → Designer aprobă direct */}
                          {(o.status === 'paid_pending_verification') && (
                            <button onClick={async (e) => { e.stopPropagation();
                              changeStatus(o, 'approved_print', 'Aprobat de designer — gata de tipar');
                              const cid2 = o.client_id || o.activeClientId;
                              if (cid2) await sendUserNotification({
                                clientId: cid2, orderId: o.id,
                                title: 'Felicitări! Macheta ta a fost aprobată!',
                                message: 'Designerul a verificat albumul tău și totul este perfect. Începe printarea!',
                                actionUrl: '/app/cabinet',
                              });
                            }}
                              className="btn-action bg-[#3D6B5E] text-white hover:bg-[#2d5246]">✅ Aprobat de designer</button>
                          )}

                          {/* Așteaptă aprobare client → Admin aprobă (după ce clientul a confirmat) */}
                          {o.status === 'pending_client_approval' && (
                            <button onClick={(e) => { e.stopPropagation(); changeStatus(o, 'approved_print', 'Comandă verificată și aprobată'); }}
                              className="btn-action bg-[#3D6B5E] text-white hover:bg-[#2d5246]">✅ Gata de tipar</button>
                          )}

                          {/* Aprobat → Gata de tipar (se mută în bara Gata de tipar) */}
                          {o.status === 'approved_print' && (
                            <button onClick={(e) => { e.stopPropagation(); changeStatus(o, 'in_print', `La tipar din ${new Date().toLocaleDateString('ro-RO')}`); }}
                              className="btn-action bg-teal-600 text-white hover:bg-teal-700">🖨 Trimite la tipar</button>
                          )}

                          {/* La tipar → Expediat */}
                          {o.status === 'in_print' && (
                            <button onClick={(e) => { e.stopPropagation(); changeStatus(o, 'shipped', 'Expediat'); }}
                              className="btn-action bg-purple-600 text-white hover:bg-purple-700">📦 Expediat</button>
                          )}

                          {/* Expediat → Livrat */}
                          {o.status === 'shipped' && (
                            <button onClick={(e) => { e.stopPropagation(); changeStatus(o, 'delivered', 'Livrat'); }}
                              className="btn-action bg-emerald-600 text-white hover:bg-emerald-700">✓ Livrat</button>
                          )}

                          {/* Deschide redactorul */}
                          {o.spreads && o.spreads.length > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/admin_panel/editor/${o.id}`); }}
                              className="btn-action bg-gray-800 text-white hover:bg-gray-900">🎨 Deschide redactor</button>
                          )}

                          {/* Profil client */}
                          {phone && (
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/admin_panel/clients/${encodeURIComponent(phone)}`); }}
                              className="btn-action border border-gray-300 text-gray-700 hover:bg-gray-100">👤 Profil client</button>
                          )}

                          {/* Detalii comandă */}
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/admin_panel/orders/${o.id}`); }}
                            className="btn-action border border-gray-300 text-gray-700 hover:bg-gray-100">Detalii →</button>

                          {/* Anulează comanda */}
                          {o.status !== 'cancelled' ? (
                            <button onClick={(e) => { e.stopPropagation();
                              const reason = prompt(`Motivul anulării comenzii ${o.orderNumber || o.id}:`);
                              if (reason !== null) {
                                import('../../utils/adminData').then(m => m.cancelOrder(o.id, reason)).then(() => { flash(`Comanda ${o.orderNumber || o.id} anulată`); reload(); setExpanded(null); });
                              }}}
                              className="btn-action border border-orange-300 text-orange-600 hover:bg-orange-50">✕ Anulează comanda</button>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation();
                              const daysLeft = o.deleteAfter ? Math.max(0, Math.ceil((new Date(o.deleteAfter) - new Date()) / (24*60*60*1000))) : 60;
                              if (daysLeft > 0) { alert(`Comanda poate fi ștearsă definitiv peste ${daysLeft} zile (60 zile de la anulare).`); return; }
                              if (confirm(`Sigur ștergi DEFINITIV comanda ${o.orderNumber || o.id}? Ireversibil!`)) {
                                deleteOrder(o.id).then((ok) => { if(ok) { flash(`Comanda ${o.orderNumber || o.id} ștearsă definitiv`); reload(); setExpanded(null); } });
                              }}}
                              className="btn-action border border-red-300 text-red-600 hover:bg-red-50">🗑 Șterge definitiv</button>
                          )}

                          {/* Șterge clientul complet */}
                          {phone && (
                            <button onClick={(e) => { e.stopPropagation();
                              if (confirm(`Sigur ștergi clientul ${o.clientName || phone} cu TOATE comenzile și datele lui? Ireversibil!`)) {
                                deleteClient(phone).then(() => { flash(`Client ${o.clientName || phone} șters complet`); reload(); setExpanded(null); });
                              }}}
                              className="btn-action border border-red-300 text-red-600 hover:bg-red-50">🗑 Șterge client</button>
                          )}
                        </div>

                        {/* Extra info */}
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-gray-400">
                          {o.orderNumber && <span>Nr: <b className="text-[#3D6B5E] font-mono">{o.orderNumber}</b></span>}
                          {o.designer && <span>Designer: <b className="text-gray-600">{o.designer}</b></span>}
                          {o.orderType && <span>Serviciu: {o.orderType === 'designer' ? 'Cu designer' : o.orderType === 'finish' ? 'Finalizare' : 'Self-service'}</span>}
                          {(o.usedPhotos || 0) > 0 && <span>{o.usedPhotos}/{o.totalPhotos} poze plasate</span>}
                          {(o.progress || 0) > 0 && <span>Progres: {o.progress}%</span>}
                          {o.clientIp && <span>IP: <b className="text-gray-600 font-mono">{o.clientIp}</b></span>}
                          {o.clientEmail && <span>Email: <b className="text-gray-600">{o.clientEmail}</b></span>}
                          {o.revisionMessage && <span className="text-amber-600">Revizie: "{o.revisionMessage}"</span>}
                          {o.paidAt && <span>Plătit: {fmtDate(o.paidAt)}</span>}
                          {o.updatedAt && <span>Ultima activitate: {fmtDate(o.updatedAt)}</span>}
                        </div>

                        {/* Photo previews grid */}
                        {o.photos && o.photos.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {o.photos.slice(0, 24).map(p => {
                              // Reconstruct thumb URL from cloudinaryId if missing
                              const thumb = p.thumbData || p.previewUrl
                                || (p.cloudinaryId ? `https://res.cloudinary.com/dqmygw2zz/image/upload/w_300,q_70,f_webp,c_limit/${p.cloudinaryId}` : null)
                                || p.storageUrl;
                              return (
                              <div key={p.id} className="w-12 h-12 rounded overflow-hidden bg-gray-100">
                                {thumb
                                  ? <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                                  : <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">📷</div>}
                              </div>
                            );
                            })}
                            {o.photos.length > 24 && (
                              <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">+{o.photos.length - 24}</div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* inline styles for action buttons */}
      <style>{`.btn-action { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; transition: all 0.15s; cursor: pointer; white-space: nowrap; }`}</style>
    </div>
  );
}

