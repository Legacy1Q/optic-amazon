import React, { useEffect, useState } from 'react';
import { useBridge, HandoffData } from '../hooks/useBridge';

interface Props {
  deviceName : string;
  onClose    : () => void;
}

function getPhaseFillColor(pct: number): string {
  if (pct >= 100) return '#22c55e';
  if (pct > 0)    return '#6366f1';
  return '#334155';
}

function getStatusBadgeClass(status: string): string {
  const s = status.toLowerCase().replace(/\s+/g, '_');
  return `handoff-status-badge status-${s}`;
}

function getStepBadgeClass(status: string): string {
  const s = status.toLowerCase().replace(/\s+/g, '_');
  return `step-badge step-${s}`;
}

const BrickHandoffPanel: React.FC<Props> = ({ deviceName, onClose }) => {
  const { requestUNSData } = useBridge();

  const [data,    setData]    = useState<HandoffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!deviceName) return;
    setLoading(true);
    setError(null);
    setData(null);

    const cancel = requestUNSData(
      deviceName,
      (result) => { setData(result); setLoading(false); },
      (err)    => { setError(err);   setLoading(false); }
    );

    return cancel;
  }, [deviceName, requestUNSData]);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }); }
    catch { return iso; }
  };

  return (
    <div className="handoff-panel">
      {/* Header */}
      <div className="handoff-panel-header">
        <span className="handoff-panel-title">
          Handoff Status — {deviceName.toUpperCase()}
        </span>
        <button className="handoff-panel-close" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="handoff-panel-body">
        {/* Loading */}
        {loading && (
          <p className="handoff-loading">Fetching UNS data…</p>
        )}

        {/* Error */}
        {error && (
          <p className="handoff-loading handoff-error">⚠ {error}</p>
        )}

        {/* Data */}
        {!loading && !error && data && data.workflowStatus !== 'NOT_FOUND' && (
          <>
            {/* Summary rows */}
            <div className="handoff-summary">
              <div className="handoff-summary-row">
                <span className="handoff-summary-key">Workflow Status</span>
                <span className={getStatusBadgeClass(data.workflowStatus)}>
                  {data.workflowStatus}
                </span>
              </div>
              <div className="handoff-summary-row">
                <span className="handoff-summary-key">Projected Handoff</span>
                <span className="handoff-summary-val">
                  {formatDate(data.projectedDate)}
                </span>
              </div>
            </div>

            {/* Timeline phases */}
            {data.timelineSteps && data.timelineSteps.length > 0 && (
              <div className="handoff-timeline">
                <h4 className="handoff-section-title">Timeline</h4>
                {data.timelineSteps.map((step) => (
                  <div key={step.name} className="uns-phase-row">
                    <span className="uns-phase-label">{step.name}</span>
                    <div className="uns-phase-track">
                      <div
                        className="uns-phase-fill"
                        style={{
                          width: `${step.pct}%`,
                          background: getPhaseFillColor(step.pct),
                        }}
                      />
                    </div>
                    <span className="uns-phase-pct">{step.pct}%</span>
                  </div>
                ))}
              </div>
            )}

            {/* Workflow steps table */}
            {data.workflowSteps && data.workflowSteps.length > 0 && (
              <div className="handoff-steps">
                <h4 className="handoff-section-title">Workflow Steps</h4>
                <table className="handoff-steps-table">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.workflowSteps.map((s, i) => (
                      <tr key={i}>
                        <td>{s.name}</td>
                        <td>
                          <span className={getStepBadgeClass(s.status)}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* UNS link */}
            {data.workflowUrl && (
              <div className="handoff-uns-link">
                <a href={data.workflowUrl} target="_blank" rel="noreferrer">
                  Open in UNS ↗
                </a>
              </div>
            )}
          </>
        )}

        {/* Not found */}
        {!loading && !error && data?.workflowStatus === 'NOT_FOUND' && (
          <p className="handoff-empty">
            No AggBrickScalingWorkflow found for <strong>{deviceName}</strong>.
            {data.workflowUrl && (
              <>
                {' '}
                <a href={data.workflowUrl} target="_blank" rel="noreferrer">
                  Search manually in UNS ↗
                </a>
              </>
            )}
          </p>
        )}

        {/* Null data */}
        {!loading && !error && !data && (
          <p className="handoff-empty">No handoff data found for this brick.</p>
        )}
      </div>
    </div>
  );
};

export default BrickHandoffPanel;

