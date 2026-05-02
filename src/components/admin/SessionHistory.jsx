import { useState, Fragment } from 'react';

/**
 * SessionHistory — table of past sessions with expandable timelines.
 *
 * Props:
 *   sessions: Array<{
 *     id, name, phone, device, startTime, duration (sec),
 *     eventCount, outcome ('completed'|'abandoned'|'active'),
 *     dropScreen (string|null),
 *     events: Array<{ t: 'HH:MM', action, detail?, type }>
 *   }>
 */

/* ── Helpers ── */

function fmtDuration(sec) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function deviceIcon(d) {
  if (!d) return '💻';
  const dl = d.toLowerCase();
  if (dl.includes('ipad') || dl.includes('tablet')) return '📲';
  if (dl.includes('iphone') || dl.includes('samsung') || dl.includes('mobile') || dl.includes('galaxy')) return '📱';
  return '💻';
}

function eventColor(type) {
  const map = { error: 'red', red: 'red', nav: 'blue', blue: 'blue', success: 'green', green: 'green', action: 'gold', gold: 'gold' };
  return map[type] || 'blue';
}

const OUTCOME_BADGE = {
  completed: { label: 'Finalizat', cls: 'bg-green-100 text-green-700' },
  abandoned: { label: 'Abandonat', cls: 'bg-red-100 text-red-700' },
  active:    { label: 'În curs',   cls: 'bg-blue-100 text-blue-700' },
};

function buildTimeline(events) {
  if (!events || !events.length) return null;

  return events.map((ev, i) => {
    let pauseHtml = null;

    if (i > 0) {
      const prev = events[i - 1].t.split(':').map(Number);
      const curr = ev.t.split(':').map(Number);
      const gapSec = ((curr[0] * 60 + curr[1]) - (prev[0] * 60 + prev[1])) * 60;

      if (gapSec > 60) {
        const cls = gapSec >= 180 ? 'critical' : 'warning';
        const label = gapSec >= 180 ? ' — posibil blocat' : ' — ezitare';
        pauseHtml = (
          <div className={`admin-tl-gap ${cls}`}>
            ⏸ Pauză {fmtDuration(gapSec)}{label}
          </div>
        );
      }
    }

    return (
      <div key={i}>
        {pauseHtml}
        <div className="flex gap-3 py-2 relative">
          <div className={`admin-tl-dot ${eventColor(ev.type)}`} />
          <div className="ml-3">
            <div className="text-xs text-gray-400">{ev.t}</div>
            <div className="text-sm font-medium">{ev.action}</div>
            {ev.detail && <div className="text-xs text-gray-500">{ev.detail}</div>}
          </div>
        </div>
      </div>
    );
  });
}

/* ═══ SessionHistory Component ═══ */

export default function SessionHistory({ sessions = [] }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!sessions.length) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <span>📋 Istoric sesiuni</span>
        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
          {sessions.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="admin-table w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b">
              <th className="px-4 py-2 text-left">Client</th>
              <th className="px-4 py-2 text-left">Dispozitiv</th>
              <th className="px-4 py-2 text-left">Început</th>
              <th className="px-4 py-2 text-left">Durată</th>
              <th className="px-4 py-2 text-left">Evenimente</th>
              <th className="px-4 py-2 text-left">Rezultat</th>
              <th className="px-4 py-2 text-left">Abandon la</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const badge = OUTCOME_BADGE[s.outcome] || OUTCOME_BADGE.active;
              const isExpanded = expandedId === s.id;

              return (
                <Fragment key={s.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-800">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.phone}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="mr-1">{deviceIcon(s.device)}</span>
                      <span className="text-xs text-gray-500">{s.device}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">{s.startTime}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{fmtDuration(s.duration)}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{s.eventCount}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {s.dropScreen ? (
                        <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded">
                          {s.dropScreen}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="px-6 py-3 bg-gray-50">
                        <div className="admin-tl-track ml-4">
                          {buildTimeline(s.events)}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
