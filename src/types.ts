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
