// src/components/DeploymentTracking.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/DeploymentTracking.css';

// ─── Constants ───────────────────────────────────────────────────────────────
const OPTIC_TYPES = [
  'Unknown', '100G SR4', '100G L CWDM4',
  '400G SR4', '400G LR4', '400G DR4', '400G FR4',
  '400G ZR', '10G SR', '10G LR', '25G SR', '40G SR4',
] as const;

const KNOWN_TEAMS = [
  'ID Install', 'DCO Break-Fix', 'DCO Build',
  'NSI', 'Late Binding', 'Contractor', 'Other',
] as const;

type OpticType = typeof OPTIC_TYPES[number];
type TeamType  = typeof KNOWN_TEAMS[number];

// ─── Types ───────────────────────────────────────────────────────────────────
interface DeploymentRecord {
  id          : string;
  serial      : string;
  site        : string;
  dataHall    : string;
  device      : string;
  deployedBy  : string;
  deployedAt  : string;
  deployTeam  : TeamType;
  opticType   : OpticType;
  portLabel   : string;
  note        : string;
  createdAt   : string;
  status      : 'DEPLOYED' | 'PENDING' | 'CANCELLED';
}

type SortField = keyof Pick<
  DeploymentRecord,
  'serial' | 'site' | 'dataHall' | 'device' | 'deployedBy' | 'deployedAt' | 'deployTeam' | 'opticType' | 'status'
>;

type SortDir = 'asc' | 'desc';

// ─── Storage ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'harmony_deployment_tracking_v1';

function loadRecords(): DeploymentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: DeploymentRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function genId(): string {
  return `dep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleString(); }
  catch { return iso; }
}

/** Parse a raw string into individual serial numbers (handles newlines, commas, tabs, spaces) */
function parseSerials(raw: string): string[] {
  return raw
    .split(/[\n\r,\t]+/)           // split on newlines, commas, tabs
    .map(s => s.trim().toUpperCase())
    .filter(s => s.length > 0);
}

function exportCSV(records: DeploymentRecord[]): void {
  const headers = [
    'Serial', 'Site', 'Data Hall', 'Device', 'Deployed By',
    'Deployed At', 'Deploy Team', 'Optic Type', 'Port Label', 'Note', 'Status', 'Created At',
  ];
  const q = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = records.map(r => [
    r.serial, r.site, r.dataHall, r.device, r.deployedBy,
    r.deployedAt, r.deployTeam, r.opticType, r.portLabel, r.note, r.status, r.createdAt,
  ].map(q).join(','));
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `deployments-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Empty form state ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  site      : '',
  dataHall  : '',
  device    : '',
  deployedBy: '',
  deployedAt: '',
  deployTeam: 'ID Install' as TeamType,
  opticType : 'Unknown'   as OpticType,
  portLabel : '',
  note      : '',
};

// ─── Component ───────────────────────────────────────────────────────────────
const DeploymentTracking: React.FC = () => {
  const [records,    setRecords]    = useState<DeploymentRecord[]>(loadRecords);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [serials,    setSerials]    = useState<string[]>([]);
  const [serialInput, setSerialInput] = useState('');
  const [bulkMode,   setBulkMode]   = useState(false);        // toggle between scan & bulk paste
  const [bulkText,   setBulkText]   = useState('');            // textarea content for bulk paste
  const [editId,     setEditId]     = useState<string | null>(null);
  const [editSerial, setEditSerial] = useState('');
  const [formError,  setFormError]  = useState<string>('');
  const [formMsg,    setFormMsg]    = useState<string>('');
  const [search,     setSearch]     = useState('');
  const [filterTeam, setFilterTeam] = useState<TeamType | ''>('');
  const [filterStatus, setFilterStatus] = useState<DeploymentRecord['status'] | ''>('');
  const [sortField,  setSortField]  = useState<SortField>('deployedAt');
  const [sortDir,    setSortDir]    = useState<SortDir>('desc');
  const [showForm,   setShowForm]   = useState(false);
  const serialRef = useRef<HTMLInputElement>(null);
  const bulkRef   = useRef<HTMLTextAreaElement>(null);

  // Persist on change
  useEffect(() => { saveRecords(records); }, [records]);

  // Auto-set deployedAt to now when form opens
  useEffect(() => {
    if (showForm && !editId) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setForm(f => ({ ...f, deployedAt: now.toISOString().slice(0, 16) }));
    }
  }, [showForm, editId]);

  // Focus appropriate input when form opens or mode changes
  useEffect(() => {
    if (showForm && !editId) {
      setTimeout(() => {
        if (bulkMode) bulkRef.current?.focus();
        else serialRef.current?.focus();
      }, 80);
    }
  }, [showForm, editId, bulkMode]);

  // ─── Serial list handlers ───────────────────────────────────────────────
  const addSerialsToList = useCallback((newSerials: string[]) => {
    setSerials(prev => {
      const existing = new Set(prev);
      const unique = newSerials.filter(s => !existing.has(s));
      return [...prev, ...unique];
    });
  }, []);

  const handleAddSerial = useCallback(() => {
    const trimmed = serialInput.trim().toUpperCase();
    if (!trimmed) return;
    if (serials.includes(trimmed)) {
      setFormError(`Serial "${trimmed}" is already in the list.`);
      return;
    }
    setSerials(prev => [...prev, trimmed]);
    setSerialInput('');
    setFormError('');
    serialRef.current?.focus();
  }, [serialInput, serials]);

  const handleSerialKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddSerial();
      }
    },
    [handleAddSerial]
  );

  /** Handle paste into the single-line input (scanner or manual paste) */
  const handleSerialPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData('text');
      // If pasted text contains multiple lines/commas, treat as bulk
      if (/[\n\r,\t]/.test(pasted)) {
        e.preventDefault();
        const parsed = parseSerials(pasted);
        if (parsed.length > 0) {
          addSerialsToList(parsed);
          setSerialInput('');
          setFormError('');
        }
      }
      // Otherwise let normal paste happen (single serial)
    },
    [addSerialsToList]
  );

  /** Add all serials from the bulk textarea */
  const handleBulkAdd = useCallback(() => {
    const parsed = parseSerials(bulkText);
    if (parsed.length === 0) {
      setFormError('No valid serials found. Enter one serial per line.');
      return;
    }
    addSerialsToList(parsed);
    setBulkText('');
    setFormError('');
  }, [bulkText, addSerialsToList]);

  const handleRemoveSerial = useCallback((serial: string) => {
    setSerials(prev => prev.filter(s => s !== serial));
  }, []);

  const handleClearAllSerials = useCallback(() => {
    setSerials([]);
  }, []);

  // ─── Form handlers ──────────────────────────────────────────────────────
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setForm(f => ({ ...f, [name]: value }));
      setFormError('');
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const { site, device, deployedBy, deployedAt } = form;

      if (editId) {
        if (!editSerial.trim())   { setFormError('Serial number is required.'); return; }
        if (!site.trim())         { setFormError('Site is required.'); return; }
        if (!device.trim())       { setFormError('Device / Brick is required.'); return; }
        if (!deployedBy.trim())   { setFormError('Deployed By alias is required.'); return; }
        if (!deployedAt)          { setFormError('Deployed At date/time is required.'); return; }

        setRecords(prev =>
          prev.map(r =>
            r.id === editId
              ? { ...r, ...form, serial: editSerial.trim().toUpperCase(), deployedAt: new Date(form.deployedAt).toISOString() }
              : r
          )
        );
        setFormMsg('✅ Record updated.');
        setEditId(null);
        setEditSerial('');
      } else {
        if (serials.length === 0) { setFormError('Add at least one serial number.'); return; }
        if (!site.trim())         { setFormError('Site is required.'); return; }
        if (!device.trim())       { setFormError('Device / Brick is required.'); return; }
        if (!deployedBy.trim())   { setFormError('Deployed By alias is required.'); return; }
        if (!deployedAt)          { setFormError('Deployed At date/time is required.'); return; }

        // Create one deployment record PER serial
        const newRecords: DeploymentRecord[] = serials.map(serial => ({
          id        : genId(),
          serial    : serial,
          site      : site.trim().toUpperCase(),
          dataHall  : form.dataHall.trim().toUpperCase(),
          device    : form.device.trim(),
          deployedBy: form.deployedBy.trim().toLowerCase(),
          deployedAt: new Date(form.deployedAt).toISOString(),
          deployTeam: form.deployTeam,
          opticType : form.opticType,
          portLabel : form.portLabel.trim(),
          note      : form.note.trim(),
          createdAt : nowIso(),
          status    : 'DEPLOYED',
        }));

        setRecords(prev => [...newRecords, ...prev]);
        setFormMsg(`✅ ${newRecords.length} deployment${newRecords.length > 1 ? 's' : ''} recorded.`);
      }

      setForm({ ...EMPTY_FORM });
      setSerials([]);
      setSerialInput('');
      setBulkText('');
      setShowForm(false);
      setTimeout(() => setFormMsg(''), 4000);
    },
    [form, editId, editSerial, serials]
  );

  const handleEdit = useCallback((record: DeploymentRecord) => {
    const dt = new Date(record.deployedAt);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    setForm({
      site      : record.site,
      dataHall  : record.dataHall,
      device    : record.device,
      deployedBy: record.deployedBy,
      deployedAt: dt.toISOString().slice(0, 16),
      deployTeam: record.deployTeam,
      opticType : record.opticType,
      portLabel : record.portLabel,
      note      : record.note,
    });
    setEditId(record.id);
    setEditSerial(record.serial);
    setSerials([]);
    setSerialInput('');
    setBulkText('');
    setBulkMode(false);
    setShowForm(true);
    setFormError('');
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (!window.confirm('Delete this deployment record?')) return;
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleStatusChange = useCallback(
    (id: string, status: DeploymentRecord['status']) => {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    },
    []
  );

  const handleCancelForm = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setEditSerial('');
    setSerials([]);
    setSerialInput('');
    setBulkText('');
    setBulkMode(false);
    setShowForm(false);
    setFormError('');
  }, []);

  // ─── Sorting ────────────────────────────────────────────────────────────
  const handleSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setSortDir('asc'); }
      return field;
    });
  }, []);

  // ─── Filtered + sorted records ──────────────────────────────────────────
  const displayed = React.useMemo(() => {
    let list = [...records];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        r.serial.toLowerCase().includes(q)     ||
        r.site.toLowerCase().includes(q)       ||
        r.device.toLowerCase().includes(q)     ||
        r.deployedBy.toLowerCase().includes(q) ||
        r.dataHall.toLowerCase().includes(q)   ||
        r.portLabel.toLowerCase().includes(q)  ||
        r.note.toLowerCase().includes(q)
      );
    }

    if (filterTeam)   list = list.filter(r => r.deployTeam === filterTeam);
    if (filterStatus) list = list.filter(r => r.status === filterStatus);

    list.sort((a, b) => {
      const av = String(a[sortField] ?? '');
      const bv = String(b[sortField] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return list;
  }, [records, search, filterTeam, filterStatus, sortField, sortDir]);

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = React.useMemo(() => {
    const total     = records.length;
    const deployed  = records.filter(r => r.status === 'DEPLOYED').length;
    const pending   = records.filter(r => r.status === 'PENDING').length;
    const cancelled = records.filter(r => r.status === 'CANCELLED').length;
    const byTeam: Record<string, number> = {};
    const byOptic: Record<string, number> = {};
    records.forEach(r => {
      byTeam[r.deployTeam]  = (byTeam[r.deployTeam]  || 0) + 1;
      byOptic[r.opticType]  = (byOptic[r.opticType]  || 0) + 1;
    });
    return { total, deployed, pending, cancelled, byTeam, byOptic };
  }, [records]);

  // ─── Sort indicator ─────────────────────────────────────────────────────
  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <span className="dt-sort-icon">↕</span>;
    return <span className="dt-sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="dt-root">

      {/* ── Header ── */}
      <div className="dt-header">
        <div className="dt-header-left">
          <h1 className="dt-title">
            🚀 Deployment <span className="dt-title-accent">Tracking</span>
          </h1>
          <p className="dt-subtitle">Record and monitor optic deployments</p>
        </div>
        <div className="dt-header-actions">
          <button
            className="dt-btn dt-btn-primary"
            onClick={() => { setShowForm(true); setEditId(null); setEditSerial(''); setSerials([]); setSerialInput(''); setBulkText(''); setBulkMode(false); setForm({ ...EMPTY_FORM }); }}
          >
            ➕ New Deployment
          </button>
          <button
            className="dt-btn dt-btn-secondary"
            onClick={() => exportCSV(records)}
            disabled={records.length === 0}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="dt-stats-bar">
        <div className="dt-stat-card">
          <span className="dt-stat-num dt-orange">{stats.total}</span>
          <span className="dt-stat-lbl">Total</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-num dt-green">{stats.deployed}</span>
          <span className="dt-stat-lbl">Deployed</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-num dt-amber">{stats.pending}</span>
          <span className="dt-stat-lbl">Pending</span>
        </div>
        <div className="dt-stat-card">
          <span className="dt-stat-num dt-red">{stats.cancelled}</span>
          <span className="dt-stat-lbl">Cancelled</span>
        </div>
      </div>

      {/* ── Success message ── */}
      {formMsg && <div className="dt-success-msg">{formMsg}</div>}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="dt-modal-overlay" onClick={e => { if (e.target === e.currentTarget) handleCancelForm(); }}>
          <div className="dt-modal">
            <div className="dt-modal-header">
              <h2>{editId ? '✏️ Edit Deployment' : '📦 Record Deployment'}</h2>
              <button className="dt-modal-close" onClick={handleCancelForm}>✕</button>
            </div>

            <form className="dt-form" onSubmit={handleSubmit} noValidate>

              {/* ── Serial Section ── */}
              {editId ? (
                /* Edit mode: single serial input */
                <div className="dt-form-row">
                  <div className="dt-field">
                    <label htmlFor="dt-serial">Serial Number *</label>
                    <input
                      ref={serialRef}
                      id="dt-serial"
                      type="text"
                      placeholder="e.g. IDOBH1826870"
                      value={editSerial}
                      onChange={e => { setEditSerial(e.target.value); setFormError(''); }}
                      maxLength={64}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className="dt-field">
                    <label htmlFor="dt-opticType">Optic Type</label>
                    <select
                      id="dt-opticType"
                      name="opticType"
                      value={form.opticType}
                      onChange={handleChange}
                    >
                      {OPTIC_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                /* New mode: scan or bulk paste */
                <>
                  {/* Mode toggle */}
                  <div className="dt-mode-toggle">
                    <button
                      type="button"
                      className={`dt-mode-btn ${!bulkMode ? 'active' : ''}`}
                      onClick={() => setBulkMode(false)}
                    >
                      📷 Scan / Type
                    </button>
                    <button
                      type="button"
                      className={`dt-mode-btn ${bulkMode ? 'active' : ''}`}
                      onClick={() => setBulkMode(true)}
                    >
                      📋 Bulk Paste
                    </button>
                  </div>

                  {!bulkMode ? (
                    /* Scan / Type mode — one at a time, scanner auto-adds on Enter */
                    <div className="dt-form-row">
                      <div className="dt-field">
                        <label htmlFor="dt-serial">Serial * — scan or type, press Enter to add</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            ref={serialRef}
                            id="dt-serial"
                            type="text"
                            placeholder="Scan barcode or type serial…"
                            value={serialInput}
                            onChange={e => { setSerialInput(e.target.value); setFormError(''); }}
                            onKeyDown={handleSerialKeyDown}
                            onPaste={handleSerialPaste}
                            maxLength={64}
                            autoComplete="off"
                            spellCheck={false}
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className="dt-btn dt-btn-secondary"
                            onClick={handleAddSerial}
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                      <div className="dt-field">
                        <label htmlFor="dt-opticType">Optic Type</label>
                        <select
                          id="dt-opticType"
                          name="opticType"
                          value={form.opticType}
                          onChange={handleChange}
                        >
                          {OPTIC_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    /* Bulk Paste mode — textarea for pasting many serials at once */
                    <div className="dt-form-row">
                      <div className="dt-field dt-field-full">
                        <label htmlFor="dt-bulk">Paste serials * (one per line, or comma-separated)</label>
                        <textarea
                          ref={bulkRef}
                          id="dt-bulk"
                          placeholder={"IDOBH1826870\nIDOBH1826871\nIDOBH1826872\n...paste all 50 here"}
                          value={bulkText}
                          onChange={e => { setBulkText(e.target.value); setFormError(''); }}
                          rows={5}
                          spellCheck={false}
                          style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="dt-btn dt-btn-secondary"
                            onClick={handleBulkAdd}
                          >
                            ✚ Add All to List
                          </button>
                          <span style={{ fontSize: '0.8rem', color: '#888' }}>
                            {bulkText.trim() ? `~${parseSerials(bulkText).length} serial(s) detected` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Optic type (shown in bulk mode since it's not in the row above) */}
                  {bulkMode && (
                    <div className="dt-form-row">
                      <div className="dt-field">
                        <label htmlFor="dt-opticType">Optic Type</label>
                        <select
                          id="dt-opticType"
                          name="opticType"
                          value={form.opticType}
                          onChange={handleChange}
                        >
                          {OPTIC_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Serial chips / tags */}
                  {serials.length > 0 && (
                    <div className="dt-serial-chips">
                      <div className="dt-chips-header">
                        <span className="dt-serial-count">
                          ✅ {serials.length} serial{serials.length !== 1 ? 's' : ''} → {serials.length} deployment{serials.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          type="button"
                          className="dt-btn dt-btn-ghost dt-btn-sm"
                          onClick={handleClearAllSerials}
                        >
                          🗑 Clear All
                        </button>
                      </div>
                      <div className="dt-chips-list">
                        {serials.map(s => (
                          <span key={s} className="dt-serial-chip">
                            {s}
                            <button
                              type="button"
                              className="dt-chip-remove"
                              onClick={() => handleRemoveSerial(s)}
                              title="Remove"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Row 2 */}
              <div className="dt-form-row">
                <div className="dt-field">
                  <label htmlFor="dt-site">Site *</label>
                  <input
                    id="dt-site"
                    name="site"
                    type="text"
                    placeholder="e.g. IAD195"
                    value={form.site}
                    onChange={handleChange}
                    maxLength={32}
                    autoComplete="off"
                  />
                </div>
                <div className="dt-field">
                  <label htmlFor="dt-dataHall">Data Hall</label>
                  <input
                    id="dt-dataHall"
                    name="dataHall"
                    type="text"
                    placeholder="e.g. DH 2-2"
                    value={form.dataHall}
                    onChange={handleChange}
                    maxLength={32}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="dt-form-row">
                <div className="dt-field dt-field-full">
                  <label htmlFor="dt-device">Device / Brick *</label>
                  <input
                    id="dt-device"
                    name="device"
                    type="text"
                    placeholder="e.g. iad7-109-es-e1-b48"
                    value={form.device}
                    onChange={handleChange}
                    maxLength={128}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Row 4 */}
              <div className="dt-form-row">
                <div className="dt-field">
                  <label htmlFor="dt-deployedBy">Deployed By (alias) *</label>
                  <input
                    id="dt-deployedBy"
                    name="deployedBy"
                    type="text"
                    placeholder="e.g. jdoe"
                    value={form.deployedBy}
                    onChange={handleChange}
                    maxLength={20}
                    autoComplete="off"
                  />
                </div>
                <div className="dt-field">
                  <label htmlFor="dt-deployedAt">Deployed At *</label>
                  <input
                    id="dt-deployedAt"
                    name="deployedAt"
                    type="datetime-local"
                    value={form.deployedAt}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Row 5 */}
              <div className="dt-form-row">
                <div className="dt-field">
                  <label htmlFor="dt-deployTeam">Deploy Team</label>
                  <select
                    id="dt-deployTeam"
                    name="deployTeam"
                    value={form.deployTeam}
                    onChange={handleChange}
                  >
                    {KNOWN_TEAMS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="dt-field">
                  <label htmlFor="dt-portLabel">Port / Label</label>
                  <input
                    id="dt-portLabel"
                    name="portLabel"
                    type="text"
                    placeholder="e.g. Port-1A, dim42"
                    value={form.portLabel}
                    onChange={handleChange}
                    maxLength={64}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Row 6 */}
              <div className="dt-form-row">
                <div className="dt-field dt-field-full">
                  <label htmlFor="dt-note">Note</label>
                  <textarea
                    id="dt-note"
                    name="note"
                    placeholder="Optional note…"
                    value={form.note}
                    onChange={handleChange}
                    maxLength={256}
                    rows={2}
                  />
                </div>
              </div>

              {formError && <div className="dt-form-error">⚠ {formError}</div>}

              <div className="dt-form-actions">
                <button type="button" className="dt-btn dt-btn-ghost" onClick={handleCancelForm}>
                  Cancel
                </button>
                <button type="submit" className="dt-btn dt-btn-primary">
                  {editId ? '💾 Save Changes' : `🚀 Record Deployment${serials.length > 1 ? `s (${serials.length})` : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="dt-filters">
        <input
          className="dt-search-input"
          type="text"
          placeholder="🔍 Search serial, site, device, alias…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          spellCheck={false}
        />
        <select
          className="dt-filter-select"
          value={filterTeam}
          onChange={e => setFilterTeam(e.target.value as TeamType | '')}
        >
          <option value="">All Teams</option>
          {KNOWN_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          className="dt-filter-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as DeploymentRecord['status'] | '')}
        >
          <option value="">All Statuses</option>
          <option value="DEPLOYED">Deployed</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        {(search || filterTeam || filterStatus) && (
          <button
            className="dt-btn dt-btn-ghost"
            onClick={() => { setSearch(''); setFilterTeam(''); setFilterStatus(''); }}
          >
            ✕ Clear
          </button>
        )}
        <span className="dt-result-count">{displayed.length} record{displayed.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Table ── */}
      {displayed.length === 0 ? (
        <div className="dt-empty">
          {records.length === 0
            ? 'No deployments recorded yet. Click ➕ New Deployment to get started.'
            : 'No records match your filters.'}
        </div>
      ) : (
        <div className="dt-table-wrap">
          <table className="dt-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('serial')}     className="dt-th-sortable">Serial {sortIcon('serial')}</th>
                <th onClick={() => handleSort('opticType')}  className="dt-th-sortable">Type {sortIcon('opticType')}</th>
                <th onClick={() => handleSort('site')}       className="dt-th-sortable">Site {sortIcon('site')}</th>
                <th onClick={() => handleSort('dataHall')}   className="dt-th-sortable">Data Hall {sortIcon('dataHall')}</th>
                <th onClick={() => handleSort('device')}     className="dt-th-sortable">Device {sortIcon('device')}</th>
                <th onClick={() => handleSort('deployedBy')} className="dt-th-sortable">Deployed By {sortIcon('deployedBy')}</th>
                <th onClick={() => handleSort('deployedAt')} className="dt-th-sortable">Deployed At {sortIcon('deployedAt')}</th>
                <th onClick={() => handleSort('deployTeam')} className="dt-th-sortable">Team {sortIcon('deployTeam')}</th>
                <th onClick={() => handleSort('status')}     className="dt-th-sortable">Status {sortIcon('status')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => (
                <tr key={r.id} className={`dt-row dt-row-${r.status.toLowerCase()}`}>
                  <td className="dt-cell-serial">{r.serial}</td>
                  <td>
                    <span className={`dt-badge dt-optic ${r.opticType.includes('400') ? 'dt-optic-400' : r.opticType.includes('100') ? 'dt-optic-100' : 'dt-optic-other'}`}>
                      {r.opticType}
                    </span>
                  </td>
                  <td className="dt-cell-site">{r.site}</td>
                  <td className="dt-cell-dh">{r.dataHall || '—'}</td>
                  <td className="dt-cell-device" title={r.device}>{r.device}</td>
                  <td className="dt-cell-alias">{r.deployedBy}</td>
                  <td className="dt-cell-date">{fmtDate(r.deployedAt)}</td>
                  <td>
                    <span className="dt-badge dt-team">{r.deployTeam}</span>
                  </td>
                  <td>
                    <select
                      className={`dt-status-select dt-status-${r.status.toLowerCase()}`}
                      value={r.status}
                      onChange={e => handleStatusChange(r.id, e.target.value as DeploymentRecord['status'])}
                    >
                      <option value="DEPLOYED">Deployed</option>
                      <option value="PENDING">Pending</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </td>
                  <td className="dt-cell-actions">
                    <button className="dt-icon-btn dt-edit-btn" onClick={() => handleEdit(r)} title="Edit">✏️</button>
                    <button className="dt-icon-btn dt-del-btn"  onClick={() => handleDelete(r.id)} title="Delete">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeploymentTracking;

