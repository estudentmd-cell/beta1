import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';

const PERIODS = [
  { id: 'today', label: 'Azi', days: 0 },
  { id: 'week', label: '7 zile', days: 7 },
  { id: 'month', label: '30 zile', days: 30 },
  { id: 'all', label: 'Total', days: 9999 },
];

const FUNNEL_STEPS = [
  { key: 'visit', label: 'Vizită' },
  { key: 'select_product', label: 'Alege produs' },
  { key: 'open_editor', label: 'Deschide editor' },
  { key: 'upload_photos', label: 'Uploadează poze' },
  { key: 'design_progress', label: 'Design progres' },
  { key: 'click_order', label: 'Click Comandă' },
  { key: 'checkout', label: 'Checkout' },
  { key: 'order_placed', label: 'Comandă plasată' },
];

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'acum';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}z`;
}

function filterByPeriod(items, period, dateField = 'timestamp') {
  const p = PERIODS.find(x => x.id === period);
  if (!p || p.days >= 9999) return items;
  const cutoff = p.days === 0
    ? new Date().toISOString().slice(0, 10)
    : new Date(Date.now() - p.days * 86400000).toISOString();
  return p.days === 0
    ? items.filter(i => (i[dateField] || '').startsWith(cutoff))
    : items.filter(i => (i[dateField] || '') >= cutoff);
}

export default function AdminErrors() {
  const [tab, setTab] = useState('errors');
  const [errors, setErrors] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!db) { setLoading(false); return; }
    (async () => {
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const [errSnap, funSnap] = await Promise.all([
          getDocs(collection(db, 'errors')),
          getDocs(collection(db, 'funnel')),
        ]);
        const errs = errSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        errs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        setErrors(errs);

        const funs = funSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFunnel(funs);
      } catch (e) {
        console.warn('Failed to load errors/funnel:', e);
      }
      setLoading(false);
    })();
  }, []);

  const filteredErrors = filterByPeriod(errors, period);
  const filteredFunnel = filterByPeriod(funnel, period);

  // Build funnel counts — count unique sessions per step
  const funnelCounts = FUNNEL_STEPS.map(s => {
    const sessions = new Set();
    filteredFunnel.filter(f => f.step === s.key).forEach(f => sessions.add(f.sessionId));
    return { ...s, count: sessions.size };
  });
  const maxFunnel = Math.max(1, ...funnelCounts.map(f => f.count));

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-dark">Erori & Funnel</h1>
        <div className="flex gap-1 bg-sand/50 rounded-lg p-0.5">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1 text-xs rounded-md transition ${period === p.id ? 'bg-white shadow text-dark font-medium' : 'text-muted hover:text-dark'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-sand">
        <button onClick={() => setTab('errors')}
          className={`pb-2 px-1 text-sm font-medium transition border-b-2 ${tab === 'errors' ? 'border-ac text-ac' : 'border-transparent text-muted hover:text-dark'}`}>
          Erori {filteredErrors.length > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{filteredErrors.length}</span>}
        </button>
        <button onClick={() => setTab('funnel')}
          className={`pb-2 px-1 text-sm font-medium transition border-b-2 ${tab === 'funnel' ? 'border-ac text-ac' : 'border-transparent text-muted hover:text-dark'}`}>
          Funnel
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-ac/20 border-t-ac rounded-full animate-spin" />
        </div>
      )}

      {/* ── ERRORS TAB ── */}
      {!loading && tab === 'errors' && (
        <>
          {filteredErrors.length === 0 ? (
            <div className="text-center py-20 text-muted">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-sm">Nicio eroare în această perioadă</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredErrors.map((err) => (
                <div key={err.id} className="bg-white rounded-xl border border-sand overflow-hidden">
                  <button onClick={() => setExpanded(expanded === err.id ? null : err.id)}
                    className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-sand/30 transition">
                    {/* Severity dot */}
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${err.severity === 'error' ? 'bg-red-500' : 'bg-amber-400'}`} />

                    {/* Message */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-dark font-medium truncate">{err.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted">
                        <span>{err.page}</span>
                        <span>{err.device} · {err.browser}</span>
                        <span>{err.screenW}×{err.screenH}</span>
                      </div>
                    </div>

                    {/* Client */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-dark">{err.clientName || 'Anonim'}</p>
                      {err.clientPhone && <p className="text-[11px] text-muted">{err.clientPhone}</p>}
                    </div>

                    {/* Time */}
                    <div className="text-right shrink-0 w-16">
                      <p className="text-xs text-muted">{timeAgo(err.timestamp)}</p>
                    </div>

                    {/* Expand arrow */}
                    <svg className={`w-4 h-4 text-muted shrink-0 mt-1 transition-transform ${expanded === err.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded stack trace */}
                  {expanded === err.id && (
                    <div className="px-4 pb-4 border-t border-sand/50">
                      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted mb-2">
                        <span>Session: {err.sessionId}</span>
                        <span>{fmtTime(err.timestamp)}</span>
                      </div>
                      <pre className="bg-dark/5 rounded-lg p-3 text-[11px] text-dark/80 overflow-x-auto whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                        {err.stack || 'No stack trace'}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── FUNNEL TAB ── */}
      {!loading && tab === 'funnel' && (
        <div className="space-y-3">
          {funnelCounts.map((step, i) => {
            const prev = i > 0 ? funnelCounts[i - 1].count : null;
            const convRate = prev && prev > 0 ? Math.round((step.count / prev) * 100) : null;
            const barWidth = Math.max(2, (step.count / maxFunnel) * 100);

            return (
              <div key={step.key}>
                {/* Drop-off indicator */}
                {convRate !== null && (
                  <div className="flex items-center gap-2 py-1 pl-4">
                    <svg className="w-3 h-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7-7-7" />
                    </svg>
                    <span className={`text-[11px] font-medium ${convRate >= 50 ? 'text-green-600' : convRate >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
                      {convRate}%
                    </span>
                  </div>
                )}

                {/* Step bar */}
                <div className="flex items-center gap-3">
                  <div className="w-32 shrink-0 text-right">
                    <span className="text-xs text-muted">{step.label}</span>
                  </div>
                  <div className="flex-1 bg-sand/50 rounded-full h-7 overflow-hidden relative">
                    <div className="h-full rounded-full bg-ac/70 transition-all duration-500"
                      style={{ width: `${barWidth}%` }} />
                    <span className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-dark">
                      {step.count}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredFunnel.length === 0 && (
            <div className="text-center py-16 text-muted">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-sm">Nicio activitate în această perioadă</p>
            </div>
          )}

          {/* Session list */}
          {filteredFunnel.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-dark mb-3">Sesiuni recente</h3>
              <SessionList funnel={filteredFunnel} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Session List — group funnel events by session ── */
function SessionList({ funnel }) {
  // Group by sessionId
  const sessions = {};
  funnel.forEach(f => {
    if (!sessions[f.sessionId]) {
      sessions[f.sessionId] = {
        id: f.sessionId,
        device: f.device,
        browser: f.browser,
        clientName: f.clientName,
        clientPhone: f.clientPhone,
        steps: [],
        firstTime: f.timestamp,
        lastTime: f.timestamp,
      };
    }
    const s = sessions[f.sessionId];
    s.steps.push(f);
    if (f.clientName && !s.clientName) s.clientName = f.clientName;
    if (f.clientPhone && !s.clientPhone) s.clientPhone = f.clientPhone;
    if (f.timestamp < s.firstTime) s.firstTime = f.timestamp;
    if (f.timestamp > s.lastTime) s.lastTime = f.timestamp;
  });

  const sorted = Object.values(sessions).sort((a, b) => b.lastTime.localeCompare(a.lastTime)).slice(0, 30);

  const stepOrder = FUNNEL_STEPS.map(s => s.key);
  const stepLabel = Object.fromEntries(FUNNEL_STEPS.map(s => [s.key, s.label]));

  return (
    <div className="space-y-2">
      {sorted.map(session => {
        const uniqueSteps = [...new Set(session.steps.map(s => s.step))];
        const maxStep = uniqueSteps.reduce((max, step) => {
          const idx = stepOrder.indexOf(step);
          return idx > max ? idx : max;
        }, -1);

        return (
          <div key={session.id} className="bg-white rounded-xl border border-sand px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-dark">{session.clientName || 'Anonim'}</span>
                {session.clientPhone && <span className="text-[11px] text-muted">{session.clientPhone}</span>}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <span>{session.device} · {session.browser}</span>
                <span>{timeAgo(session.lastTime)}</span>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-1">
              {FUNNEL_STEPS.map((step, i) => {
                const reached = uniqueSteps.includes(step.key);
                return (
                  <div key={step.key} className="flex items-center gap-1">
                    <div title={step.label}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
                        ${reached ? 'bg-ac text-white' : 'bg-sand/60 text-muted/50'}`}>
                      {i + 1}
                    </div>
                    {i < FUNNEL_STEPS.length - 1 && (
                      <div className={`w-3 h-0.5 ${i < maxStep ? 'bg-ac/40' : 'bg-sand/60'}`} />
                    )}
                  </div>
                );
              })}
              <span className="ml-2 text-[10px] text-muted">
                {maxStep >= 0 ? stepLabel[stepOrder[maxStep]] : '—'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
