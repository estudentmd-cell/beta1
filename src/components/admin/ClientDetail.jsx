import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClientOrders, getAllClients, getAllClientsAsync, getContactLog, addContactEntry, CONTACT_OUTCOMES, calculateSLA, deleteClient, deleteOrder } from '../../utils/adminData';
import StatusBadge, { getSalesAction } from './StatusBadge';
import SLABadge from './SLABadge';

/* ── Journey Diagnostic — practic, cu acțiuni concrete ── */
const STEPS = [
  { key: 'registered', label: 'Înregistrat', short: 'Cont' },
  { key: 'uploaded',   label: 'Poze încărcate', short: 'Upload' },
  { key: 'editing',    label: 'Editează albumul', short: 'Editare' },
  { key: 'checkout',   label: 'A comandat', short: 'Comandă' },
  { key: 'paid',       label: 'A achitat', short: 'Plată' },
  { key: 'designer',   label: 'Designer lucrează', short: 'Designer' },
  { key: 'approval',   label: 'Așteaptă aprobare', short: 'Aprobare' },
  { key: 'print',      label: 'La tipar / expediat', short: 'Tipar' },
  { key: 'delivered',  label: 'Livrat', short: 'Livrat' },
];

function diagnoseOrder(order) {
  if (!order) return { step: 0, label: 'Doar cont', situation: 'S-a înregistrat dar nu a făcut nimic.', action: null, urgency: 'low' };

  const s = order.status;
  const photos = order.totalPhotos || 0;
  const used = order.usedPhotos || 0;
  const progress = order.progress || 0;
  const filled = order.filledSpreads || 0;
  const total = order.totalSpreads || 0;
  const ts = order.updatedAt || order.updated_at || order.createdAt || order.created_at;
  const hrs = ts ? (Date.now() - new Date(ts).getTime()) / 3600000 : 0;
  const days = Math.floor(hrs / 24);
  const stuckText = days > 0 ? `de ${days} zile` : hrs > 1 ? `de ${Math.floor(hrs)}h` : 'recent';

  // ── LIVRAT ──
  if (s === 'delivered' || s === 'livrat')
    return { step: 8, label: 'Livrat', situation: 'Comanda finalizată cu succes.', action: null, urgency: 'done', stuckText: null };

  // ── EXPEDIAT ──
  if (s === 'shipped')
    return { step: 7, label: 'Expediat', situation: `Coletul e în drum ${stuckText}.`, action: 'Verifică tracking-ul dacă au trecut >3 zile', urgency: days > 3 ? 'medium' : 'low', stuckText };

  // ── LA TIPAR ──
  if (s === 'in_print')
    return { step: 7, label: 'La tipar', situation: `Albumul se tipărește ${stuckText}.`, action: days > 5 ? 'Sună tipografia — durează prea mult' : null, urgency: days > 5 ? 'medium' : 'low', stuckText };

  if (s === 'approved_print' || s === 'print_ready')
    return { step: 7, label: 'Gata de tipar', situation: `Macheta aprobată ${stuckText}, așteaptă trimis la tipar.`, action: 'Trimite la tipografie ACUM', urgency: days > 1 ? 'high' : 'medium', stuckText };

  // ── APROBARE CLIENT ──
  if (s === 'pending_client_approval')
    return { step: 6, label: 'Așteaptă aprobarea', situation: `Macheta e gata ${stuckText}. Clientul nu a verificat-o.`, action: `Sună: "Macheta albumului e gata, verificați-o în cabinet"`, urgency: days > 2 ? 'high' : days > 0 ? 'medium' : 'low', stuckText };

  if (s === 'revision_requested')
    return { step: 6, label: 'Cere modificări', situation: `Clientul a cerut revizuire ${stuckText}. ${order.revisionMessage ? `Mesaj: "${order.revisionMessage}"` : ''}`, action: 'Aplică modificările și retrimite', urgency: days > 1 ? 'high' : 'medium', stuckText };

  // ── DESIGNER ──
  if (s === 'designer_working')
    return { step: 5, label: 'Designer lucrează', situation: `${order.designer || 'Neasignat'} lucrează ${stuckText}. ${photos} poze, ${progress}% progres.`, action: days > 3 ? `Verifică cu ${order.designer || 'designerul'} — durează prea mult` : null, urgency: days > 3 ? 'medium' : 'low', stuckText };

  // ── ACHITAT ──
  if (s === 'paid_pending_designer' || s === 'paid_pending_verification')
    return { step: 4, label: 'Achitat, așteaptă designer', situation: `Plata confirmată ${stuckText}. Trebuie asignat designer.`, action: 'Asignează designer ACUM', urgency: days > 0 ? 'high' : 'medium', stuckText };

  // ── CHECKOUT / AȘTEAPTĂ PLATA ──
  if (s === 'awaiting_payment')
    return { step: 3, label: 'Așteaptă plata', situation: `A comandat ${stuckText} dar nu a achitat. ${photos} poze, ${progress}% progres.`, action: `Sună: "Comanda e în așteptare, cum doriți să achitați?"`, urgency: days > 1 ? 'high' : 'medium', stuckText };

  // ── DRAFT — granular ──
  // Editează activ
  if (progress > 0 || used > 0) {
    const pagesInfo = total > 0 ? `${filled}/${total} pagini completate` : '';
    if (progress >= 80) {
      return { step: 2, label: `Editare ${progress}%`, situation: `Aproape gata! ${progress}% completat, ${used}/${photos} poze plasate. ${pagesInfo}. Blocat ${stuckText}.`, action: days > 1 ? `Sună: "Albumul e aproape gata (${progress}%), vă ajut să finalizați?"` : null, urgency: days > 1 ? 'high' : 'low', stuckText };
    }
    if (progress >= 40) {
      return { step: 2, label: `Editare ${progress}%`, situation: `La jumătate: ${progress}% completat, ${used}/${photos} poze plasate. ${pagesInfo}. Activ ${stuckText}.`, action: days > 2 ? `Sună: "Cum merge albumul? Pot ajuta cu aranjarea?"` : null, urgency: days > 3 ? 'medium' : 'low', stuckText };
    }
    return { step: 2, label: `Editare ${progress}%`, situation: `Abia a început: ${progress}%, doar ${used}/${photos} poze plasate. ${pagesInfo}. Activ ${stuckText}.`, action: days > 2 ? `Sună: "Văd că ați început albumul. Vreți ajutor sau propun un designer?"` : null, urgency: days > 3 ? 'medium' : 'low', stuckText };
  }

  // Are poze dar nu le-a plasat
  if (photos > 0) {
    return { step: 1, label: `${photos} poze uploadate`, situation: `A încărcat ${photos} poze dar nu a plasat niciuna în album. Blocat ${stuckText}.`, action: days > 1 ? `Sună: "${photos} poze încărcate, vă arăt cum se aranjează în album?"` : null, urgency: days > 1 ? (photos >= 15 ? 'high' : 'medium') : 'low', stuckText };
  }

  // Doar cont
  return { step: 0, label: 'Doar cont creat', situation: `S-a înregistrat ${stuckText} dar nu a încărcat nicio poză.`, action: days > 1 ? 'Sună: "Ați creat cont pe Fotocarte, vă pot ajuta să începeți?"' : null, urgency: days > 2 ? 'medium' : 'low', stuckText };
}

function JourneyCard({ order, phone, navigate }) {
  const d = diagnoseOrder(order);
  const urgencyStyles = {
    high:   'border-red-300 bg-red-50/50',
    medium: 'border-amber-300 bg-amber-50/30',
    low:    'border-gray-200 bg-white',
    done:   'border-green-300 bg-green-50/30',
  };
  const urgencyDot = {
    high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-gray-300', done: 'bg-green-500',
  };

  return (
    <div className={`rounded-xl border-2 p-4 ${urgencyStyles[d.urgency]}`}>
      {/* Step progress bar */}
      <div className="flex items-center gap-1 mb-3">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center flex-1 min-w-0 last:flex-none">
            <div className={`h-1.5 flex-1 rounded-full ${
              i < d.step ? 'bg-[#3D6B5E]' : i === d.step ? 'bg-[#3D6B5E]/40' : 'bg-gray-200'
            }`} title={step.label} />
          </div>
        ))}
      </div>

      {/* Current step label */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${urgencyDot[d.urgency]}`} />
        <span className="text-sm font-bold text-gray-900">
          Pas {d.step + 1}/9: {d.label}
        </span>
        {d.stuckText && <span className="text-xs text-gray-400">{d.stuckText}</span>}
      </div>

      {/* Situation */}
      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{d.situation}</p>

      {/* Action */}
      {d.action && (
        <div className={`rounded-lg p-3 mb-3 ${d.urgency === 'high' ? 'bg-red-100' : 'bg-amber-100'}`}>
          <div className="text-xs font-bold text-gray-700 mb-0.5">Ce trebuie să faci:</div>
          <div className={`text-sm font-medium ${d.urgency === 'high' ? 'text-red-800' : 'text-amber-800'}`}>{d.action}</div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {phone && d.action && (
          <a href={`tel:${phone}`}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition ${
              d.urgency === 'high' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-[#3D6B5E] text-white hover:bg-[#2d5246]'
            }`}>
            📞 Sună acum
          </a>
        )}
        {order && order.id && (
          <button onClick={() => navigate(`/admin_panel/orders/${order.id}`)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
            Deschide comanda
          </button>
        )}
        {order && order.id && d.step >= 1 && d.step <= 2 && (
          <button onClick={() => navigate(`/admin_panel/editor/${order.id}`)}
            className="px-3 py-2 border border-blue-300 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 transition">
            Vezi albumul lui
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Email Timeline — ce emailuri a primit clientul ── */
const EMAIL_CATALOG = [
  { id: 'auth_code',         label: 'Cod de verificare',        icon: '🔐', subject: 'Codul tau Fotocarte', auto: true },
  { id: 'order_confirmed',   label: 'Confirmare comandă',       icon: '🛒', subject: 'Comanda ta {{orderNumber}} a fost înregistrată!' },
  { id: 'draft_reminder',    label: 'Reminder: finalizează',     icon: '⏰', subject: '{{name}}, pozele tale sunt gata!', auto: true },
  { id: 'draft_reminder_2',  label: 'Reminder 2: albumul te așteaptă', icon: '⏰', subject: '{{name}}, albumul tau te asteapta', auto: true },
  { id: 'payment_reminder_1',label: 'Reminder plată #1',        icon: '💳', subject: 'Comanda {{orderNumber}} — te contactam', auto: true },
  { id: 'payment_reminder_2',label: 'Reminder plată #2',        icon: '💳', subject: '{{name}}, comanda ta te asteapta', auto: true },
  { id: 'payment_confirmed', label: 'Plata confirmată',          icon: '💰', subject: 'Am primit plata — comanda {{orderNumber}}' },
  { id: 'designer_assigned', label: 'Designer asignat',          icon: '✏️', subject: 'Designerul lucrează la albumul tău' },
  { id: 'ready_for_approval',label: 'Macheta gata — verifică',  icon: '✅', subject: 'Albumul tău este gata! Verifică macheta' },
  { id: 'sent_to_print',     label: 'Trimis la tipar',          icon: '🖨', subject: 'Albumul tău a fost trimis la tipar!' },
  { id: 'in_print',          label: 'La tipografie',             icon: '🏭', subject: 'Albumul tău este la tipar!' },
  { id: 'shipped',           label: 'Expediat',                  icon: '📦', subject: 'Albumul tău a fost expediat!' },
  { id: 'delivered',         label: 'Livrat',                    icon: '🎉', subject: 'Albumul tău a ajuns!' },
  { id: 'review_request',    label: 'Cerere recenzie',           icon: '⭐', subject: '{{name}}, cum a fost albumul?', auto: true },
];

// Deduce what emails were sent based on order data (flags + status history)
function getEmailsForOrder(order) {
  const emails = [];
  const s = order.status;
  const statusOrder = ['draft', 'awaiting_payment', 'paid_pending_designer', 'paid_pending_verification', 'designer_working', 'pending_client_approval', 'revision_requested', 'approved_print', 'in_print', 'shipped', 'delivered'];
  const statusIdx = statusOrder.indexOf(s);

  // Auth code — always sent if client exists
  emails.push({ id: 'auth_code', sent: true, date: order.createdAt || order.created_at });

  // Draft reminders (based on flags)
  emails.push({ id: 'draft_reminder', sent: !!order.reminderSent, date: order.reminderSentAt });
  emails.push({ id: 'draft_reminder_2', sent: !!order.reminder2Sent, date: order.reminder2SentAt });

  // Order confirmed — sent at checkout
  const hasOrdered = statusIdx >= 1; // awaiting_payment or beyond
  emails.push({ id: 'order_confirmed', sent: hasOrdered, date: order.orderedAt });

  // Payment reminders
  emails.push({ id: 'payment_reminder_1', sent: !!order.paymentReminder1Sent, date: order.paymentReminder1SentAt });
  emails.push({ id: 'payment_reminder_2', sent: !!order.paymentReminder2Sent, date: order.paymentReminder2SentAt });

  // Status-triggered emails
  const hasPaid = statusIdx >= 2;
  emails.push({ id: 'payment_confirmed', sent: hasPaid, date: order.paidAt });

  const hasDesigner = statusIdx >= 4;
  emails.push({ id: 'designer_assigned', sent: hasDesigner });

  const hasApproval = statusIdx >= 5;
  emails.push({ id: 'ready_for_approval', sent: hasApproval });

  const hasPrint = statusIdx >= 7;
  emails.push({ id: 'sent_to_print', sent: hasPrint });

  const hasInPrint = statusIdx >= 8;
  emails.push({ id: 'in_print', sent: hasInPrint });

  const hasShipped = statusIdx >= 9;
  emails.push({ id: 'shipped', sent: hasShipped });

  const hasDelivered = statusIdx >= 10;
  emails.push({ id: 'delivered', sent: hasDelivered });

  // Review request
  emails.push({ id: 'review_request', sent: !!order.reviewReminderSent, date: order.reviewReminderSentAt });

  return emails;
}

function EmailTimeline({ orders }) {
  // Merge email data from all orders
  const allEmails = new Map();

  for (const order of orders) {
    const emails = getEmailsForOrder(order);
    for (const e of emails) {
      const existing = allEmails.get(e.id);
      // Keep the one that was sent, or if both sent keep latest
      if (!existing || (e.sent && !existing.sent) || (e.sent && existing.sent && e.date > existing.date)) {
        allEmails.set(e.id, { ...e, orderId: order.orderNumber || order.id?.slice(0, 8) });
      }
    }
  }

  const sentCount = [...allEmails.values()].filter(e => e.sent).length;
  const totalCount = EMAIL_CATALOG.length;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">📧 Emailuri primite ({sentCount}/{totalCount})</h3>
      </div>

      <div className="space-y-1">
        {EMAIL_CATALOG.map((template) => {
          const data = allEmails.get(template.id);
          const sent = data?.sent;
          const date = data?.date;

          return (
            <div key={template.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
              sent ? 'bg-green-50/50' : 'bg-gray-50'
            }`}>
              {/* Status indicator */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                sent ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {sent ? '✓' : '—'}
              </div>

              {/* Icon */}
              <span className="text-sm">{template.icon}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${sent ? 'text-gray-900' : 'text-gray-400'}`}>
                    {template.label}
                  </span>
                  {template.auto && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-medium">auto</span>
                  )}
                </div>
                <div className={`text-xs ${sent ? 'text-gray-500' : 'text-gray-300'}`}>
                  {template.subject}
                </div>
              </div>

              {/* Date */}
              <div className="text-right shrink-0">
                {sent && date ? (
                  <span className="text-[10px] text-gray-400">
                    {new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })}
                  </span>
                ) : sent ? (
                  <span className="text-[10px] text-green-500">trimis</span>
                ) : (
                  <span className="text-[10px] text-gray-300">nu încă</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return 'Niciodată';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Acum';
  if (m < 60) return `Acum ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Acum ${h}h`;
  const d = Math.floor(h / 24);
  return `Acum ${d} zile`;
}

// Client type badge
function ClientTypeBadge({ type, totalSpent }) {
  if (totalSpent >= 3000) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">VIP</span>;
  }
  if (type === 'lead') {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">LEAD</span>;
  }
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">CLIENT</span>;
}

// Group orders by status stage
function groupOrdersByStage(orders) {
  const groups = {
    active: { label: 'In lucru', color: 'border-l-blue-400', orders: [] },
    awaiting: { label: 'Așteaptă acțiune', color: 'border-l-amber-400', orders: [] },
    production: { label: 'Producție & Livrare', color: 'border-l-green-500', orders: [] },
    draft: { label: 'Drafturi', color: 'border-l-gray-300', orders: [] },
    completed: { label: 'Finalizate', color: 'border-l-[#3D6B5E]', orders: [] },
  };

  for (const o of orders) {
    switch (o.status) {
      case 'designer_working':
      case 'revision_requested':
        groups.active.orders.push(o);
        break;
      case 'awaiting_payment':
      case 'paid_pending_designer':
      case 'paid_pending_verification':
      case 'pending_client_approval':
        groups.awaiting.orders.push(o);
        break;
      case 'approved_print':
      case 'in_print':
      case 'shipped':
        groups.production.orders.push(o);
        break;
      case 'delivered':
        groups.completed.orders.push(o);
        break;
      default:
        groups.draft.orders.push(o);
    }
  }

  return groups;
}

export default function ClientDetail() {
  const { clientId } = useParams();
  const selectedClientId = clientId ? decodeURIComponent(clientId) : null;
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [contactHistory, setContactHistory] = useState([]);
  const [showCallLog, setShowCallLog] = useState(false);
  const [callOutcome, setCallOutcome] = useState('');
  const [callNote, setCallNote] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  useEffect(() => {
    if (!selectedClientId) return;

    const allClients = getAllClients();
    const found = allClients.find(
      (c) => c.phone === selectedClientId || c.phone?.replace(/\D/g, '').slice(-8) === selectedClientId?.replace?.(/\D/g, '')?.slice?.(-8)
    );
    setClient(found || { name: 'Necunoscut', phone: selectedClientId });

    const clientOrders = getClientOrders(selectedClientId);
    setOrders(clientOrders);
    setContactHistory(getContactLog(selectedClientId));

    // Also fetch async data from Firestore
    getAllClientsAsync().then((clients) => {
      const asyncFound = clients.find(
        (c) => c.phone === selectedClientId || c.phone?.replace(/\D/g, '').slice(-8) === selectedClientId?.replace?.(/\D/g, '')?.slice?.(-8)
          || c.email === selectedClientId || c.id === selectedClientId
      );
      if (asyncFound) setClient(asyncFound);
    }).catch(() => {});

    // Fetch orders from Firestore (not just localStorage)
    import('../../utils/adminData').then(({ getAllOrdersAsync }) => {
      getAllOrdersAsync().then(allOrders => {
        const last8 = selectedClientId.replace(/\D/g, '').slice(-8);
        const matched = allOrders.filter(o => {
          const phone = (o.clientPhone || o.client_phone || '').replace(/\D/g, '').slice(-8);
          const email = (o.clientEmail || '').toLowerCase();
          const cid = o.client_id || o.activeClientId || '';
          return (phone && phone === last8)
            || (email && email === selectedClientId.toLowerCase())
            || cid === selectedClientId;
        });
        if (matched.length > 0) setOrders(matched);
      });
    }).catch(() => {});
  }, [selectedClientId]);

  function handleCallLog() {
    if (!callOutcome || !client?.phone) return;
    const bestOrder = orders[0];
    addContactEntry(client.phone, client.name, bestOrder?.id || '', callOutcome, callNote.trim());
    setContactHistory(getContactLog(client.phone));
    setCallOutcome('');
    setCallNote('');
    setShowCallLog(false);
  }

  if (!client) return null;

  const firstOrderDate = orders.length
    ? orders.reduce((earliest, o) => {
        const d = o.createdAt;
        return d && (!earliest || d < earliest) ? d : earliest;
      }, null)
    : null;

  const bestDraft = orders
    .filter(o => o.status === 'draft')
    .sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];
  const salesAction = bestDraft ? getSalesAction(bestDraft) : null;

  const totalPhotos = orders.reduce((sum, o) => sum + (o.totalPhotos || 0), 0);
  const totalSpent = orders.reduce((sum, o) => sum + (o.priceTotal || 0), 0);
  const paidOrders = orders.filter(o => o.status && o.status !== 'draft');
  const orderGroups = groupOrdersByStage(orders);

  return (
    <div>
      <button onClick={() => navigate('/admin_panel/clients')}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4 cursor-pointer">
        ← Înapoi la Clienți
      </button>

      {/* ── Client Header ── */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-[#3D6B5E] text-white flex items-center justify-center text-xl font-bold shrink-0">
              {(client.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-gray-900">{client.name || 'Necunoscut'}</h2>
                <ClientTypeBadge type={client.type} totalSpent={totalSpent} />
                {salesAction && salesAction.priority !== 'none' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    salesAction.priority === 'hot' ? 'bg-red-100 text-red-700' :
                    salesAction.priority === 'warm' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>{salesAction.priority.toUpperCase()}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="text-[#3D6B5E] font-medium hover:underline">
                    📞 {client.phone}
                  </a>
                )}
                {client.email && <span>📧 {client.email}</span>}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6 text-center">
            <div>
              <div className="text-xl font-bold text-gray-900">{orders.length}</div>
              <div className="text-[10px] text-gray-400">Comenzi</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{totalPhotos}</div>
              <div className="text-[10px] text-gray-400">Poze</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-600">{totalSpent} lei</div>
              <div className="text-[10px] text-gray-400">Cheltuit</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">{firstOrderDate ? new Date(firstOrderDate).toLocaleDateString('ro-RO') : '—'}</div>
              <div className="text-[10px] text-gray-400">Client din</div>
            </div>
          </div>

          {/* Șterge client */}
          <button onClick={() => {
            if (confirm(`Sigur ștergi clientul ${client.name} (${client.phone}) cu TOATE comenzile și datele? Ireversibil!`)) {
              deleteClient(client.phone).then(() => navigate('/admin_panel/orders'));
            }}}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition shrink-0">
            🗑 Șterge client
          </button>
        </div>
      </div>

      {/* ── Diagnostic Journey — comanda principală ── */}
      {orders.length > 0 && (() => {
        const bestOrder = orders.reduce((best, o) => {
          const bestStep = diagnoseOrder(best).step;
          const oStep = diagnoseOrder(o).step;
          return oStep > bestStep ? o : best;
        }, orders[0]);

        return (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Unde e clientul acum</h3>
              <span className="text-[10px] text-gray-400">
                {bestOrder.orderNumber || bestOrder.id?.slice(0, 8)}
              </span>
            </div>
            <JourneyCard order={bestOrder} phone={client.phone} navigate={navigate} />
          </div>
        );
      })()}

      {/* Sales alert */}
      {salesAction && salesAction.action && (
        <div className={`rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3 ${
          salesAction.priority === 'hot' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
        }`}>
          <div>
            <div className={`text-sm font-semibold ${salesAction.priority === 'hot' ? 'text-red-800' : 'text-amber-800'}`}>{salesAction.action}</div>
            <p className={`text-xs mt-0.5 ${salesAction.priority === 'hot' ? 'text-red-600' : 'text-amber-600'}`}>{salesAction.reason}</p>
          </div>
          <div className="flex items-center gap-2">
            {salesAction.phone && (
              <a href={`tel:${salesAction.phone}`} className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                salesAction.priority === 'hot' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}>📞 Sună acum</a>
            )}
            <button onClick={() => setShowCallLog(true)}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 transition">
              ✓ Am sunat
            </button>
          </div>
        </div>
      )}

      {/* Call Log Form */}
      {showCallLog && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border-2 border-[#3D6B5E]/20">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">📞 Logare apel — {client.name}</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.entries(CONTACT_OUTCOMES).map(([key, info]) => (
              <button key={key} onClick={() => setCallOutcome(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                  callOutcome === key ? 'bg-[#3D6B5E] text-white border-[#3D6B5E]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {info.icon} {info.label}
              </button>
            ))}
          </div>
          <textarea value={callNote} onChange={(e) => setCallNote(e.target.value)}
            placeholder="Notă opțională..." rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30" />
          <div className="flex items-center gap-2">
            <button onClick={handleCallLog} disabled={!callOutcome}
              className="rounded-lg px-4 py-2 text-sm font-medium bg-[#3D6B5E] text-white hover:bg-[#2d5246] transition disabled:opacity-40">
              Salvează apelul
            </button>
            <button onClick={() => { setShowCallLog(false); setCallOutcome(''); setCallNote(''); }}
              className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition">Anulează</button>
          </div>
        </div>
      )}

      {/* ── Orders grouped by stage ── */}
      <div className="space-y-6">
        {Object.entries(orderGroups)
          .filter(([, group]) => group.orders.length > 0)
          .map(([key, group]) => (
            <div key={key} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{group.label}</h3>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{group.orders.length}</span>
              </div>
              <div className="px-5 pb-5 space-y-3">
                {group.orders.map((order) => {
                  const photos = order.totalPhotos || 0;
                  const used = order.usedPhotos || 0;
                  const progress = order.progress || 0;
                  const cfg = order.productConfig;
                  const sla = calculateSLA(order);
                  const isExpanded = expandedOrder === order.id;

                  return (
                    <div key={order.id} className={`border-l-4 ${group.color} rounded-r-lg border border-gray-100 overflow-hidden`}>
                      {/* Order header — clickable */}
                      <div
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-700">{order.id}</span>
                              <StatusBadge order={order} />
                              {sla !== null && sla > 24 && <SLABadge hours={Math.round(sla)} />}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {cfg?.name || 'Album'}{cfg?.format ? ` · ${cfg.format}` : ''}{cfg?.initialPages ? ` · ${cfg.initialPages} pag` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {order.priceTotal > 0 && (
                            <span className="text-sm font-bold text-green-600">{order.priceTotal} lei</span>
                          )}
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-gray-100 bg-gray-50/50">
                          {/* Order diagnostic */}
                          {(() => {
                            const d = diagnoseOrder(order);
                            return (
                              <div className="py-3 flex items-center gap-3">
                                <div className="flex items-center gap-1 shrink-0">
                                  {STEPS.map((step, i) => (
                                    <div key={step.key} className={`w-3 h-1.5 rounded-full ${
                                      i < d.step ? 'bg-[#3D6B5E]' : i === d.step ? 'bg-[#3D6B5E]/40' : 'bg-gray-200'
                                    }`} title={step.label} />
                                  ))}
                                </div>
                                <span className="text-xs font-semibold text-gray-600">Pas {d.step + 1}: {d.label}</span>
                                {d.stuckText && <span className="text-[10px] text-gray-400">{d.stuckText}</span>}
                              </div>
                            );
                          })()}
                          <div className="grid grid-cols-3 gap-3 py-3 text-xs">
                            <div>
                              <span className="text-gray-400">Poze:</span>
                              <span className="ml-1 font-medium">{photos} ({used} plasate)</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Progres:</span>
                              <span className="ml-1 font-medium">{progress}%</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Designer:</span>
                              <span className="ml-1 font-medium">{order.designer || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Serviciu:</span>
                              <span className="ml-1 font-medium">{order.orderType === 'designer' ? 'Cu designer' : 'Self'}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Plată:</span>
                              <span className={`ml-1 font-medium ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                                {order.paymentStatus === 'paid' ? 'Achitat' : 'Neachitat'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Data:</span>
                              <span className="ml-1 font-medium">{timeAgo(order.createdAt)}</span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          {progress > 0 && (
                            <div className="mb-3">
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${
                                  progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-orange-400'
                                }`} style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          )}

                          {/* Revision message */}
                          {order.status === 'revision_requested' && order.revisionMessage && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3">
                              <span className="text-xs font-semibold text-amber-800">Mesaj client: </span>
                              <span className="text-xs text-amber-900">{order.revisionMessage}</span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button onClick={() => navigate(`/admin_panel/orders/${order.id}`)}
                              className="px-3 py-1.5 bg-[#3D6B5E] text-white rounded-lg text-xs font-semibold hover:bg-[#2d5246] transition">
                              Deschide →
                            </button>
                            {order.clientPhone && (
                              <a href={`tel:${order.clientPhone}`}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition">
                                📞 Sună
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {/* No orders */}
      {orders.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-gray-400">Nicio comandă</p>
        </div>
      )}

      {/* ── Emailuri primite de client ── */}
      {orders.length > 0 && (
        <EmailTimeline orders={orders} />
      )}

      {/* ── Contact History ── */}
      <div className="bg-white rounded-xl shadow-sm p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">📞 Istoric apeluri ({contactHistory.length})</h3>
          <button onClick={() => setShowCallLog(true)} className="text-xs text-[#3D6B5E] hover:underline font-medium">
            + Adaugă apel
          </button>
        </div>
        {contactHistory.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400 mb-3">Niciun apel logat</p>
            <button onClick={() => setShowCallLog(true)}
              className="inline-flex items-center gap-1 px-4 py-2 bg-[#3D6B5E] text-white rounded-lg text-sm font-medium hover:bg-[#2d5246] transition">
              📞 Logare primul apel
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {contactHistory.map((log) => {
              const info = CONTACT_OUTCOMES[log.outcome] || { label: log.outcome, icon: '📞', color: 'gray' };
              const colorMap = {
                green: 'border-l-green-500', amber: 'border-l-amber-400', gray: 'border-l-gray-300',
                red: 'border-l-red-400', blue: 'border-l-blue-400', purple: 'border-l-purple-400',
              };
              return (
                <div key={log.id} className={`border-l-4 ${colorMap[info.color] || 'border-l-gray-300'} bg-gray-50 rounded-r-lg p-3`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-gray-700">{info.icon} {info.label}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.timestamp).toLocaleDateString('ro-RO', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {log.note && <p className="text-xs text-gray-500 mt-1">{log.note}</p>}
                  {log.orderId && <span className="text-[10px] text-gray-400 mt-1 inline-block">Comandă: {log.orderId}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
