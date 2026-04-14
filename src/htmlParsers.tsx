
// htmlParsers.ts - Frontend HTML parsing logic (moved from backend)
import { Brick, OpticSlot } from './types';

/**
 * Parse brick data from RDPM HTML response
 * Extracts brick hostnames matching pattern: (az)-(site)-(fabric)-(role)-(brick)
 * Example: [MAC_ADDRESS]
 */
export function parseRDPMBricks(html: string, azId: string, siteId: string): Brick[] {
  const bricks: Brick[] = [];

  // Regex pattern: (az)-(site)-(fabric)-(role)-(brick)
  // Group 1: az (iad7)
  // Group 2: site (222)
  // Group 3: fabric (es)
  // Group 4: role (e1)
  // Group 5: brick (b24)
  const numericSiteId = siteId.replace(/[A-Z]+/g, ''); // Extract numeric part of site ID for matching

  const hostnamePattern = /([a-z]+\d+)-(\d+)-([a-z]+)-(e\d+)-(b\d+)/gi;
  
  let match;
  const seen = new Set<string>();

  while ((match = hostnamePattern.exec(html)) !== null) {
    // Check if site matches (Group 2)
    if (match[2] === numericSiteId) {
      const hostname = match[0];
      
      // Avoid duplicates
      if (!seen.has(hostname)) {
        seen.add(hostname);
        
        bricks.push({
          cluster: match,           // Assuming cluster is IAD for this pattern  
          id: match[5],              // b24
          name: match[5].toUpperCase(),  // B24
          siteId: siteId,
          siteName: numericSiteId,        // IAD222
          hostName: hostname,        // [MAC_ADDRESS]
          fabric: match[3] as 'es' | 'ws',  // es
          roleId: match[4],          // e1
        });
      }
    }
  }
  console.log(`Found ${bricks.length} unique bricks for site ${numericSiteId}`);
  return bricks;
}

/**
 * Parse optic port data from NSM HTML response
 * Extracts serial numbers from the hardware table
 */
export function parseNSMPorts(html: string, rSlot: string): OpticSlot[] {
  const slots: OpticSlot[] = [];

  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Find the hardware table
  const hardwareTable = doc.querySelector('#hardwareTable');

  if (!hardwareTable) {
    console.warn(`No hardware table found for ${rSlot}`);
    return createEmptySlots(rSlot);
  }

  // Parse each port (1-16)
  for (let port = 1; port <= 16; port++) {
    const portId = `jrp${port}`;
    
    // Find the row containing this port
    const row = Array.from(hardwareTable.querySelectorAll('tr')).find(tr => {
      const cells = tr.querySelectorAll('td');
      return cells.length > 0 && cells[0].textContent?.includes(portId);
    });

    let serialNumber: string | undefined;
    let status: 'deployed' | 'not-deployed' | 'unknown' | 'missing-optic' = 'missing-optic';

    if (row) {
      const cells = row.querySelectorAll('td');
      
      // Serial number is typically in the second cell (index 1)
      if (cells.length > 1) {
        const serialText = cells[1].textContent?.trim();
        
        if (serialText && serialText.length > 0 && serialText !== '-') {
          serialNumber = serialText;
          status = 'unknown'; // Will be updated by Mobility check
        }
      }
    }

    slots.push({
      slotId: `${rSlot}-${port}`,
      rSlot: rSlot,
      portNumber: port,
      serialNumber: serialNumber,
      status: status,
      lastPolled: new Date(),
    });
  }

  return slots;
}

/**
 * Create empty slots when NSM data is unavailable
 */
function createEmptySlots(rSlot: string): OpticSlot[] {
  const slots: OpticSlot[] = [];
  
  for (let port = 1; port <= 16; port++) {
    slots.push({
      slotId: `${rSlot}-${port}`,
      rSlot: rSlot,
      portNumber: port,
      status: 'missing-optic',
      lastPolled: new Date(),
    });
  }
  
  return slots;
}

/**
 * Parse deployment status from Mobility Solr JSON response
 */
export function parseMobilityStatus(json: any): string | null {
  try {
    const docs = json?.response?.docs;
    
    if (!docs || !Array.isArray(docs) || docs.length === 0) {
      return null;
    }

    // Get the state from the first document
    const state = docs[0]?.state;
    
    return state || null;
  } catch (error) {
    console.error('Error parsing Mobility status:', error);
    return null;
  }
}

