import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';
import { getProjects, getProjectsAsync } from '../../utils/projectStorage';
import { getActiveOffers } from '../../utils/offers';
import { getUserNotifications, markNotificationRead } from '../../firebase/notifications';
import { updateOrderStatus } from '../../utils/adminData';
import { db } from '../../firebase/config';

export default function CabinetAccount({ onNavigate, onLogout }) {
  const navigate = useNavigate();
  const { clientName, clientEmail, activeClientId, user } = useAuthStore();

  const [notifications, setNotifications] = useState([]);
  const [projects, setAccountProjects] = useState([]);
  const [offers, setOffers] = useState([]);
  const [showPopup, setShowPopup] = useState(null);
  const [confirmPrint, setConfirmPrint] = useState(null);
  const popupShownRef = useRef(false);

  useEffect(() => {
    const { clientEmail, clientPhone, activeClientId } = useAuthStore.getState();
    getProjectsAsync({ email: clientEmail, phone: clientPhone, clientId: activeClientId })
      .then(all => {
        // Also check orders collection (same logic as CabinetOrders)
        if (db) {
          import('firebase/firestore').then(({ collection, getDocs, query, where }) => {
            const queries = [];
            if (activeClientId) {
              queries.push(getDocs(query(collection(db, 'orders'), where('client_id', '==', activeClientId))).catch(() => ({ docs: [] })));
              queries.push(getDocs(query(collection(db, 'orders'), where('activeClientId', '==', activeClientId))).catch(() => ({ docs: [] })));
            }
            if (clientEmail) {
              queries.push(getDocs(query(collection(db, 'orders'), where('clientEmail', '==', clientEmail.toLowerCase().trim()))).catch(() => ({ docs: [] })));
            }
            Promise.all(queries).then(snapshots => {
              const merged = new Map();
              all.forEach(p => merged.set(p.id, p));
              snapshots.forEach(snap => snap.docs?.forEach(d => merged.set(d.id, { id: d.id, ...d.data() })));
              setAccountProjects(Array.from(merged.values()));
            });
          });
        } else {
          setAccountProjects(all);
        }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    import('../../utils/offers').then(m => m.getActiveOffersAsync()).then(setOffers);
  }, []);

  const ordersCount = projects.length;
  const draftsCount = projects.filter(p => p.status === 'draft').length;
  const paidCount = projects.filter(p => p.status && p.status !== 'draft').length;

  // Notifications + real-time listener (unchanged logic)
  useEffect(() => {
    const projectIds = projects.map(p => p.id);
    getUserNotifications(activeClientId, projectIds).then(notifs => {
      setNotifications(notifs);
      if (!popupShownRef.current) {
        const firstUnread = notifs.find(n => !n.read);
        if (firstUnread) { setShowPopup(firstUnread); popupShownRef.current = true; }
      }
    }).catch(() => {});

    if (!db) return;
    let unsub;
    (async () => {
      try {
        const { collection, onSnapshot } = await import('firebase/firestore');
        unsub = onSnapshot(collection(db, 'user-notifications'), snap => {
          const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const mine = all.filter(n =>
            (activeClientId && n.clientId === activeClientId) ||
            (n.orderId && projectIds.includes(n.orderId))
          );
          const sorted = mine.sort((a, b) => {
            const ta = typeof b.createdAt === 'string' ? b.createdAt : b.createdAt?.toDate?.()?.toISOString?.() || '';
            const tb = typeof a.createdAt === 'string' ? a.createdAt : a.createdAt?.toDate?.()?.toISOString?.() || '';
            return ta.localeCompare(tb);
          });
          setNotifications(sorted);
          if (!popupShownRef.current) {
            const firstUnread = sorted.find(n => !n.read);
            if (firstUnread) { setShowPopup(firstUnread); popupShownRef.current = true; }
          }
        });
      } catch {}
    })();
    return () => { if (unsub) unsub(); };
  }, [activeClientId, projects.length]);

  const unreadNotifs = notifications.filter(n => !n.read);

  const handleSendToPrint = async (notif) => {
    if (notif.orderId) {
      updateOrderStatus(notif.orderId, 'approved_print', 'Client a aprobat — trimis la tipar');
      if (db) {
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'orders', notif.orderId), { status: 'approved_print' }, { merge: true });
          await setDoc(doc(db, 'projects', notif.orderId), { status: 'approved_print' }, { merge: true });
        } catch {}
      }
    }
    await markNotificationRead(notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setConfirmPrint(null);
  };

  const displayName = user?.displayName || clientName || 'Utilizator';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="space-y-4 animate-[fadeIn_0.2s_ease]">

      {/* ═══ Notifications ═══ */}
      {unreadNotifs.length > 0 && (
        <div className="space-y-2">
          {unreadNotifs.map(notif => (
            <div key={notif.id} className="bg-[#EAF0EC] rounded-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#3D6B5E] text-white flex items-center justify-center text-lg shrink-0">
                🎉
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#1A1A1A] mb-0.5">{notif.title}</p>
                <p className="text-[12px] text-[#555] mb-2 leading-relaxed">{notif.message}</p>
                <div className="flex gap-2">
                  {notif.orderId && (
                    <button onClick={() => { navigate(`/app/editor/${notif.orderId}`); markNotificationRead(notif.id); }}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-[#3D6B5E] text-[#3D6B5E] active:opacity-50">
                      Previzualizeaza
                    </button>
                  )}
                  <button onClick={() => setConfirmPrint(notif)}
                    className="bg-[#3D6B5E] text-white px-3 py-1.5 rounded-lg text-[12px] font-bold">
                    Confirm comanda
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Welcome + Quick Stats (Desktop) ═══ */}
      <div className="hidden md:block">
        <h1 className="text-[24px] font-bold text-[#1A1A1A] mb-1">
          Bine ai revenit{clientName ? `, ${clientName}` : ''}!
        </h1>
        <p className="text-[13px] text-[#888] mb-4">{clientEmail}</p>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button onClick={() => onNavigate('orders')} className="bg-white rounded-xl p-4 border border-[#EBEBEB] hover:border-[#3D6B5E] transition text-left group">
            <div className="text-[28px] font-bold text-[#1A1A1A] group-hover:text-[#3D6B5E] transition">{ordersCount}</div>
            <div className="text-[12px] text-[#888]">Comenzi totale</div>
          </button>
          <button onClick={() => onNavigate('orders')} className="bg-white rounded-xl p-4 border border-[#EBEBEB] hover:border-[#3D6B5E] transition text-left group">
            <div className="text-[28px] font-bold text-[#3D6B5E]">{draftsCount}</div>
            <div className="text-[12px] text-[#888]">In editare</div>
          </button>
          <button onClick={() => onNavigate('offers')} className="bg-white rounded-xl p-4 border border-[#EBEBEB] hover:border-[#3D6B5E] transition text-left group">
            <div className="text-[28px] font-bold text-[#B8860B]">{offers.length}</div>
            <div className="text-[12px] text-[#888]">Oferte active</div>
          </button>
        </div>
      </div>

      {/* ═══ Mobile: User card ═══ */}
      <div className="md:hidden flex items-center gap-3 bg-white rounded-2xl p-4">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#3D6B5E] text-white flex items-center justify-center text-[18px] font-bold shrink-0">{initial}</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-[#1C1C1E] truncate">{displayName}</p>
          <p className="text-[12px] text-[#8E8E93]">{ordersCount} {ordersCount === 1 ? 'comandă' : 'comenzi'} · {draftsCount} in editare</p>
        </div>
        <button onClick={() => onNavigate('profile')} className="text-[12px] text-[#3D6B5E] font-semibold active:opacity-50">Profil</button>
      </div>

      {/* ═══ Continue editing ═══ */}
      {draftsCount > 0 && (
        <button onClick={() => onNavigate('orders')}
          className="w-full flex items-center gap-3 bg-[#3D6B5E] text-white rounded-2xl p-4 active:scale-[0.98] transition-all">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-bold">Continuă editarea</p>
            <p className="text-[12px] text-white/70">{draftsCount} album{draftsCount > 1 ? 'e' : ''} neterminate</p>
          </div>
          <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}

      {/* ═══ Create new album ═══ */}
      <button onClick={() => navigate('/')}
        className="w-full flex items-center gap-3 bg-white rounded-2xl p-4 border-2 border-dashed border-[#3D6B5E]/30 hover:border-[#3D6B5E] active:scale-[0.98] transition-all text-left group">
        <div className="w-10 h-10 rounded-full bg-[#3D6B5E]/10 flex items-center justify-center shrink-0 group-hover:bg-[#3D6B5E]/20 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3D6B5E" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-semibold text-[#3D6B5E]">Creează album nou</p>
          <p className="text-[12px] text-[#999]">Alege design, format și pagini</p>
        </div>
      </button>

      {/* ═══ Oferte (if any) ═══ */}
      {offers.length > 0 && (
        <button onClick={() => onNavigate('offers')}
          className="w-full bg-gradient-to-r from-[#FFF8E1] to-[#FFF3CD] rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all text-left border border-[#F5E6A3]/50">
          <span className="text-[28px] shrink-0">🎁</span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-[#8B6914]">{offers.length} ofert{offers.length === 1 ? 'ă activă' : 'e active'}</p>
            <p className="text-[12px] text-[#B8960B]">Prețuri speciale la albume</p>
          </div>
          <svg className="w-4 h-4 text-[#C9A927]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}

      {/* ═══ Quick links ═══ */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          { id: 'orders', icon: '📦', label: 'Comenzile mele', count: ordersCount },
          { id: 'addresses', icon: '📍', label: 'Adrese livrare' },
          { id: 'profile', icon: '👤', label: 'Date personale' },
          { id: 'pending', icon: '⏳', label: 'De plătit' },
        ].map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)}
            className="bg-white rounded-xl p-3 flex items-center gap-2.5 active:scale-[0.97] transition-all text-left border border-[#F0F0F0] hover:border-[#E0E0E0]">
            <span className="text-[20px]">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#333] truncate">{item.label}</p>
              {item.count != null && <p className="text-[11px] text-[#999]">{item.count}</p>}
            </div>
          </button>
        ))}
      </div>

      {/* ═══ Help links ═══ */}
      <div className="bg-white rounded-2xl overflow-hidden border border-[#F0F0F0]">
        <p className="text-[11px] font-semibold text-[#999] uppercase px-4 pt-3 pb-1">Ajutor</p>
        {[
          { icon: '❓', label: 'Întrebări frecvente', action: () => navigate('/faq') },
          { icon: '📋', label: 'Termeni și condiții', action: () => navigate('/termeni') },
          { icon: '🔒', label: 'Confidențialitate', action: () => navigate('/confidentialitate') },
          { icon: '📞', label: 'Contacte', action: () => navigate('/contacte') },
        ].map((item, i) => (
          <button key={i} onClick={item.action}
            className="w-full flex items-center gap-3 px-4 py-3 border-t border-[#F5F5F5] hover:bg-[#FAFAFA] transition text-left">
            <span className="text-[16px]">{item.icon}</span>
            <span className="flex-1 text-[13px] text-[#444]">{item.label}</span>
            <svg className="w-3.5 h-3.5 text-[#CCC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
      </div>

      {/* ═══ Logout (mobile only) ═══ */}
      <div className="md:hidden">
        <button onClick={onLogout}
          className="w-full bg-white rounded-2xl py-3.5 text-center text-[15px] text-[#FF3B30] font-medium active:bg-[#F2F2F7] transition border border-[#F0F0F0]">
          Deconectare
        </button>
      </div>

      {/* ═══ Confirm print dialog ═══ */}
      {confirmPrint && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setConfirmPrint(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">🖨️</div>
              <h2 className="text-xl font-bold mb-2">Confirmi trimiterea la tipar?</h2>
              <p className="text-sm text-[#888] leading-relaxed">
                Dupa confirmare, albumul va fi trimis la tipar si <strong>nu va mai putea fi modificat</strong>.
              </p>
            </div>
            <div className="space-y-2">
              <button onClick={() => handleSendToPrint(confirmPrint)}
                className="bg-[#3D6B5E] text-white w-full py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition">
                Da, trimite la tipar
              </button>
              <button onClick={() => setConfirmPrint(null)}
                className="w-full py-2 text-sm text-[#999]">
                Mai verific
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Auto-popup designer finished ═══ */}
      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#3D6B5E] p-6 text-center text-white">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-xl font-bold mb-1">Macheta este gata!</h2>
              <p className="text-sm text-white/70">Designerii au terminat albumul tau</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#555] mb-5 leading-relaxed text-center">
                {showPopup.message || 'Previzualizeaza albumul si confirma trimiterea la tipar.'}
              </p>
              <div className="space-y-2">
                {showPopup.orderId && (
                  <button onClick={() => { markNotificationRead(showPopup.id); setShowPopup(null); navigate(`/app/editor/${showPopup.orderId}`); }}
                    className="w-full py-3 rounded-xl bg-[#3D6B5E] text-white text-sm font-bold active:scale-[0.98] transition">
                    Previzualizeaza albumul
                  </button>
                )}
                <button onClick={() => { markNotificationRead(showPopup.id); setShowPopup(null); setNotifications(prev => prev.map(n => n.id === showPopup.id ? { ...n, read: true } : n)); }}
                  className="w-full py-2 text-sm text-[#999]">
                  Mai tarziu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
