import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvitationsAsync, createInvitation, deleteInvitation, getAllOrdersAsync, getAllClientsAsync } from '../../utils/adminData';
import { getActiveOffersAsync, ACTIVE_OFFERS } from '../../utils/offers';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Acum';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}z`;
  return `${Math.floor(d / 30)}luni`;
}

function formatDate(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; }
}

const PLATFORMS = [
  { value: 'facebook', label: 'Facebook', color: 'bg-blue-100 text-blue-700' },
  { value: 'instagram', label: 'Instagram', color: 'bg-pink-100 text-pink-700' },
  { value: 'whatsapp', label: 'WhatsApp', color: 'bg-green-100 text-green-700' },
  { value: 'sms', label: 'SMS', color: 'bg-gray-100 text-gray-700' },
];

function PlatformBadge({ platform }) {
  const p = PLATFORMS.find(pl => pl.value === platform);
  if (!p) return null;
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${p.color}`}>{p.label}</span>;
}

// Funnel step indicator
function FunnelDot({ active, label, detail, icon }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${active ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
        {icon}
      </span>
      <div>
        <span className={`text-[11px] font-medium ${active ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
        {detail && <span className="text-[10px] text-gray-400 ml-1">{detail}</span>}
      </div>
    </div>
  );
}

export default function AdminInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [offers, setOffers] = useState(ACTIVE_OFFERS);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedOffer, setSelectedOffer] = useState('');
  const [campaign, setCampaign] = useState('');
  const [platform, setPlatform] = useState('facebook');
  const [createdLink, setCreatedLink] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const [invs, orders, clients, liveOffers] = await Promise.all([
        getInvitationsAsync(),
        getAllOrdersAsync(),
        getAllClientsAsync(),
        getActiveOffersAsync(),
      ]);
      setInvitations(invs);
      setAllOrders(orders);
      setAllClients(clients);
      if (liveOffers?.length) setOffers(liveOffers);
    } catch (e) { console.warn('AdminInvitations load:', e); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── Matching logic ──
  const norm = (ph) => (ph || '').replace(/\D/g, '').slice(-8);

  function getMatchData(inv) {
    const phone8 = norm(inv.phone);
    if (!phone8) return { hasAccount: false, projects: [], orders: [], bestProject: null, paidOrder: null };

    // 1. Check if client account exists
    const hasAccount = allClients.some(c => norm(c.phone) === phone8);

    // 2. Find projects — prefer inviteSlug match, fallback to phone
    let projects = allOrders.filter(o => o.inviteSlug === inv.slug);
    if (projects.length === 0) {
      projects = allOrders.filter(o => norm(o.clientPhone || o.client_phone) === phone8);
    }

    // 3. Find orders (non-draft)
    const orders = projects.filter(o => o.status && o.status !== 'draft');
    const paidOrder = orders.find(o =>
      ['awaiting_payment', 'paid_pending_designer', 'paid_pending_verification', 'designer_working',
       'pending_client_approval', 'approved_print', 'in_print', 'shipped', 'delivered'].includes(o.status)
    );

    // 4. Best project (most photos)
    const bestProject = projects.sort((a, b) => (b.totalPhotos || 0) - (a.totalPhotos || 0))[0] || null;

    return { hasAccount, projects, orders, bestProject, paidOrder };
  }

  // ── Create invitation ──
  const handleCreate = async () => {
    if (!phone.trim()) return;
    const offer = selectedOffer ? offers.find(o => o.id === selectedOffer) : null;

    const inv = await createInvitation(name.trim(), phone.trim(), {
      offerId: selectedOffer || null,
      offerName: offer?.name || null,
      offerPrice: offer?.newPrice || null,
      campaign: campaign.trim() || null,
      platform: platform || 'facebook',
      source: selectedOffer ? 'offer' : 'link',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    let link;
    if (selectedOffer && offer) {
      // Link direct la ProductScreen cu oferta pre-setată
      const slug = offer.product === 'pagini-subtiri' ? 'pagini-subtiri' : 'pagini-groase';
      const params = new URLSearchParams({
        offerId: selectedOffer,
        offerFormat: offer.format,
        offerPages: String(offer.pages),
        offerOldPrice: String(offer.oldPrice),
        offerNewPrice: String(offer.newPrice),
        offerBadge: offer.badge || '',
        offerTitle: offer.name || '',
        invite: inv.slug,
      });
      link = `${window.location.origin}/app/product/${slug}?${params.toString()}`;
    } else {
      link = `${window.location.origin}/?invite=${inv.slug}`;
    }

    // Update Firestore with final URL
    import('../../firebase/config').then(({ db }) => {
      if (!db) return;
      import('firebase/firestore').then(({ doc, setDoc }) => {
        setDoc(doc(db, 'invitations', inv.id), { url: link }, { merge: true }).catch(() => {});
      });
    });

    setCreatedLink(link);
    setName('');
    setPhone('');
    setSelectedOffer('');
    setCampaign('');
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Sterge invitatia?')) return;
    await deleteInvitation(id);
    load();
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  // ── Split invitations into active vs converted ──
  const activeInvitations = [];
  const convertedInvitations = [];

  for (const inv of invitations) {
    const { paidOrder } = getMatchData(inv);
    if (paidOrder && paidOrder.status !== 'awaiting_payment') {
      convertedInvitations.push({ inv, order: paidOrder });
    } else {
      activeInvitations.push(inv);
    }
  }

  // Sort active: most recent first
  activeInvitations.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  // ── Stats ──
  const totalSent = invitations.length;
  const totalOpened = invitations.filter(i => (i.clicks || 0) > 0).length;
  const totalWithPhotos = invitations.filter(i => {
    const { bestProject } = getMatchData(i);
    return bestProject && (bestProject.totalPhotos || 0) > 0;
  }).length;
  const totalOrdered = convertedInvitations.length;

  return (
    <div>
      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Linkuri trimise', value: totalSent, color: 'text-gray-700' },
          { label: 'Deschise', value: totalOpened, color: 'text-blue-600' },
          { label: 'Cu poze', value: totalWithPhotos, color: 'text-amber-600' },
          { label: 'Comandate', value: totalOrdered, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Section A: Generate Link ── */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <h3 className="font-semibold mb-1">Genereaza link pentru client</h3>
        <p className="text-xs text-gray-400 mb-4">Trimite pe Facebook/Instagram — clientul intra si incepe direct</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nume</label>
            <input type="text" placeholder="Maria Popescu" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Telefon *</label>
            <div className="flex">
              <span className="bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg px-2.5 py-2 text-sm text-gray-500 select-none">+373</span>
              <input type="text" placeholder="69 123 456" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 min-w-0" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Oferta</label>
            <select value={selectedOffer} onChange={(e) => setSelectedOffer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30">
              <option value="">Fara oferta</option>
              {offers.map(o => (
                <option key={o.id} value={o.id}>{o.emoji} {o.name} — {o.newPrice} lei ({o.badge})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Campanie</label>
            <input type="text" placeholder="FB Mai 2026" value={campaign} onChange={(e) => setCampaign(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Platforma</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30">
              {PLATFORMS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleCreate} disabled={!phone.trim()}
              className="w-full bg-[#3D6B5E] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[#345a50] transition disabled:opacity-40">
              Genereaza link
            </button>
          </div>
        </div>
        {createdLink && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <span className="text-sm text-green-800 flex-1 truncate">{createdLink}</span>
            <button onClick={() => copyToClipboard(createdLink, 'created')}
              className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-semibold shrink-0">
              {copiedId === 'created' ? 'Copiat!' : 'Copiaza'}
            </button>
          </div>
        )}
      </div>

      {/* ── Section B: Active Links ── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-5 pb-3 flex items-center justify-between">
          <h3 className="font-semibold">Link-uri active ({activeInvitations.length})</h3>
          {loading && <span className="text-xs text-gray-400 animate-pulse">Se incarca...</span>}
        </div>

        {activeInvitations.length === 0 ? (
          <div className="px-5 pb-5 text-sm text-gray-400">Niciun link activ</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activeInvitations.map(inv => {
              const { hasAccount, bestProject, paidOrder } = getMatchData(inv);
              const offer = inv.offerId ? offers.find(o => o.id === inv.offerId) : null;
              const linkUrl = inv.url || `${window.location.origin}/?invite=${inv.slug}`;
              const isExpanded = expandedId === inv.id;
              const clicks = inv.clicks || 0;
              const photoCount = bestProject?.totalPhotos || 0;

              return (
                <div key={inv.id}>
                  {/* Row */}
                  <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => setExpandedId(isExpanded ? null : inv.id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-[13px] truncate">{inv.name || 'Fara nume'}</div>
                        <div className="text-[11px] text-gray-400">{inv.phone}</div>
                      </div>
                      {offer && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
                          {offer.emoji} {offer.name}
                        </span>
                      )}
                      <PlatformBadge platform={inv.platform} />
                      {inv.campaign && (
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded hidden md:inline">{inv.campaign}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Mini funnel dots */}
                      <div className="hidden sm:flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-gray-300" title="Link trimis" />
                        <span className={`w-2 h-2 rounded-full ${clicks > 0 ? 'bg-blue-500' : 'bg-gray-200'}`} title={`${clicks} click-uri`} />
                        <span className={`w-2 h-2 rounded-full ${hasAccount ? 'bg-green-500' : 'bg-gray-200'}`} title="Cont creat" />
                        <span className={`w-2 h-2 rounded-full ${photoCount > 0 ? 'bg-amber-500' : 'bg-gray-200'}`} title={`${photoCount} poze`} />
                        <span className={`w-2 h-2 rounded-full ${paidOrder ? 'bg-emerald-500' : 'bg-gray-200'}`} title="Comanda" />
                      </div>
                      <span className="text-[10px] text-gray-400 w-12 text-right">{timeAgo(inv.createdAt)}</span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded card */}
                  {isExpanded && (
                    <div className="px-5 pb-4 bg-gray-50/50">
                      {/* Link copy */}
                      <div className="flex items-center gap-2 mb-4">
                        <input type="text" readOnly value={linkUrl}
                          className="text-[11px] bg-white border border-gray-200 rounded px-2 py-1.5 flex-1 truncate" />
                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(linkUrl, inv.id); }}
                          className="px-2.5 py-1.5 bg-gray-200 text-gray-700 rounded text-[11px] font-semibold hover:bg-gray-300 transition shrink-0">
                          {copiedId === inv.id ? 'Copiat!' : 'Copiaza'}
                        </button>
                      </div>

                      {/* Offer info */}
                      {(offer || inv.offerName) && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                          <span className="text-sm">{offer?.emoji || ''}</span>
                          <div>
                            <div className="text-[12px] font-semibold text-amber-800">{offer?.name || inv.offerName}</div>
                            <div className="text-[11px] text-amber-600">{offer?.newPrice || inv.offerPrice} lei {offer?.badge ? `(${offer.badge})` : ''}</div>
                          </div>
                        </div>
                      )}

                      {/* Funnel steps */}
                      <div className="bg-white rounded-lg p-3 mb-4">
                        <div className="text-[10px] text-gray-400 uppercase font-semibold mb-2">Funnel</div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <FunnelDot active={true} icon="1" label="Link trimis"
                            detail={formatDate(inv.createdAt)} />
                          <FunnelDot active={clicks > 0} icon="2" label="Deschis"
                            detail={clicks > 0 ? `${clicks}x ${inv.lastClickDevice === 'mobile' ? '(mob)' : '(PC)'}` : ''} />
                          <FunnelDot active={hasAccount} icon="3" label="Cont creat" detail="" />
                          <FunnelDot active={photoCount > 0} icon="4" label="Poze incarcate"
                            detail={photoCount > 0 ? `${photoCount} poze` : ''} />
                          <FunnelDot active={!!paidOrder} icon="5" label="Comanda"
                            detail={paidOrder ? paidOrder.status : ''} />
                        </div>
                        {clicks > 0 && inv.lastClickAt && (
                          <div className="text-[10px] text-gray-400 mt-2">
                            Ultimul click: {formatDate(inv.lastClickAt)} {inv.lastClickDevice === 'mobile' ? '(mobil)' : '(desktop)'}
                            {inv.firstClickAt && inv.firstClickAt !== inv.lastClickAt && (
                              <span> | Primul: {formatDate(inv.firstClickAt)}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Project details if exists */}
                      {bestProject && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
                          <div className="bg-white rounded-lg p-2.5">
                            <div className="text-gray-400 text-[10px] uppercase">Produs</div>
                            <div className="font-medium text-gray-800">{bestProject.productConfig?.name || 'N/A'}</div>
                            <div className="text-[10px] text-gray-400">{bestProject.productConfig?.format} {bestProject.productConfig?.initialPages && `| ${bestProject.productConfig.initialPages} pag`}</div>
                          </div>
                          <div className="bg-white rounded-lg p-2.5">
                            <div className="text-gray-400 text-[10px] uppercase">Poze</div>
                            <div className="font-medium text-gray-800 text-lg">{bestProject.totalPhotos || 0}</div>
                            <div className="text-[10px] text-gray-400">{bestProject.usedPhotos || 0} plasate</div>
                          </div>
                          <div className="bg-white rounded-lg p-2.5">
                            <div className="text-gray-400 text-[10px] uppercase">Progres</div>
                            <div className="font-medium text-gray-800 text-lg">{bestProject.progress || 0}%</div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div className={`h-1.5 rounded-full ${(bestProject.progress || 0) >= 50 ? 'bg-blue-500' : 'bg-orange-400'}`}
                                style={{ width: `${bestProject.progress || 0}%` }} />
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-2.5">
                            <div className="text-gray-400 text-[10px] uppercase">Ultima activitate</div>
                            <div className="font-medium text-gray-800">{timeAgo(bestProject.updatedAt || bestProject.createdAt)}</div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(linkUrl, `act-${inv.id}`); }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-[11px] font-semibold hover:bg-gray-200 transition">
                          {copiedId === `act-${inv.id}` ? 'Copiat!' : 'Copiaza link'}
                        </button>
                        <a href={`tel:${inv.phone}`} onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[11px] font-semibold hover:bg-green-700 transition">
                          Suna
                        </a>
                        {bestProject && bestProject.spreads?.length > 0 && (
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/admin_panel/editor/${bestProject.id}`); }}
                            className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-[11px] font-semibold hover:bg-gray-900 transition">
                            Deschide redactor
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}
                          className="px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-[11px] font-semibold hover:bg-red-50 transition ml-auto">
                          Sterge
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section C: Converted (paid) ── */}
      {convertedInvitations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 pb-3">
            <h3 className="text-sm font-semibold text-gray-500">Convertiti ({convertedInvitations.length})</h3>
            <p className="text-[11px] text-gray-400">Au achitat — acum sunt in "Toate comenzile"</p>
          </div>
          <div className="divide-y divide-gray-50">
            {convertedInvitations.map(({ inv, order }) => (
              <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 text-[13px]">{inv.name || 'N/A'}</span>
                    <span className="text-[11px] text-gray-400">{inv.phone}</span>
                    <PlatformBadge platform={inv.platform} />
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {order.orderNumber && <span className="font-medium text-gray-600">{order.orderNumber}</span>}
                    {order.priceTotal && <span className="ml-2">{order.priceTotal} lei</span>}
                    {order.orderedAt && <span className="ml-2">{formatDate(order.orderedAt)}</span>}
                    {inv.campaign && <span className="ml-2 text-gray-300">| {inv.campaign}</span>}
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full shrink-0">Achitat</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
