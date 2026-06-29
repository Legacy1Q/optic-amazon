import { useState, useEffect } from 'react';

// ════════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════════

interface TrackedTicket {
  id: string;
  title: string;
  status: string;
  severity: string;
  url: string;
  addedAt: string;
  lastUpdated: string;
}

// ════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════

const STATUS_OPTIONS = ['Assigned', 'Work In Progress', 'Researching', 'Pending', 'Resolved'];
const SEVERITY_OPTIONS = ['1', '2', '3', '4', '5'];

function getStatusColor(status: string): string {
  const s = status.toLowerCase().replace(/\s+/g, '');
  if (s === 'resolved') return '#4caf50';
  if (s === 'assigned') return '#2196f3';
  if (s === 'workinprogress') return '#ff9800';
  if (s === 'researching') return '#9c27b0';
  if (s === 'pending') return '#f44336';
  return '#888';
}

function getSeverityColor(severity: string): string {
  const num = parseInt(severity, 10);
  if (num <= 2) return '#f44336';
  if (num === 3) return '#ff9800';
  if (num === 4) return '#ffc107';
  return '#4caf50';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ════════════════════════════════════════════════════════
//  Component
// ════════════════════════════════════════════════════════

export default function TicketTracking() {
  const [tickets, setTickets] = useState<TrackedTicket[]>(() => {
    const saved = localStorage.getItem('optic-tracked-tickets');
    return saved ? JSON.parse(saved) : [];
  });

  // Add ticket form state
  const [inputId, setInputId] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [inputStatus, setInputStatus] = useState('Assigned');
  const [inputSeverity, setInputSeverity] = useState('3');
  const [showForm, setShowForm] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editSeverity, setEditSeverity] = useState('');

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('optic-tracked-tickets', JSON.stringify(tickets));
  }, [tickets]);

  // ── Add ticket ──
  const addTicket = () => {
    const cleanId = inputId
      .replace(/^https?:\/\/t\.corp\.amazon\.com\//, '')
      .trim();

    if (!cleanId) return;

    if (tickets.some((t) => t.id.toLowerCase() === cleanId.toLowerCase())) {
      alert(`Ticket ${cleanId} is already being tracked.`);
      return;
    }

    const newTicket: TrackedTicket = {
      id: cleanId,
      title: inputTitle.trim() || cleanId,
      status: inputStatus,
      severity: inputSeverity,
      url: `https://t.corp.amazon.com/${cleanId}`,
      addedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    setTickets((prev) => [newTicket, ...prev]);
    setInputId('');
    setInputTitle('');
    setInputStatus('Assigned');
    setInputSeverity('3');
    setShowForm(false);
  };

  // ── Remove ticket ──
  const removeTicket = (id: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Update ticket status/severity ──
  const startEdit = (ticket: TrackedTicket) => {
    setEditingId(ticket.id);
    setEditStatus(ticket.status);
    setEditSeverity(ticket.severity);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setTickets((prev) =>
      prev.map((t) =>
        t.id === editingId
          ? { ...t, status: editStatus, severity: editSeverity, lastUpdated: new Date().toISOString() }
          : t
      )
    );
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // ════════════════════════════════════════════════════════
  //  Render
  // ════════════════════════════════════════════════════════

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header — stacked layout so button doesn't block title */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '22px' }}>🎫 Ticket Tracker</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 16px',
            background: showForm ? 'rgba(244, 67, 54, 0.2)' : 'rgba(255, 153, 0, 0.2)',
            border: `1px solid ${showForm ? '#f44336' : '#ff9900'}`,
            borderRadius: '6px',
            color: showForm ? '#f44336' : '#ff9900',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
          }}
        >
          {showForm ? '✕ Cancel' : '+ Add Ticket'}
        </button>
      </div>

      {/* Add Ticket Form */}
      {showForm && (
        <div style={{
          background: 'linear-gradient(135deg, #1a2332, #2a3a4a)',
          border: '1px solid #ff9900',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Ticket ID */}
            <div>
              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Ticket ID or URL *
              </label>
              <input
                type="text"
                placeholder="V1234567890 or https://t.corp.amazon.com/V1234567890"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0d1520',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Title */}
            <div>
              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Title (optional — defaults to ticket ID)
              </label>
              <input
                type="text"
                placeholder="e.g. DR4 - IAD55 OPTICS REQUIRED"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0d1520',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Status & Severity row */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                  Status
                </label>
                <select
                  value={inputStatus}
                  onChange={(e) => setInputStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#0d1520',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                  Severity
                </label>
                <select
                  value={inputSeverity}
                  onChange={(e) => setInputSeverity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#0d1520',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>SEV {s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={addTicket}
              disabled={!inputId.trim()}
              style={{
                padding: '10px 20px',
                background: '#ff9900',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                opacity: inputId.trim() ? 1 : 0.5,
              }}
            >
              Add Ticket
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      {tickets.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px', color: '#aaa' }}>
          <span>Tracking: <strong style={{ color: '#fff' }}>{tickets.length}</strong></span>
          <span>Open: <strong style={{ color: '#2196f3' }}>{tickets.filter((t) => t.status !== 'Resolved').length}</strong></span>
          <span>Resolved: <strong style={{ color: '#4caf50' }}>{tickets.filter((t) => t.status === 'Resolved').length}</strong></span>
        </div>
      )}

      {/* Ticket Cards */}
      {tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No tickets being tracked yet.</p>
          <p style={{ fontSize: '13px' }}>Click "+ Add Ticket" to start tracking.</p>
        </div>
      ) : (
        tickets.map((ticket) => (
          <div
            key={ticket.id}
            style={{
              background: 'linear-gradient(135deg, #1a2332, #2a3a4a)',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px',
            }}
          >
            {editingId === ticket.id ? (
              /* ── Edit Mode ── */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <a
                    href={ticket.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#ff9900', fontWeight: 'bold', textDecoration: 'none', fontSize: '15px' }}
                  >
                    {ticket.id}
                  </a>
                  <span style={{ color: '#aaa', fontSize: '12px' }}>Editing...</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: '#0d1520',
                      border: '1px solid #ff9900',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    value={editSeverity}
                    onChange={(e) => setEditSeverity(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: '#0d1520',
                      border: '1px solid #ff9900',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  >
                    {SEVERITY_OPTIONS.map((s) => (
                      <option key={s} value={s}>SEV {s}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={saveEdit}
                    style={{
                      padding: '6px 14px',
                      background: '#4caf50',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    style={{
                      padding: '6px 14px',
                      background: 'transparent',
                      border: '1px solid #666',
                      borderRadius: '4px',
                      color: '#aaa',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ── Display Mode ── */
              <>
                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <a
                    href={ticket.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#ff9900', fontWeight: 'bold', textDecoration: 'none', fontSize: '15px' }}
                  >
                    {ticket.id}
                  </a>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => startEdit(ticket)}
                      title="Edit status/severity"
                      style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '14px' }}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => removeTicket(ticket.id)}
                      title="Remove"
                      style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontSize: '14px' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div style={{ color: '#ddd', fontSize: '14px', marginBottom: '10px' }}>
                  {ticket.title}
                </div>

                {/* Status & Severity badges */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    background: `${getStatusColor(ticket.status)}33`,
                    border: `1px solid ${getStatusColor(ticket.status)}`,
                    color: getStatusColor(ticket.status),
                  }}>
                    {ticket.status}
                  </span>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: `${getSeverityColor(ticket.severity)}33`,
                    border: `1px solid ${getSeverityColor(ticket.severity)}`,
                    color: getSeverityColor(ticket.severity),
                  }}>
                    SEV {ticket.severity}
                  </span>
                </div>

                {/* Meta */}
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Last updated: {formatDate(ticket.lastUpdated)}
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}
