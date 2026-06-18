import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/BinTracking.css';

// ─── Types ───────────────────────────────────────────────────────────────────
interface BinLocation {
  full: string;
  site: string;
  room: string;
  bin: string;
}

interface SpeedBreakdown {
  '400G': number;
  '100G': number;
  '10G': number;
  Other: number;
}

interface BinData {
  location: BinLocation;
  totalParts: number;
  speeds: SpeedBreakdown;
  lastUpdated: string;
}

// ─── TM Bridge Hook (matches optic-amazon Bridge postMessage pattern) ────────
function useBinBridge() {
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

      if (msg.type === 'BIN_RESPONSE') {
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

  const fetchBinData = useCallback(
    (site: string, room: string, bin: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        const requestId = `bin_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        pendingRef.current.set(requestId, { resolve, reject });

        window.postMessage(
          { type: 'BIN_REQUEST', requestId, payload: { site, room, bin } },
          window.location.origin
        );

        setTimeout(() => {
          if (pendingRef.current.has(requestId)) {
            pendingRef.current.delete(requestId);
            reject(new Error('Bridge request timed out'));
          }
        }, 15000);
      });
    },
    []
  );

  return { bridgeReady, fetchBinData };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const LOW_THRESHOLD = 500;

function parseBinFormat(input: string): BinLocation | null {
  const m = input.trim().match(/^([A-Z0-9]+)\.([A-Z0-9_]+)\.([A-Z0-9_]+)$/i);
  if (!m) return null;
  return { full: input.trim().toUpperCase(), site: m[1], room: m[2], bin: m[3] };
}

function classifySpeed(description: string): keyof SpeedBreakdown {
  const desc = (description || '').toUpperCase();
  if (desc.includes('400G')) return '400G';
  if (desc.includes('100G')) return '100G';
  if (desc.includes('10G') && !desc.includes('100G')) return '10G';
  return 'Other';
}

function getMobilityUrl(location: BinLocation): string {
  return `https://mobility.amazon.com/part/search?search_type=all&search_string=site:${location.site}%20AND%20room:${location.room}%20AND%20bin:${location.bin}&max_rows=50&query=GO`;
}

function getSimCreateUrl(): string {
  return 'https://t.corp.amazon.com/create/templates/294727e0-09e8-4189-ad5f-3ddd066b74dc';
}

// ─── Component ───────────────────────────────────────────────────────────────
const BinTracking: React.FC = () => {
  const { bridgeReady, fetchBinData } = useBinBridge();

  const [binInput, setBinInput] = useState('');
  const [binData, setBinData] = useState<BinData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBins, setSavedBins] = useState<BinLocation[]>(() => {
    try {
      const stored = localStorage.getItem('optic_saved_bins');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('optic_saved_bins', JSON.stringify(savedBins));
  }, [savedBins]);

  // ─── Fetch Bin ───────────────────────────────────────────────────────────
  const searchBin = useCallback(
    async (location: BinLocation) => {
      setLoading(true);
      setError(null);
      setBinData(null);

      try {
        const response = await fetchBinData(location.site, location.room, location.bin);

        const numFound = response?.response?.numFound ?? 0;
        const docs = response?.response?.docs ?? [];

        const speeds: SpeedBreakdown = { '400G': 0, '100G': 0, '10G': 0, Other: 0 };
        docs.forEach((doc: any) => {
          const category = classifySpeed(doc.model_description || doc.description || '');
          speeds[category]++;
        });

        setBinData({
          location,
          totalParts: numFound,
          speeds,
          lastUpdated: new Date().toLocaleTimeString(),
        });

        setSavedBins((prev) => {
          const exists = prev.some(
            (b) => b.site === location.site && b.room === location.room && b.bin === location.bin
          );
          if (exists) return prev;
          return [location, ...prev].slice(0, 5);
        });
      } catch (err: any) {
        setError(err.message || 'Failed to fetch bin data');
      } finally {
        setLoading(false);
      }
    },
    [fetchBinData]
  );

  const handleSearch = () => {
    const location = parseBinFormat(binInput);
    if (!location) {
      setError('Invalid format. Use SITE.ROOM.BIN (e.g. IAD7.1A_ROOM.BIN_01)');
      return;
    }
    searchBin(location);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleSearch();
  };

  const handleQuickSelect = (location: BinLocation) => {
    setBinInput(location.full);
    searchBin(location);
  };

  const handleRemoveSaved = (index: number) => {
    setSavedBins((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRefresh = () => {
    if (binData) searchBin(binData.location);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="bin-tracking">
      <div className="bin-tracking-header">
        <h1>
          📦 Bin <span className="bin-title-accent">Tracking</span>
        </h1>
        <p className="bin-tracking-subtitle">Monitor optic inventory in bins</p>
      </div>

      {/* TM Bridge Warning */}
      {!bridgeReady && (
        <div className="bin-bridge-warning">
          ⚠️ Tampermonkey bridge not detected. Ensure the optic-amazon Bridge script is running and refresh.
        </div>
      )}

      {/* Search Section */}
      <div className="bin-search-section">
        <div className="bin-search-bar">
          <input
            ref={inputRef}
            type="text"
            className="bin-search-input"
            placeholder="Enter bin location (SITE.ROOM.BIN)"
            value={binInput}
            onChange={(e) => setBinInput(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            disabled={!bridgeReady}
            spellCheck={false}
          />
          <button
            className="bin-search-btn"
            onClick={handleSearch}
            disabled={!bridgeReady || loading || !binInput.trim()}
          >
            {loading ? '⏳ Loading...' : '🔍 Search'}
          </button>
        </div>
        <span className="bin-format-hint">Format: SITE.ROOM.BIN</span>
      </div>

      {/* Error */}
      {error && <div className="bin-error">⚠ {error}</div>}

      {/* Results */}
      {binData && (
        <div className="bin-results">
          {/* Location Card */}
          <div className="bin-card bin-location-card">
            <div className="bin-card-header">
              <span className="bin-card-title">📍 Bin Location</span>
              <button className="bin-refresh-btn" onClick={handleRefresh} title="Refresh">
                🔄
              </button>
            </div>
            <div className="bin-location-full">{binData.location.full}</div>
            <div className="bin-location-details">
              <div className="bin-detail-row">
                <span className="bin-label">Site</span>
                <span className="bin-value">{binData.location.site}</span>
              </div>
              <div className="bin-detail-row">
                <span className="bin-label">Room</span>
                <span className="bin-value">{binData.location.room}</span>
              </div>
              <div className="bin-detail-row">
                <span className="bin-label">Bin</span>
                <span className="bin-value">{binData.location.bin}</span>
              </div>
            </div>
            <div className="bin-card-footer">
              <span className="bin-updated">Last updated: {binData.lastUpdated}</span>
            </div>
          </div>

          {/* Parts Count Card */}
          <div className={`bin-card bin-count-card ${binData.totalParts <= LOW_THRESHOLD ? 'bin-low' : ''}`}>
            <div className="bin-card-header">
              <span className="bin-card-title">📊 Total Parts</span>
              {binData.totalParts <= LOW_THRESHOLD && <span className="bin-low-badge">⚠️ LOW</span>}
            </div>
            <div className="bin-count-display">
              <span className="bin-count-number">{binData.totalParts.toLocaleString()}</span>
              <span className="bin-count-label">total parts</span>
            </div>

            {/* Low Inventory Alert */}
            {binData.totalParts <= LOW_THRESHOLD && (
              <div className="bin-low-alert">
                <p>⚠️ Inventory is below {LOW_THRESHOLD} parts!</p>
                <a
                  href={getSimCreateUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bin-sim-link"
                >
                  📋 Create SIM Ticket
                </a>
              </div>
            )}

            <div className="bin-card-footer">
              <a
                href={getMobilityUrl(binData.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="bin-mobility-link"
              >
                🔗 View in Mobility
              </a>
            </div>
          </div>

          {/* ─── Parts Type Counter Card (always visible) ─────────────────── */}
          <div className="bin-card bin-speeds-card">
            <div className="bin-card-header">
              <span className="bin-card-title">⚡ Parts by Type</span>
            </div>
            <div className="bin-type-counter">
              <div className="bin-type-item type-400g">
                <span className="bin-type-count">{binData.speeds['400G'].toLocaleString()}</span>
                <span className="bin-type-label">400G</span>
                <span className="bin-type-pct">
                  {binData.totalParts > 0
                    ? `${((binData.speeds['400G'] / binData.totalParts) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
              <div className="bin-type-item type-100g">
                <span className="bin-type-count">{binData.speeds['100G'].toLocaleString()}</span>
                <span className="bin-type-label">100G</span>
                <span className="bin-type-pct">
                  {binData.totalParts > 0
                    ? `${((binData.speeds['100G'] / binData.totalParts) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
              <div className="bin-type-item type-10g">
                <span className="bin-type-count">{binData.speeds['10G'].toLocaleString()}</span>
                <span className="bin-type-label">10G</span>
                <span className="bin-type-pct">
                  {binData.totalParts > 0
                    ? `${((binData.speeds['10G'] / binData.totalParts) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
              <div className="bin-type-item type-other">
                <span className="bin-type-count">{binData.speeds['Other'].toLocaleString()}</span>
                <span className="bin-type-label">Other</span>
                <span className="bin-type-pct">
                  {binData.totalParts > 0
                    ? `${((binData.speeds['Other'] / binData.totalParts) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
            </div>
            {/* Visual bar breakdown */}
            <div className="bin-type-bar">
              {binData.totalParts > 0 && (
                <>
                  <div
                    className="bin-type-bar-segment bar-400g"
                    style={{ width: `${(binData.speeds['400G'] / binData.totalParts) * 100}%` }}
                    title={`400G: ${binData.speeds['400G']}`}
                  />
                  <div
                    className="bin-type-bar-segment bar-100g"
                    style={{ width: `${(binData.speeds['100G'] / binData.totalParts) * 100}%` }}
                    title={`100G: ${binData.speeds['100G']}`}
                  />
                  <div
                    className="bin-type-bar-segment bar-10g"
                    style={{ width: `${(binData.speeds['10G'] / binData.totalParts) * 100}%` }}
                    title={`10G: ${binData.speeds['10G']}`}
                  />
                  <div
                    className="bin-type-bar-segment bar-other"
                    style={{ width: `${(binData.speeds['Other'] / binData.totalParts) * 100}%` }}
                    title={`Other: ${binData.speeds['Other']}`}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saved Bins */}
      {savedBins.length > 0 && (
        <div className="bin-saved-section">
          <h3>📌 Recent Bins</h3>
          <div className="bin-saved-list">
            {savedBins.map((loc, idx) => (
              <div key={idx} className="bin-saved-item" onClick={() => handleQuickSelect(loc)}>
                <span className="bin-saved-name">{loc.full}</span>
                <button
                  className="bin-saved-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveSaved(idx);
                  }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BinTracking;
