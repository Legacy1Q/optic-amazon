
// api.ts - Refactored to use standard fetch() with Harmony authentication
import { OpticSlot } from '../types';

// Complete NSM endpoint mapping (35 regions from Brick_Tracker.js)
const nsmEndpoints: Record<string, string> = {
  ale: 'https://nsm-ale-external.aka.corp.amazon.com',
  apa: 'https://nsm-apa-external.cmh.aws-border.com',
  arn: 'https://nsm.arn.aws-border.com',
  bah: 'https://nsm.bah.aws-border.com',
  bjs: 'https://nsm.bjs.aws-border.cn',
  bom: 'https://nsm.bom.aws-border.com',
  cdg: 'https://nsm.cdg.aws-border.com',
  cgk: 'https://nsm-cgk.aka.corp.amazon.com',
  cmh: 'https://nsm.cmh.aws-border.com',
  cpt: 'https://nsm.cpt.aws-border.com',
  dub: 'https://nsm-dub.amazon.com',
  dxb: 'https://nsm-dxb.aka.corp.amazon.com',
  fra: 'https://nsm.fra.aws-border.com',
  gru: 'https://nsm-gru.amazon.com',
  hkg: 'https://nsm.hkg.aws-border.com',
  hyd: 'https://nsm-hyd.aka.corp.amazon.com',
  iad: 'https://nsm-iad.amazon.com',
  icn: 'https://nsm.icn.aws-border.com',
  kix: 'https://nsm.kix.aws-border.com',
  lab: 'https://nsm-lab.amazon.com',
  lhr: 'https://nsm.lhr.aws-border.com',
  mel: 'https://nsm-mel.aka.corp.amazon.com',
  mxp: 'https://nsm.mxp.aws-border.com',
  nrt: 'https://nsm-nrt.amazon.com',
  osu: 'https://nsm.osu.aws-border.com',
  pdt: 'https://nsm.pdt.aws-border.com',
  pdx: 'https://nsm-pdx.amazon.com',
  phx: 'https://nsm-phx.amazon.com',
  sfo: 'https://nsm-sfo.amazon.com',
  sin: 'https://nsm-sin.amazon.com',
  syd: 'https://nsm-syd.amazon.com',
  yul: 'https://nsm.yul.aws-border.com',
  zaz: 'https://nsm-zaz.aka.corp.amazon.com',
  zhy: 'https://nsm.zhy.aws-border.cn',
  zrh: 'https://nsm-zrh.aka.corp.amazon.com',
};

// Helper function to check deployment status via Mobility
async function checkDeploymentStatus(serialNumber: string): Promise<string | null> {
  try {
    const url = `https://mobility-search.amazon.com/solr/assets/select/?q=serial_id:${serialNumber}&wt=json&rows=1&fl=state`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Mobility request failed for ${serialNumber}: ${response.status}`);
      return null;
    }

    const json = await response.json();
    const doc = json.response?.docs?.[0];

    if (!doc) return null;

    // Try multiple possible state fields (from Brick_Tracker.js)
    const state =
      doc.state ||
      doc.lifecycle_state ||
      doc.asset_state ||
      doc.asset_license_state ||
      doc.status ||
      null;

    return state;
  } catch (error) {
    console.error(`Error checking deployment status for ${serialNumber}:`, error);
    return null;
  }
}

// Fetch optic data from NSM with Mobility status checks
export const fetchOpticData = async (deviceName: string): Promise<OpticSlot[]> => {
  try {
    const allSlots: OpticSlot[] = [];

    // Extract region from device name (e.g., "[MAC_ADDRESS]" -> "iad")
    const region = deviceName.match(/^[a-z]+/)?.[0]?.toLowerCase();
    
    if (!region) {
      console.error('Invalid device name format:', deviceName);
      return [];
    }

    const nsmUrl = nsmEndpoints[region];
    if (!nsmUrl) {
      console.error(`Unknown region: ${region}`);
      return [];
    }

    console.log(`Fetching optic data for device: ${deviceName} from ${nsmUrl}`);

    // Fetch all 16 r-slots in parallel
    const promises = Array.from({ length: 16 }, async (_, i) => {
      const rSlot = `r${i + 1}`;
      const hostName = `${deviceName}-t1-${rSlot}`;
      const url = `${nsmUrl}/device/${hostName}.ec2.${region}.network`;

      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          console.warn(`NSM request failed for ${hostName}: ${response.status}`);
          // Return all 16 ports as 'no-optic' status
          return Array.from({ length: 16 }, (_, j) => ({
            slotId: `${rSlot}-${j + 1}`,
            rSlot: rSlot,
            portNumber: j + 1,
            status: 'no-optic' as const,
            serialNumber: undefined,
            assetState: undefined,
          }));
        }

        const html = await response.text();

        // Parse HTML (remove scripts and images for safety)
        const cleanHtml = html
          .replace(/<script(?:.|\r)+?<\/script>/gi, '')
          .replace(/<img[^>]+>/gi, '');

        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanHtml, 'text/html');
        const table = doc.getElementById('hardwareTable');

        if (!table) {
          console.warn(`No hardwareTable found for ${hostName}`);
          return Array.from({ length: 16 }, (_, j) => ({
            slotId: `${rSlot}-${j + 1}`,
            rSlot: rSlot,
            portNumber: j + 1,
            status: 'no-optic' as const,
            serialNumber: undefined,
            assetState: undefined,
          }));
        }

        // Find column indices
        const headerCells = Array.from(table.rows[0].cells).map(
          (c) => (c.textContent ?? '').trim()
        );

        const portIndex = headerCells.findIndex((h) => h === 'Port Name');
        const serialIndex = headerCells.findIndex((h) => h === 'Serial Number');
        const pollIndex = headerCells.findIndex((h) => h === 'Polling Status');

        if (portIndex === -1 || serialIndex === -1 || pollIndex === -1) {
          console.warn(`Missing required columns in ${hostName}`);
          return Array.from({ length: 16 }, (_, j) => ({
            slotId: `${rSlot}-${j + 1}`,
            rSlot: rSlot,
            portNumber: j + 1,
            status: 'no-optic' as const,
            serialNumber: undefined,
            assetState: undefined,
          }));
        }

        const tbody = table.querySelector('tbody');
        if (!tbody) {
          return Array.from({ length: 16 }, (_, j) => ({
            slotId: `${rSlot}-${j + 1}`,
            rSlot: rSlot,
            portNumber: j + 1,
            status: 'no-optic' as const,
            serialNumber: undefined,
            assetState: undefined,
          }));
        }

        // Build port map: jrp1-jrp16 -> serial number
        const portMap: Record<number, string> = {};
        for (const row of Array.from(tbody.rows)) {
          const portCell = (row.cells[portIndex]?.textContent ?? '').trim();
          const pollCell = (row.cells[pollIndex]?.textContent ?? '').trim().toLowerCase();
          const jrpMatch = portCell.match(/^jrp(\d+)$/);

          if (jrpMatch && pollCell === 'up') {
            const portNum = parseInt(jrpMatch[1], 10);
            portMap[portNum] = (row.cells[serialIndex]?.textContent ?? '').trim();
          }
        }

        // Create slots array for all 16 ports
        const slots = Array.from({ length: 16 }, (_, j) => {
          const portNum = j + 1;
          const serial = portMap[portNum];

          return {
            slotId: `${rSlot}-${portNum}`,
            rSlot: rSlot,
            portNumber: portNum,
            status: 'no-optic' as const,
            serialNumber: serial || undefined,
            assetState: undefined,
          };
        });

        // Check deployment status for each slot with a serial number
        for (const slot of slots) {
          if (slot.serialNumber) {
            const state = await checkDeploymentStatus(slot.serialNumber);
            const normalizedState = (state || '').toString().trim().toUpperCase();

            slot.status = normalizedState === 'DEPLOYED' ? 'deployed' : 'not-deployed';
            slot.assetState = state || undefined;
          }
        }

        return slots;
      } catch (error) {
        console.error(`Error fetching ${hostName}:`, error);
        return Array.from({ length: 16 }, (_, j) => ({
          slotId: `${rSlot}-${j + 1}`,
          rSlot: rSlot,
          portNumber: j + 1,
          status: 'no-optic' as const,
          serialNumber: undefined,
          assetState: undefined,
        }));
      }
    });

    const results = await Promise.all(promises);
    results.forEach(slots => allSlots.push(...slots));

    console.log(`Fetched ${allSlots.length} total optic slots for ${deviceName}`);
    return allSlots;
  } catch (error) {
    console.error('Error fetching optic data:', error);
    return [];
  }
};

