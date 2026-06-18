// src/components/TicketTracking.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/TicketTracking.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus =
  | 'Assigned'
  | 'Researching'
  | 'Work In Progress'
  | 'Pending'
  | 'Resolved'
  | string;

type TicketCategory = 'optic' | 'required' | 'dr4' | 'state' | 'change' |'other';

interface Ticket {
  id         : string;
  title      : string;
  status     : TicketStatus;
  assignee   : string;
  assignedGroup: string;
  createdAt  : string;
  updatedAt  : string;
  severity   : string;
  url        : string;
  categories : TicketCategory[];
}

interface GroupConfig {
  groupName : string;
  savedAt   : string;
}

// ─── Bridge Hook ──────────────────────────────────────────────────────────────

function useTicketBridge() {
  const [bridgeReady, setBridgeReady] = useState(false);
  const pendingRef = useRef<Map<string, { resolve: Function; reject: Function }>>(new Map());

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const msg = event.data;
      if (!msg || !msg.type) return;

      if (msg.type === 'BRIDGE_READY') {
        setBridgeReady(true);
        return;
      }

      if (msg.type === 'TICKET_RESPONSE') {
        const pending = pendingRef.current.get(msg.requestId);
        if (pending) {
          pending.resolve(msg.payload);
          pendingRef.current.delete(msg.requestId);
        }
        return;
      }

      if (msg.type === 'BRIDGE_ERROR') {
        const pending = pendingRef.current.get(msg.requestId);
        if (pending) {
          pending.reject(new Error(msg.payload));
          pendingRef.current.delete(msg.requestId);
        }
        return;
      }
    };

    window.addEventListener('message', handleMessage);
    window.postMessage({ type: 'BRIDGE_PING' }, window.location.origin);

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchTickets = useCallback(
    (groupName: string): Promise<Ticket[]> => {
      return new Promise((resolve, reject) => {
        const requestId = `ticket_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        pendingRef.current.set(requestId, { resolve, reject });

        window.postMessage(
          {
            type     : 'TICKET_REQUEST',
            requestId,
            payload  : { groupName },
          },
          window.location.origin
        );

        setTimeout(() => {
          if (pendingRef.current.has(requestId)) {
            pendingRef.current.delete(requestId);
            reject(new Error('Bridge request timed out'));
          }
        }, 20000);
      });
    },
    []
  );

  return { bridgeReady, fetchTickets };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRACK_KEYWORDS = ['OPTIC', 'REQUIRED', 'DR4'] as const;

function categorizeTicket(title: string): TicketCategory[] {
  const upper = title.toUpperCase();
  const cats: TicketCategory[] = [];
  if (upper.includes('OPTIC'))    cats.push('optic');
  if (upper.includes('REQUIRED')) cats.push('required');
  if (upper.includes('DR4'))      cats.push('dr4');
  if (cats.length === 0)          cats.push('other');
  return cats;
}

function isTrackedTicket(title: string): boolean {
  const upper = title.toUpperCase();
  return TRACK_KEYWORDS.some(kw => upper.includes(kw));
}

function getStatusColor(status: TicketStatus): string {
  const s = status.toLowerCase();
  if (s.includes('resolved'))         return 'status-resolved';
  if (s.includes('work in progress')) return 'status-wip';
  if (s.includes('pending'))          return 'status-pending';
  if (s.includes('researching'))      return 'status-researching';
  if (s.includes('assigned'))         return 'status-assigned';
  return 'status-default';
}

function getCategoryBadgeClass(cat: TicketCategory): string {
  const map: Record<TicketCategory, string> = {
    optic   : 'badge-optic',
    required: 'badge-required',
    dr4     : 'badge-dr4',
    state   : 'badge-state',
    change  : 'badge-change',
    other   : 'badge-other',
  };
  return map[cat];
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getSimTicketUrl(id: string): string {
  return `https://t.corp.amazon.com/${id}`;
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface TicketCardProps {
  ticket: Ticket;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => (
  <a
    href={ticket.url}
    target="_blank"
    rel="noopener noreferrer"
    className="tt-ticket-card"
  >
    {/* Top row: ID + status */}
    <div className="tt-card-top">
      <span className="tt-ticket-id">{ticket.id}</span>
      <span className={`tt-status-badge ${getStatusColor(ticket.status)}`}>
        {ticket.status}
      </span>
    </div>

    {/* Title */}
    <div className="tt-ticket-title">{ticket.title}</div>

    {/* Category badges */}
    <div className="tt-badge-row">
      {ticket.categories.map(cat => (
        <span key={cat} className={`tt-category-badge ${getCategoryBadgeClass(cat)}`}>
          {cat.toUpperCase()}
        </span>
      ))}
    </div>

    {/* Meta row */}
    <div className="tt-card-meta">
      <span className="tt-meta-item">
        <span className="tt-meta-label">Assignee</span>
        <span className="tt-meta-value">{ticket.assignee || '—'}</span>
      </span>
      <span className="tt-meta-item">
        <span className="tt-meta-label">Updated</span>
        <span className="tt-meta-value">{formatDate(ticket.updatedAt)}</span>
      </span>
      <span className="tt-meta-item">
        <span className="tt-meta-label">Created</span>
        <span className="tt-meta-value">{formatDate(ticket.createdAt)}</span>
      </span>
    </div>
  </a>
);

// ─── Main Component ───────────────────────────────────────────────────────────

type FilterKey = 'ALL' | 'OPTIC' | 'REQUIRED' | 'DR4' | 'STATE' | 'CHANGE' | 'OPEN' | 'RESOLVED';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL',      label: 'All'       },
  { key: 'OPTIC',    label: 'Optic'     },
  { key: 'REQUIRED', label: 'Required'  },
  { key: 'DR4',      label: 'DR4'       },
  { key: 'STATE',    label: 'State'     },
  { key: 'CHANGE',   label: 'Change'    },
  { key: 'OPEN',     label: 'Open'      },
  { key: 'RESOLVED', label: 'Resolved'  },
];

const TicketTracking: React.FC = () => {
  const { bridgeReady, fetchTickets }     = useTicketBridge();

  // ── Persisted group config ──────────────────────────────────────────────────
  const [groupName, setGroupName] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('tt_group_config');
      if (stored) {
        const cfg: GroupConfig = JSON.parse(stored);
        return cfg.groupName;
      }
    } catch { /* ignore */ }
    return '';
  });

  const [groupInput,   setGroupInput]   = useState(groupName);
  const [editingGroup, setEditingGroup] = useState(!groupName);

  // ── Ticket state ────────────────────────────────────────────────────────────
  const [tickets,     setTickets]     = useState<Ticket[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
  const [searchQuery,  setSearchQuery]  = useState('');

  // ── Manually pinned ticket IDs (from localStorage) ─────────────────────────
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('tt_pinned_ids');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // ── Persist group config ────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupName) return;
    const cfg: GroupConfig = { groupName, savedAt: new Date().toISOString() };
    localStorage.setItem('tt_group_config', JSON.stringify(cfg));
  }, [groupName]);

  // ── Persist pinned IDs ──────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('tt_pinned_ids', JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  // ── Auto-fetch when group is set and bridge is ready ────────────────────────
  useEffect(() => {
    if (bridgeReady && groupName) {
      loadTickets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeReady, groupName]);

  // ── Fetch tickets via bridge ────────────────────────────────────────────────
  const loadTickets = useCallback(async () => {
    if (!groupName) return;
    setLoading(true);
    setError(null);

    try {
      const raw = await fetchTickets(groupName);

      // Filter to only tracked tickets and attach categories
      const tracked = raw
        .filter(t => isTrackedTicket(t.title))
        .map(t => ({ ...t, categories: categorizeTicket(t.title) }));

      setTickets(tracked);
      setLastFetched(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, [groupName, fetchTickets]);

  // ── Save group ──────────────────────────────────────────────────────────────
  const handleSaveGroup = () => {
    const trimmed = groupInput.trim();
    if (!trimmed) return;
    setGroupName(trimmed);
    setEditingGroup(false);
  };

  // ── Pin / unpin ─────────────────────────────────────────────────────────────
  const togglePin = (id: string) => {
    setPinnedIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [id, ...prev]
    );
  };

  // ── Manual ticket add ───────────────────────────────────────────────────────
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  const handleManualAdd = () => {
    const id = manualInput.trim().toUpperCase();
    if (!id) return;
    if (pinnedIds.includes(id)) {
      setManualError('Already pinned.');
      return;
    }
    setPinnedIds(prev => [id, ...prev]);
    setManualInput('');
    setManualError(null);
  };

  // ── Filtered + sorted tickets ───────────────────────────────────────────────
  const filteredTickets = tickets
    .filter(t => {
      if (activeFilter === 'OPTIC')    return t.categories.includes('optic');
      if (activeFilter === 'REQUIRED') return t.categories.includes('required');
      if (activeFilter === 'DR4')      return t.categories.includes('dr4');
      if (activeFilter === 'STATE')    return t.categories.includes('state');
      if (activeFilter === 'CHANGE')   return t.categories.includes('change');
      if (activeFilter === 'OPEN')     return t.status.toLowerCase() !== 'resolved';
      if (activeFilter === 'RESOLVED') return t.status.toLowerCase() === 'resolved';
      return true;
    })
    .filter(t => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toUpperCase();
      return (
        t.id.toUpperCase().includes(q)    ||
        t.title.toUpperCase().includes(q) ||
        t.assignee.toUpperCase().includes(q)
      );
    })
    // Pinned tickets float to top
    .sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id) ? 0 : 1;
      const bPinned = pinnedIds.includes(b.id) ? 0 : 1;
      return aPinned - bPinned;
    });

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = {
    total   : tickets.length,
    open    : tickets.filter(t => t.status.toLowerCase() !== 'resolved').length,
    resolved: tickets.filter(t => t.status.toLowerCase() === 'resolved').length,
    optic   : tickets.filter(t => t.categories.includes('optic')).length,
    dr4     : tickets.filter(t => t.categories.includes('dr4')).length,
    state   : tickets.filter(t => t.categories.includes('state')).length,
    change  : tickets.filter(t => t.categories.includes('change')).length,
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ticket-tracking">

      {/* ── Header ── */}
      <div className="tt-header">
        <h1>
          🎫 Ticket <span className="tt-title-accent">Tracking</span>
        </h1>
        <p className="tt-subtitle">Monitor optic-related SIM tickets for your group</p>
      </div>

      {/* ── Bridge Warning ── */}
      {!bridgeReady && (
        <div className="tt-bridge-warning">
          ⚠️ Tampermonkey bridge not detected. Ensure the optic-amazon Bridge script
          is running and refresh.
        </div>
      )}

      {/* ── Group Config ── */}
      <div className="tt-group-section">
        {editingGroup ? (
          <div className="tt-group-editor">
            <div className="tt-group-editor-label">
              👥 Your SIM Assigned Group
            </div>
            <div className="tt-group-editor-row">
              <input
                className="tt-group-input"
                type="text"
                placeholder="e.g. IAD ID South Cabling"
                value={groupInput}
                onChange={e => setGroupInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveGroup()}
                spellCheck={false}
              />
              <button
                className="tt-group-save-btn"
                onClick={handleSaveGroup}
                disabled={!groupInput.trim()}
              >
                ✓ Save
              </button>
              {groupName && (
                <button
                  className="tt-group-cancel-btn"
                  onClick={() => { setGroupInput(groupName); setEditingGroup(false); }}
                >
                  Cancel
                </button>
              )}
            </div>
            <span className="tt-group-hint">
              Enter the exact group name as it appears in SIM Ticketing
            </span>
          </div>
        ) : (
          <div className="tt-group-display">
            <div className="tt-group-display-inner">
              <span className="tt-group-label">👥 Group</span>
              <span className="tt-group-name">{groupName}</span>
            </div>
            <div className="tt-group-actions">
              <button
                className="tt-group-edit-btn"
                onClick={() => { setGroupInput(groupName); setEditingGroup(true); }}
              >
                ✏️ Change
              </button>
              <button
                className="tt-refresh-btn"
                onClick={loadTickets}
                disabled={loading || !bridgeReady}
                title="Refresh tickets"
              >
                {loading ? '⏳' : '🔄'} Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && <div className="tt-error">⚠ {error}</div>}

      {/* ── Stats Bar ── */}
      {tickets.length > 0 && (
        <div className="tt-stats-bar">
          <div className="tt-stat">
            <span className="tt-stat-number">{stats.total}</span>
            <span className="tt-stat-label">Total</span>
          </div>
          <div className="tt-stat-divider" />
          <div className="tt-stat">
            <span className="tt-stat-number tt-stat-open">{stats.open}</span>
            <span className="tt-stat-label">Open</span>
          </div>
          <div className="tt-stat-divider" />
          <div className="tt-stat">
            <span className="tt-stat-number tt-stat-resolved">{stats.resolved}</span>
            <span className="tt-stat-label">Resolved</span>
          </div>
          <div className="tt-stat-divider" />
          <div className="tt-stat">
            <span className="tt-stat-number tt-stat-optic">{stats.optic}</span>
            <span className="tt-stat-label">Optic</span>
          </div>
          <div className="tt-stat-divider" />
          <div className="tt-stat">
            <span className="tt-stat-number tt-stat-dr4">{stats.dr4}</span>
            <span className="tt-stat-label">DR4</span>
          </div>
          <div className="tt-stat-divider" />
          <div className="tt-stat">
            <span className="tt-stat-number tt-stat-state">{stats.state}</span>
            <span className="tt-stat-label">State</span>
          </div>
          <div className="tt-stat-divider" />
          <div className="tt-stat">
            <span className="tt-stat-number tt-stat-change">{stats.change}</span>
            <span className="tt-stat-label">Change</span>
          </div>
          {lastFetched && (
            <>
              <div className="tt-stat-divider" />
              <div className="tt-stat">
                <span className="tt-stat-label tt-last-fetched">
                  Updated {lastFetched}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Filter + Search Row ── */}
      {(tickets.length > 0 || searchQuery) && (
        <div className="tt-controls-row">
          <div className="tt-filter-tabs">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`tt-filter-tab ${activeFilter === f.key ? 'active' : ''}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
                {f.key !== 'ALL' && (
                  <span className="tt-filter-count">
                    {f.key === 'OPTIC'    && stats.optic}
                    {f.key === 'REQUIRED' && tickets.filter(t => t.categories.includes('required')).length}
                    {f.key === 'DR4'      && stats.dr4}
                    {f.key === 'STATE'    && stats.state}
                    {f.key === 'CHANGE'   && stats.change}
                    {f.key === 'OPEN'     && stats.open}
                    {f.key === 'RESOLVED' && stats.resolved}
                  </span>
                )}
              </button>
            ))}
          </div>
          <input
            className="tt-search-input"
            type="text"
            placeholder="Search by ID, title, or assignee…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            spellCheck={false}
          />
        </div>
      )}

      {/* ── Ticket List ── */}
      <div className="tt-content">
        {loading && (
          <div className="tt-loading">
            <div className="tt-spinner" />
            <span>Fetching tickets from SIM…</span>
          </div>
        )}

        {!loading && !error && groupName && tickets.length === 0 && (
          <div className="tt-empty">
            <div className="tt-empty-icon">🎫</div>
            <div className="tt-empty-title">No tracked tickets found</div>
            <div className="tt-empty-sub">
              No tickets in <strong>{groupName}</strong> matched keywords:{' '}
              {TRACK_KEYWORDS.join(', ')}
            </div>
          </div>
        )}

        {!loading && filteredTickets.length > 0 && (
          <div className="tt-ticket-list">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="tt-ticket-row">
                {/* Pin button */}
                <button
                  className={`tt-pin-btn ${pinnedIds.includes(ticket.id) ? 'pinned' : ''}`}
                  onClick={() => togglePin(ticket.id)}
                  title={pinnedIds.includes(ticket.id) ? 'Unpin' : 'Pin to top'}
                >
                  📌
                </button>
                <TicketCard ticket={ticket} />
              </div>
            ))}
          </div>
        )}

        {!loading && filteredTickets.length === 0 && tickets.length > 0 && (
          <div className="tt-empty">
            <div className="tt-empty-icon">🔍</div>
            <div className="tt-empty-title">No tickets match your filter</div>
            <div className="tt-empty-sub">Try a different filter or clear your search.</div>
          </div>
        )}
      </div>

      {/* ── Manual Pin Section ── */}
      <div className="tt-manual-section">
        <div className="tt-manual-header">
          <span>📌 Manually Pin a Ticket</span>
          <span className="tt-manual-hint">
            Pin any ticket ID to always keep it visible
          </span>
        </div>
        <div className="tt-manual-row">
          <input
            className="tt-manual-input"
            type="text"
            placeholder="Ticket ID — e.g. V2218590720"
            value={manualInput}
            onChange={e => setManualInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
            spellCheck={false}
          />
          <button
            className="tt-manual-add-btn"
            onClick={handleManualAdd}
            disabled={!manualInput.trim()}
          >
            ➕ Pin
          </button>
        </div>
        {manualError && <div className="tt-manual-error">{manualError}</div>}

        {/* Pinned IDs that aren't in the fetched list */}
        {pinnedIds.filter(id => !tickets.find(t => t.id === id)).length > 0 && (
          <div className="tt-pinned-list">
            {pinnedIds
              .filter(id => !tickets.find(t => t.id === id))
              .map(id => (
                <div key={id} className="tt-pinned-item">
                  <a
                    href={getSimTicketUrl(id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tt-pinned-link"
                  >
                    🔗 {id}
                  </a>
                  <button
                    className="tt-pinned-remove"
                    onClick={() => togglePin(id)}
                    title="Remove pin"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default TicketTracking;
