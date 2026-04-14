export type Cluster = 'IAD';

export interface AvailabilityZone {
  id: string;
  name: string;        // e.g., '[MAC_ADDRESS]', 'IAD12', 'CMH3'
  cluster: Cluster;    // Parent cluster: 'IAD'
  siteCount?: number;
}

export interface Site {
  cluster: Cluster;    // Parent cluster: 'IAD'
  id: string;
  name: string;        // e.g., '109', '222', '314'
  azId: string;
  azName: string;      // Parent AZ: '[MAC_ADDRESS]', 'IAD12', etc.
}

export interface Brick {
  cluster: Cluster;    // Parent cluster: 'IAD'
  id: string;
  name: string;        // e.g., 'B24', 'B29'
  siteId: string;
  siteName: string;    // Parent site: '222'
  hostName: string;  // Full: iad7-222-es-e1-b24
  fabric: 'es' | 'ws';
  roleId: string;
  deployedOptics?: number;
  totalOptics?: number;
}
// Optic slot data for the optic board
export interface OpticSlot {
  slotId: string;           // e.g., 'r1-1', 'r1-2', etc.
  rSlot: string;            // Row slot: 'r1', 'r2', ... 'r16'
  portNumber: number;       // Port number: 1-16
  serialNumber?: string;    // Optic serial number (if present)
  status: 'deployed' | 'not-deployed' | 'unknown' | 'missing-optic';
  assetState?: string;      // Deployment state from Mobility API
  lastPolled?: Date;        // Last time NSM was polled
}


export interface NavigationState {
  selectedCluster: Cluster | null;  // IAD, CMH, PDX
  selectedAZ: string | null;        // [MAC_ADDRESS], CMH3, etc.
  selectedSite: string | null;      // 222, 109, etc.
  selectedBrick: string | null;     // B24, B29, etc.
}
