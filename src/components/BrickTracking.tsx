import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBridge } from '../hooks/useBridge';
import type { PortData, PortStatus, SlotData } from '../types/index';
import { loadSavedOptics, saveOptic, deleteOptic } from '../api/opticsApi';
import BrickHandoffPanel from '../components/BrickHandoffPanel';
import '../styles/BrickTracking.css';

// ── Local-only types ──────────────────────────────────────
interface SavedPort {
  serial   : string | null;
  installer: string;
  at       : string;
}

interface SavedOptics {
  [rSlot: string]: {
    [port: string]: SavedPort;
  };
}

// ── Constants ─────────────────────────────────────────────
const PORT_ORDER = [1,3,5,7,9,11,13,15, 2,4,6,8,10,12,14,16];
const R_SLOTS    = Array.from({ length: 16 }, (_, i) => `r${i + 1}`);
const ODD_SLOTS  = R_SLOTS.filter((_, i) => i % 2 === 0);
const EVEN_SLOTS = R_SLOTS.filter((_, i) => i % 2 !== 0);

// ── Port color logic ──────────────────────────────────────
function getPortClass(port: PortData, savedPort: SavedPort | undefined): string {
  if (port.status === 'loading')      return 'port-cell loading';
  if (port.status === 'deployed')     return 'port-cell deployed';
  if (port.status === 'not-deployed') return 'port-cell not-deployed';
  if (port.status === 'seated')       return 'port-cell not-deployed';
  if (savedPort)                      return 'port-cell pending';
  return 'port-cell empty';
}

// ── Tooltip text ──────────────────────────────────────────
function getTooltip(port: PortData, savedPort: SavedPort | undefined): string {
  if (port.status === 'loading') return 'Loading...';

  if (
    (port.status === 'deployed' || port.status === 'not-deployed' || port.status === 'seated')
    && port.serialNumber
  ) {
    const state = port.mobilityState ?? 'UNKNOWN';
    return `SN: ${port.serialNumber}\nState: ${state}\nClick to open Mobility`;
  }

  if (savedPort) {
    return `Manually Installed\nBy: ${savedPort.installer}\nAt: ${new Date(savedPort.at).toLocaleString()}\nRight-click to remove`;
  }

  const statusMap: Record<string, string> = {
    missing   : 'No Optic — Click to mark installed',
    'no-table': 'Brick status unknown',
    timeout   : 'Request timed out',
    error     : 'Fetch error',
  };
  return statusMap[port.status] ?? 'No Optic — Click to mark installed';
}

// ── Component ─────────────────────────────────────────────
const BrickTracking: React.FC = () => {
  const { user }                            = useAuth();
  const { requestBrickData, isBridgeReady } = useBridge();

  const [searchValue, setSearchValue]       = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [statusText, setStatusText]         = useState('Enter a brick name to begin.');
  const [currentBrick, setCurrentBrick]     = useState('');
  const [rowResults, setRowResults]         = useState<SlotData[]>([]);
  const [savedOptics, setSavedOptics]       = useState<SavedOptics>({});
  const [showHandoff, setShowHandoff]       = useState(false);

  const abortRef        = useRef<AbortController | null>(null);
  const currentBrickRef = useRef<string>('');

  // ── Keep ref in sync with state ───────────────────────────
  useEffect(() => {
    currentBrickRef.current = currentBrick;
  }, [currentBrick]);

  // ── Save a port locally + persist to API ─────────────────
  const savePort = useCallback(async (rSlot: string, port: string) => {
    if (!user) return;
    const brick = currentBrickRef.current;
    if (!brick) return;

    const now = new Date().toISOString();

    setSavedOptics(prev => ({
      ...prev,
      [rSlot]: {
        ...(prev[rSlot] ?? {}),
        [port]: { serial: null, installer: user.alias, at: now },
      },
    }));

    try {
      await saveOptic(user.alias, brick, rSlot, Number(port), null);
    } catch (err) {
      console.error('Failed to save optic (local state preserved):', err);
    }
  }, [user]); // removed currentBrick — now uses ref

  // ── Remove a saved port locally + delete from API ─────────
  const removePort = useCallback(async (rSlot: string, port: string) => {
    if (!user) return;
    const brick = currentBrickRef.current;
    if (!brick) return;

    setSavedOptics(prev => {
      const updated = { ...prev };
      if (updated[rSlot]) {
        const slotCopy = { ...updated[rSlot] };
        delete slotCopy[port];
        if (Object.keys(slotCopy).length === 0) {
          delete updated[rSlot];
        } else {
          updated[rSlot] = slotCopy;
        }
      }
      return updated;
    });

    try {
      await deleteOptic(user.alias, brick, rSlot, Number(port));
    } catch (err) {
      console.error('Failed to delete optic:', err);
    }
  }, [user]); // removed currentBrick — now uses ref

  // ── Open handoff panel ────────────────────────────────────
  const handleBrickLabelClick = useCallback(() => {
    if (!currentBrick) return;
    setShowHandoff(true);
  }, [currentBrick]);

  // ── Main search ───────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const deviceName = searchValue.trim();
    if (!deviceName) return;

    const brickPattern = /^([a-z]+\d+)-(\d+)-([a-z]+)-([a-z0-9]+)-([a-z0-9]+)$/i;
    if (!brickPattern.test(deviceName)) {
      setStatusText('⚠ Invalid brick format. Example: iad7-109-es-e1-b48');
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const normalizedBrick = deviceName.toUpperCase();

    setIsLoading(true);
    setSavedOptics({});
    setShowHandoff(false);
    setCurrentBrick(normalizedBrick);
    currentBrickRef.current = normalizedBrick; // sync ref immediately — don't wait for state
    setStatusText('Fetching optic data...');

    setRowResults(
      R_SLOTS.map(rSlot => ({
        rSlot,
        host : `${deviceName}-t1-${rSlot}`,
        ports: PORT_ORDER.map(n => ({
          port        : String(n),
          status      : 'loading' as const,
          serialNumber: null,
        })),
      }))
    );

    // ── Run both fetches in parallel, capture BOTH results ──
    const [brickResult, opticsResult] = await Promise.allSettled([
      new Promise<SlotData[]>((resolve, reject) => {
        requestBrickData(
          deviceName,
          (data)  => resolve(data),
          (error) => reject(new Error(error))
        );
      }),
      (async (): Promise<SavedOptics> => {
        if (!user?.alias) return {};
        const saved = await loadSavedOptics(user.alias, normalizedBrick);
        const normalized: SavedOptics = {};
        if (Array.isArray(saved)) {
          saved.forEach((item: any) => {
            if (!normalized[item.rSlot]) normalized[item.rSlot] = {};
            normalized[item.rSlot][String(item.port)] = {
              serial   : item.serial ?? null,
              installer: item.alias,
              at       : item.at,
            };
          });
        } else {
          Object.assign(normalized, saved);
        }
        return normalized;
      })(),
    ]);

    if (abortRef.current?.signal.aborted) return;

    // ── Apply saved optics regardless of brick result ────────
    if (opticsResult.status === 'fulfilled') {
      setSavedOptics(opticsResult.value);
    } else {
      console.error('Failed to load saved optics:', opticsResult.reason);
    }

    // ── Apply brick data ──────────────────────────────────────
    if (brickResult.status === 'fulfilled') {
      setRowResults(brickResult.value);

      let found = 0;
      const total = brickResult.value.length * 16;
      brickResult.value.forEach(row => {
        row.ports.forEach(p => {
          if (
            p.status === 'deployed'     ||
            p.status === 'not-deployed' ||
            p.status === 'seated'
          ) found++;
        });
      });

      setStatusText(`${found} / ${total} ports have optics`);
    } else {
      if (!(brickResult.reason as Error).message?.includes('aborted')) {
        setStatusText('⚠ Failed to fetch brick data. Is the Tampermonkey bridge running?');
      }
    }

    setIsLoading(false);
  }, [searchValue, requestBrickData, user]);

  // ── Port click handlers ───────────────────────────────────
  const handlePortClick = useCallback((
    port     : PortData,
    rSlot    : string,
    savedPort: SavedPort | undefined
  ) => {
    if (!currentBrickRef.current) return;

    if (port.serialNumber && (
      port.status === 'deployed'     ||
      port.status === 'not-deployed' ||
      port.status === 'seated'
    )) {
      window.open(`https://mobility.amazon.com/?serial=${port.serialNumber}`, '_blank');
      return;
    }

    if (savedPort) return;

    const nonActionable: PortStatus[] = ['loading', 'no-table', 'timeout', 'error'];
    if (nonActionable.includes(port.status)) return;

    savePort(rSlot, port.port);
  }, [savePort]); // removed currentBrick — now uses ref

  const handlePortContextMenu = useCallback((
    e        : React.MouseEvent,
    port     : PortData,
    rSlot    : string,
    savedPort: SavedPort | undefined
  ) => {
    e.preventDefault();
    if (!currentBrickRef.current || !savedPort) return;
    removePort(rSlot, port.port);
  }, [removePort]); // removed currentBrick — now uses ref

  // ── Render a single column of r-slots ────────────────────
  const renderColumn = (slots: string[], label: string) => (
    <div className="board-column">
      <div className="column-header">{label}</div>
      {slots.map(rSlot => {
        const row = rowResults.find(r => r.rSlot === rSlot);
        return (
          <div key={rSlot} className="board-section">
            <div className="board-section-label">
              {row?.host ?? rSlot}
            </div>
            <div className="port-grid">
              {PORT_ORDER.map(portNum => {
                const portStr  = String(portNum);
                const portData = row?.ports.find(p => p.port === portStr) ?? {
                  port        : portStr,
                  status      : 'loading' as const,
                  serialNumber: null,
                };
                const savedPort = savedOptics?.[rSlot]?.[portStr];
                const cellClass = getPortClass(portData, savedPort);
                const tooltip   = getTooltip(portData, savedPort);

                return (
                  <div
                    key={portStr}
                    className={cellClass}
                    onClick={() => handlePortClick(portData, rSlot, savedPort)}
                    onContextMenu={(e) => handlePortContextMenu(e, portData, rSlot, savedPort)}
                    title={tooltip}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="port-number">{portNum}</span>
                    {portData.opticType && (
                      <span className="port-band">
                        {portData.opticType.split(' ')[0]}
                      </span>
                    )}
                    <div className="port-tooltip">{tooltip}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="brick-tracking-page">
      <div className="brick-tracking-container">

        {/* Header */}
        <div className="bt-header">
          <h1 className="bt-title">
            Brick <span>Tracking</span>
          </h1>
          {currentBrick && (
            <span
              className="bt-current-brick bt-current-brick--clickable"
              onClick={handleBrickLabelClick}
              title="Click to view handoff status"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleBrickLabelClick()}
            >
              {currentBrick} ↗
            </span>
          )}
        </div>

        {/* Handoff panel overlay */}
        {showHandoff && (
          <BrickHandoffPanel
            deviceName={currentBrick}
            onClose={() => setShowHandoff(false)}
          />
        )}

        {/* TM Bridge Warning */}
        {isBridgeReady === false && (
          <div className="tm-warning">
            ⚠ Tampermonkey bridge not detected. Install the bridge script and
            refresh to enable live NSM data.
          </div>
        )}

        {/* Search */}
        <div className="bt-search-row">
          <input
            className="bt-search-input"
            type="text"
            placeholder="Enter brick name — e.g. iad7-109-es-e1-b48"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSearch()}
            spellCheck={false}
          />
          <button
            className="bt-search-btn"
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : '⬡ Search'}
          </button>
        </div>

        {/* Legend */}
        <div className="bt-legend">
          <div className="legend-item">
            <span className="legend-dot deployed" />
            Installed &amp; Deployed
          </div>
          <div className="legend-item">
            <span className="legend-dot not-deployed" />
            Installed &amp; Not Deployed
          </div>
          <div className="legend-item">
            <span className="legend-dot pending" />
            Installed (Pending NSM)
          </div>
          <div className="legend-item">
            <span className="legend-dot empty" />
            Not Installed
          </div>
        </div>

        {/* Status Bar */}
        <div className="bt-status-bar">{statusText}</div>

        {/* Boards */}
        {rowResults.length > 0 && (
          <div className="boards-split">
            {renderColumn(ODD_SLOTS,  'ODD')}
            {renderColumn(EVEN_SLOTS, 'EVEN')}
          </div>
        )}

      </div>
    </div>
  );
};

export default BrickTracking;
