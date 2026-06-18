export interface User {
  name: string;
  alias: string;
  az: string;
}

export type PortStatus =
  | 'deployed'
  | 'not-deployed'
  | 'seated'
  | 'missing'
  | 'loading'
  | 'error'
  | 'timeout'
  | 'no-table';

export interface PortData {
  port: string;
  status: PortStatus;
  serialNumber: string | null;
  opticType?: string;
  mobilityState?: string | null;
}

export interface SlotData {
  rSlot: string;
  host: string;
  ports: PortData[];
}

export interface InstalledRecord {
  serial: string | null;
  installer: string;
  deployedBy: string;
  deployedAt: string | null;
  deployTeam: string;
  installerTeam: string;
  dataHall: string;
  opticType: string;
  portLabel: string;
  at: string;
}

export interface BridgeMessage {
  type:
    | 'NSM_REQUEST'
    | 'NSM_RESPONSE'
    | 'MOBILITY_REQUEST'
    | 'MOBILITY_RESPONSE'
    | 'BRIDGE_PING'      // ← was missing
    | 'BRIDGE_READY'
    | 'BRIDGE_ERROR'
    | 'UNS_REQUEST'      // ← NEW
    | 'UNS_RESPONSE'     // ← NEW
    | 'UNS_ERROR';       // ← NEW
  requestId: string;
  payload: unknown;
}

export interface NavItem {
  label: string;
  path: string;
}

// ── UNS / Handoff types ───────────────────────────────────
export type UNSWorkflowStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'UNKNOWN';

export interface UNSTimelinePhase {
  name       : string;   // "Preparation", "Physical Build", etc.
  percent    : number;   // 0–100
  status     : 'complete' | 'in-progress' | 'pending' | 'unknown';
}

export interface UNSWorkflowStep {
  name   : string;
  status : string;
  detail : string | null;
}

export interface UNSHandoffData {
  workflowId        : string | null;
  status            : UNSWorkflowStatus;
  projectedHandoff  : string | null;   // ISO date string or human-readable
  lastUpdated       : string | null;
  timeline          : UNSTimelinePhase[];
  steps             : UNSWorkflowStep[];
  unsUrl            : string;          // deep link back to UNS
}

// Add to BridgeMessage union in your existing types:
// type: 'UNS_REQUEST' | 'UNS_RESPONSE' | 'UNS_ERROR'
