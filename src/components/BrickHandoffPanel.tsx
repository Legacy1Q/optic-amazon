import React, { useEffect, useState } from 'react';
import { useBridge } from '../hooks/useBridge';

interface HandoffData {
  workflowStatus: string | null;
  projectedDate: string | null;
  timelineSteps: any[];
  workflowSteps: any[];
  workflowUrl: string;
}

interface BrickHandoffPanelProps {
  deviceName: string;
  onClose: () => void;
}

export default function BrickHandoffPanel({ deviceName, onClose }: BrickHandoffPanelProps) {
  const { requestUNSData, isBridgeReady } = useBridge();
  const [data, setData] = useState<HandoffData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isBridgeReady || !deviceName) return;

    const cancel = requestUNSData(
      deviceName,
      (handoffData: HandoffData) => {
        setData(handoffData);
      },
      (err: string) => {
        setError(err);
      }
    );

    return cancel;
  }, [deviceName, isBridgeReady]);

  // Build RDPM link directly (no API call)
  const rdpmUrl = buildRDPMUrl(deviceName);

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>{deviceName}</h3>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {!isBridgeReady && (
          <div style={styles.warning}>
            ⚠️ Tampermonkey bridge not detected. Install the optic-amazon Bridge script.
          </div>
        )}

        {error && (
          <div style={styles.warning}>
            ⚠️ {error}
          </div>
        )}

        <p style={styles.description}>
          View the live AggBrickScaling workflow for this brick:
        </p>

        {/* UNS Link */}
        <a
          href={data?.workflowUrl ?? buildUNSUrl(deviceName)}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.linkButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(4px)';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 153, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          🔗 View Workflow in UNS
        </a>
        <p style={styles.headsUp}>
          ⏳ Heads up — UNS search can take up to 120 seconds to load.
        </p>

        {/* RDPM Link */}
        {rdpmUrl && (
          <>
            <a
              href={rdpmUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.linkButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 153, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              🔗 View in RDPM
            </a>
            <p style={styles.headsUp}>
              ⏳ Heads up — RDPM can take up to 120 seconds to load.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Helper functions ─────────────────────────────────────

function buildUNSUrl(deviceName: string): string {
  const deviceLower = deviceName.toLowerCase();
  const shortname = encodeURIComponent(
    `=[${deviceLower}][onefabric_12_8t_16w_agg_brick]`
  );
  return (
    `https://uns.networking.aws.dev/#/workflows` +
    `?workflow=AggBrickScalingWorkflow` +
    `&operation=and` +
    `&dryRun=%3Dfalse` +
    `&status=%21%3DTERMINATED` +
    `&shortname=${shortname}`
  );
}

function buildRDPMUrl(deviceName: string): string | null {
  const match = deviceName.match(/^([a-z]+\d+)-(\d+)-/i);
  if (!match) return null;
  const regionPrefix = match[1].replace(/\d+/g, '').toUpperCase();
  const site = `${regionPrefix}${match[2]}`;
  return `https://rdpm.amazon.com/euclid20_bricks?cluster=${regionPrefix}&site=${site}&room=&commit=Search`;
}

// ── Styles ───────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: 'linear-gradient(135deg, #1a2332, #2a3a4a)',
    border: '2px solid #333',
    borderRadius: '8px',
    padding: '16px',
    width: '100%',
    maxWidth: '400px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid #333',
    paddingBottom: '12px',
  },
  title: {
    color: '#ff9900',
    fontSize: '14px',
    fontWeight: 600,
    margin: 0,
    fontFamily: 'monospace',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  description: {
    color: '#aaa',
    fontSize: '12px',
    margin: 0,
  },
  linkButton: {
    display: 'block',
    padding: '10px 14px',
    background: '#1a1a1a',
    border: '2px solid #333',
    borderRadius: '8px',
    color: '#ff9900',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  headsUp: {
    color: '#888',
    fontSize: '11px',
    margin: '-4px 0 0 0',
    fontStyle: 'italic',
  },
  warning: {
    color: '#ff9900',
    fontSize: '12px',
    padding: '8px 12px',
    background: 'rgba(255, 153, 0, 0.1)',
    border: '1px solid rgba(255, 153, 0, 0.3)',
    borderRadius: '6px',
  },
};
