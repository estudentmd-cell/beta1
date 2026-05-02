import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useProjectStore from '../stores/useProjectStore';
import useEditorStore from '../stores/useEditorStore';
import useUIStore from '../stores/useUIStore';
import { getPagePrice } from '../utils/pricing';
import { useLivePricing } from '../hooks/usePricingAdmin';
import { formatPrice } from '../utils/format';
import { createProjectSnapshot, saveProject } from '../utils/projectStorage';
import { createOrder, addTimeline } from '../firebase/orders';
import { db } from '../firebase/config';
import { trackInitiateCheckout, trackPurchase, updateUserData } from '../utils/metaPixel';

export default function CheckoutScreen() {
  const navigate = useNavigate();
  const { clientName, clientPhone, clientEmail: storeEmail, user, userId, activeClientId, authMethod } = useAuthStore();
  const hasIdentity = user?.uid && (authMethod === 'email_code' || authMethod === 'google');
  const projectStore = useProjectStore();
  const { productConfig, currentSpreadCount, chosenPath, currentProjectId, coverTemplate } = projectStore;
  const { addToast, openModal } = useUIStore();

  const [formData, setFormData] = useState({
    name: clientName || user?.displayName || '',
    email: user?.email || '',
    phone: clientPhone?.replace('+373 ', '').replace('+373', '') || '',
    street: '',
    houseNr: '',
    city: 'Chișinău',
    zip: '',
    country: 'MD',
    payment: 'manager_call',
  });
  const [loading, setLoading] = useState(false);

  // Auth gate — must be logged in to checkout
  useEffect(() => {
    if (!hasIdentity) {
      openModal?.('auth', { mode: 'login', returnTo: '/app/checkout' });
    }
  }, [hasIdentity, openModal]);

  // Funnel tracking
  useEffect(() => { import('../utils/errorTracker').then(({ trackStep }) => trackStep('checkout')); }, []);

  // Meta Pixel — InitiateCheckout + Advanced Matching
  useEffect(() => {
    trackInitiateCheckout({
      productName: productConfig?.name,
      productSlug: productConfig?.slug,
      price: total || productConfig?.basePrice,
      user: {
        email: storeEmail || user?.email,
        phone: clientPhone,
        firstName: clientName?.split(' ')[0],
        lastName: clientName?.split(' ').slice(1).join(' '),
        externalId: userId,
      },
    });
    // Update Advanced Matching with checkout user data
    updateUserData({
      email: storeEmail || user?.email,
      phone: clientPhone,
      name: clientName,
      externalId: userId,
    });
  }, []);

  // Service is now determined before checkout (in the editor)
  const service = chosenPath === 'self' ? 'verify' : 'designer';

  if (!hasIdentity) return null;

  const pages = currentSpreadCount * 2 || productConfig.initialPages;
  const { getPrice: liveGetPrice } = useLivePricing();
  const calculatedPrice = liveGetPrice ? liveGetPrice(productConfig.format, pages, productConfig.slug) : getPagePrice(productConfig.format, pages, productConfig.slug);
  // Ofertă: dacă prețul din productConfig e diferit de cel calculat (vine din ofertă), folosim productConfig.basePrice
  const albumPrice = productConfig._offerId ? (productConfig.basePrice || calculatedPrice || 0) : (calculatedPrice || 0);
  const total = albumPrice;

  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const placeOrder = async () => {
    // Validation with scroll-to-error on mobile
    const fail = (msg, field) => {
      addToast(msg);
      // Scroll to the first invalid field
      const el = document.querySelector(`[data-field="${field}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    };
    if ((!formData.name?.trim() || formData.name.trim().split(' ').length < 2) && fail('Introdu numele și prenumele complet', 'name')) return;
    if ((!formData.phone || formData.phone.replace(/\D/g, '').length < 6) && fail('Introdu numărul de telefon', 'phone')) return;
    if (!formData.email?.includes('@') && fail('Introdu un email valid', 'email')) return;
    if (!formData.city?.trim() && fail('Introdu orașul sau satul', 'city')) return;
    if (!formData.street.trim() && fail('Introdu strada (ex: str. Alba Iulia)', 'street')) return;
    if (!formData.houseNr.trim() && fail('Introdu nr. casei / apartamentului', 'houseNr')) return;

    setLoading(true);
    try {
      // Validare critică — fără proiect activ nu se poate plasa comanda
      let resolvedProjectId = currentProjectId;
      if (!resolvedProjectId) {
        const restored = sessionStorage.getItem('fc_projectId');
        if (restored) {
          useProjectStore.getState().setProject(restored, null);
          resolvedProjectId = restored;
        }
      }
      if (!resolvedProjectId) {
        addToast('Proiectul nu a fost găsit. Te redirecționăm la editor.');
        setLoading(false);
        navigate('/app/editor');
        return;
      }

      const editorState = useEditorStore.getState();
      const snapshot = createProjectSnapshot(resolvedProjectId, useProjectStore.getState(), editorState);

      const status = 'awaiting_payment';
      const statusLabel = 'Așteaptă achitarea';

      const normalizedPhone = '+373' + formData.phone.replace(/\D/g, '').slice(-8);
      const normalizedEmail = formData.email.toLowerCase().trim();

      const orderData = {
        ...snapshot, status, statusLabel,
        orderType: service === 'verify' ? 'self' : 'designer',
        serviceLevel: service === 'verify' ? 'verify_only' : 'full_design',
        paymentMethod: formData.payment, paymentStatus: 'awaiting_payment',
        clientName: formData.name.trim(), clientPhone: normalizedPhone, clientEmail: normalizedEmail,
        client_id: activeClientId || userId || user?.uid || null, activeClientId: activeClientId || userId || user?.uid || null, client_phone: normalizedPhone,
        address: { street: formData.street, houseNr: formData.houseNr, city: formData.city, zip: formData.zip, country: formData.country },
        priceAlbum: albumPrice, priceDesign: 0, priceTotal: total,
        orderedAt: new Date().toISOString(),
      };

      const orderId = resolvedProjectId;
      // Generate unique order number: FC-XXXXX (timestamp-based, no duplicates)
      const ts = Date.now().toString(36).toUpperCase().slice(-5);
      const orderNumber = `FC-${ts}`;
      orderData.orderNumber = orderNumber;
      orderData.id = orderId;

      // Link invite slug to order (for tracking invite → order conversion)
      try {
        const inviteSlug = localStorage.getItem('fc_invite_slug');
        if (inviteSlug) orderData.inviteSlug = inviteSlug;
      } catch {}

      console.log('[Checkout] client_id:', orderData.client_id, 'activeClientId:', activeClientId, 'userId:', userId, 'user.uid:', user?.uid);

      // Write to orders collection — strip undefined values (Firestore rejects them)
      if (db) {
        const { doc, setDoc } = await import('firebase/firestore');
        const clean = JSON.parse(JSON.stringify(orderData)); // strips undefined + non-serializable
        await setDoc(doc(db, 'orders', orderId), { ...clean, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { merge: true });
      }

      // Update the EXISTING project with paid status (not create a new one)
      await saveProject(orderData);
      await addTimeline(orderId, 'order_created', `Comandă ${orderId} creată`);

      // Client is already authenticated before checkout (email_code or google)
      const finalClientId = userId || user?.uid;

      useAuthStore.setState({
        clientName: formData.name.trim(), clientPhone: normalizedPhone,
        clientEmail: normalizedEmail,
      });

      // Funnel tracking — order placed
      import('../utils/errorTracker').then(({ trackStep }) => trackStep('order_placed', { orderId, total })).catch(() => {});

      // Meta Pixel — Purchase (cel mai important event)
      trackPurchase({
        orderId,
        orderNumber,
        productName: productConfig?.name || 'Album foto',
        productSlug: productConfig?.slug || 'album',
        price: total,
        format: productConfig?.format,
        pages,
        service,
        user: {
          email: normalizedEmail,
          phone: normalizedPhone,
          firstName: formData.name.trim().split(' ')[0],
          lastName: formData.name.trim().split(' ').slice(1).join(' '),
          externalId: activeClientId || userId || user?.uid,
          city: formData.city,
          country: formData.country,
          zip: formData.zip,
        },
      });

      // Send order confirmation email via Cloud Function
      import('firebase/functions').then(({ getFunctions, httpsCallable }) => {
        const functions = getFunctions(undefined, 'europe-west1');
        const sendOrderEmail = httpsCallable(functions, 'sendOrderEmail');
        sendOrderEmail({
          to: normalizedEmail,
          templateId: 'order_confirmed',
          clientId: activeClientId || userId || user?.uid || null,
          variables: {
            clientName: formData.name.trim(),
            orderId,
            orderNumber,
            productName: productConfig?.name || 'Album foto',
            format: productConfig?.format || '20x20',
            pages: String(pages || productConfig?.initialPages || 40),
            price: String(total),
            service: service === 'verify' ? 'Verificare album' : 'Serviciu designer',
            paymentMethod: formData.payment === 'card' ? 'Card bancar' : 'Transfer bancar',
            address: `${formData.street} ${formData.houseNr}, ${formData.city}${formData.country ? ', ' + formData.country : ''}`,
            coverImage: [
              coverTemplate?.coverStyle?.mockupImage,
              coverTemplate?.coverStyle?.previewImage,
              coverTemplate?.coverStyle?.designSquare,
              coverTemplate?.coverStyle?.bgImage,
            ].find(u => u && u.startsWith('http')) || '',
            coverName: coverTemplate?.name || productConfig?.coverName || '',
            siteUrl: window.location.origin,
          },
        }).catch(e => console.warn('Order email failed:', e));
      });

      // Persist order data for page refresh resilience
      const confirmState = {
        orderId,
        orderNumber,
        clientEmail: normalizedEmail,
        clientName: formData.name.trim(),
        clientId: finalClientId,
        productName: productConfig?.name || 'Album foto',
        format: productConfig?.format || '20×20',
        pages: pages || productConfig?.initialPages || 40,
        coverName: productConfig?.coverName || coverTemplate?.name || '',
        price: total,
        service: service === 'verify' ? 'Verificare' : 'Design complet',
      };
      try { localStorage.setItem('fc_last_order', JSON.stringify(confirmState)); } catch {}

      navigate('/app/confirm-designer', { state: confirmState });
    } catch (e) {
      console.error('Failed to place order', e);
      const msg = e?.message || '';
      if (msg.includes('document') || msg.includes('path')) {
        addToast('Proiectul nu a fost găsit. Revino la editor și încearcă din nou.');
      } else if (msg.includes('network') || msg.includes('fetch')) {
        addToast('Verifică conexiunea la internet și încearcă din nou.');
      } else {
        addToast('Eroare la plasarea comenzii. Încearcă din nou.');
      }
    } finally { setLoading(false); }
  };

  const outfit = { fontFamily: 'Outfit, sans-serif' };
  const inputCls = 'w-full h-[52px] bg-white border border-[#E4E4E4] rounded-xl px-4 text-[15px] outline-none focus:border-[#3D6B5E] focus:ring-2 focus:ring-[#3D6B5E]/10 transition placeholder:text-gray-300';
  const labelCls = 'block text-[13px] font-semibold text-[#585858] mb-1.5';

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-start justify-center pt-6 pb-10 px-4">
      <div className="w-full max-w-[900px] lg:max-w-[1000px] xl:max-w-[1100px]">
        {/* Back + title */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(currentProjectId ? `/app/editor/${currentProjectId}` : '/app/editor')}
            className="text-[14px] text-[#585858] hover:text-[#2E2E2E] flex items-center gap-1 transition"
            style={outfit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            Înapoi
          </button>
          <h1 className="text-[24px] sm:text-[28px] font-bold text-[#2E2E2E]" style={outfit}>Finalizează comanda</h1>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* ── Mobile: Summary first ── */}
          <div className="lg:hidden order-1 w-full">
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 5px 40px rgba(0,0,0,0.06)' }}>
              {/* Product */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F0F0F0]">
                <span className="text-2xl">📖</span>
                <div>
                  <p className="font-bold text-[14px] text-[#2E2E2E]" style={outfit}>{productConfig.name}</p>
                  <p className="text-[12px] text-[#969696]" style={outfit}>{productConfig.format} · {pages} pag</p>
                </div>
              </div>
              {/* Price lines */}
              <div className="space-y-2 mb-4 pb-4 border-b border-[#F0F0F0] text-[14px]">
                <div className="flex justify-between"><span className="text-[#585858]" style={outfit}>Album</span><span className="font-medium text-[#2E2E2E]" style={outfit}>{formatPrice(albumPrice)}</span></div>
                <div className="flex justify-between"><span className="text-[#585858]" style={outfit}>Serviciu</span><span className="font-medium text-[#2E2E2E]" style={outfit}>{service === 'designer' ? 'Designer aranjează' : 'Verificare album'}</span></div>
                <div className="flex justify-between"><span className="text-[#585858]" style={outfit}>Livrare</span><span className="text-[#3D6B5E] font-semibold" style={outfit}>Gratuită</span></div>
              </div>
              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="font-bold text-[16px] text-[#2E2E2E]" style={outfit}>Total</span>
                <span className="font-bold text-[24px] text-[#2E2E2E]" style={outfit}>{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          {/* ── LEFT — Form ── */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 order-2 lg:order-1" style={{ boxShadow: '0 5px 40px rgba(0,0,0,0.06)' }}>
            {/* Contact — 2-col on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls} style={outfit}>Nume și prenume <span className="text-red-400">*</span></label>
                <input type="text" data-field="name" value={formData.name} onChange={(e) => update('name', e.target.value)}
                  placeholder="Popescu Maria"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls} style={outfit}>Telefon <span className="text-red-400">*</span></label>
                <div className="flex">
                  <span className="h-[52px] bg-[#FAFAFA] border border-r-0 border-[#E4E4E4] rounded-l-xl px-3 flex items-center text-[15px] text-[#585858] font-medium select-none" style={outfit}>+373</span>
                  <input type="tel" inputMode="numeric" data-field="phone" value={formData.phone} onChange={(e) => update('phone', e.target.value)}
                    placeholder="69 123 456" maxLength="12"
                    className="flex-1 h-[52px] bg-white border border-l-0 border-[#E4E4E4] rounded-r-xl px-4 text-[15px] outline-none focus:border-[#3D6B5E] focus:ring-2 focus:ring-[#3D6B5E]/10 transition placeholder:text-gray-300 min-w-0" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls} style={outfit}>Email <span className="text-red-400">*</span></label>
                <input type="email" data-field="email" value={formData.email} onChange={(e) => update('email', e.target.value)}
                  placeholder="exemplu@gmail.com"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls} style={outfit}>Oraș / Sat <span className="text-red-400">*</span></label>
                <input type="text" data-field="city" value={formData.city} onChange={(e) => update('city', e.target.value)}
                  placeholder="Chișinău"
                  className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-[1fr,auto] gap-3 mb-5">
              <div>
                <label className={labelCls} style={outfit}>Strada <span className="text-red-400">*</span></label>
                <input type="text" data-field="street" value={formData.street} onChange={(e) => update('street', e.target.value)}
                  placeholder="str. Alba Iulia"
                  className={inputCls} />
              </div>
              <div className="w-[100px] sm:w-[120px]">
                <label className={labelCls} style={outfit}>Nr. <span className="text-red-400">*</span></label>
                <input type="text" data-field="houseNr" value={formData.houseNr} onChange={(e) => update('houseNr', e.target.value)}
                  placeholder="97/2"
                  className={inputCls} />
              </div>
            </div>

            {/* Info banner */}
            <div className="bg-[#FAFAFA] border border-[#E4E4E4] rounded-xl px-4 py-3.5 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#3D6B5E] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[13px] text-[#585858] leading-relaxed" style={outfit}>
                După plasarea comenzii, managerul te va contacta pentru confirmare și generare factură.
              </p>
            </div>
          </div>

          {/* ── RIGHT — Summary sticky (desktop only) ── */}
          <div className="hidden lg:block lg:sticky lg:top-20 order-2">
            <div className="bg-white rounded-2xl p-6 sm:p-8" style={{ boxShadow: '0 5px 40px rgba(0,0,0,0.06)' }}>
              {/* Product */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#F0F0F0]">
                <span className="text-2xl">📖</span>
                <div>
                  <p className="font-bold text-[14px] text-[#2E2E2E]" style={outfit}>{productConfig.name}</p>
                  <p className="text-[12px] text-[#969696]" style={outfit}>{productConfig.format} · {pages} pag</p>
                </div>
              </div>

              {/* Price lines */}
              <div className="space-y-2.5 mb-5 pb-4 border-b border-[#F0F0F0] text-[14px]">
                <div className="flex justify-between">
                  <span className="text-[#585858]" style={outfit}>Album</span>
                  <span className="font-medium text-[#2E2E2E]" style={outfit}>{formatPrice(albumPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#585858]" style={outfit}>Serviciu</span>
                  <span className="font-medium text-[#2E2E2E]" style={outfit}>{service === 'designer' ? 'Designer aranjează' : 'Verificare album'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#585858]" style={outfit}>Livrare</span>
                  <span className="text-[#3D6B5E] font-semibold" style={outfit}>Gratuită</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center mb-5">
                <span className="font-bold text-[16px] text-[#2E2E2E]" style={outfit}>Total</span>
                <span className="font-bold text-[24px] text-[#2E2E2E]" style={outfit}>{formatPrice(total)}</span>
              </div>

              {/* CTA */}
              <button onClick={placeOrder} disabled={loading}
                className={`w-full h-[56px] rounded-xl bg-[#1C1C1E] text-white text-[15px] font-semibold transition-all ${
                  loading ? 'opacity-50' : 'hover:bg-[#333] active:scale-[0.98]'
                }`}
                style={outfit}>
                {loading ? 'Se procesează...' : `Plasează comanda — ${formatPrice(total)}`}
              </button>
              <p className="text-center text-[12px] text-[#969696] mt-3" style={outfit}>Plată securizată</p>
            </div>

            {/* Delivery estimate */}
            <div className="mt-4 bg-[#FAFAFA] rounded-xl border border-[#E4E4E4] px-5 py-3.5 flex items-center gap-2.5">
              <span className="text-base">📦</span>
              <p className="text-[13px] text-[#585858]" style={outfit}>Livrare estimată în <strong className="text-[#2E2E2E]">18 zile lucrătoare</strong></p>
            </div>
          </div>

          {/* ── Mobile: Sticky CTA at bottom ── */}
          <div className="lg:hidden order-3 sticky bottom-0 w-full pt-3 bg-gradient-to-t from-[#F7F7F7] via-[#F7F7F7] to-transparent"
            style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
            <button onClick={placeOrder} disabled={loading}
              className={`w-full h-[56px] rounded-xl bg-[#1C1C1E] text-white text-[15px] font-semibold transition-all ${
                loading ? 'opacity-50' : 'hover:bg-[#333] active:scale-[0.98]'
              }`}
              style={outfit}>
              {loading ? 'Se procesează...' : `Plasează comanda — ${formatPrice(total)}`}
            </button>
            <p className="text-center text-[12px] text-[#969696] mt-2" style={outfit}>Plată securizată</p>
          </div>
        </div>
      </div>
    </div>
  );
}
