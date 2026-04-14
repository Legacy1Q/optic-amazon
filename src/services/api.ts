
// api.ts - Refactored to use standard fetch() with Harmony authentication
import { Cluster, AvailabilityZone, Site, Brick, OpticSlot } from '../types';
import { parseRDPMBricks, parseNSMPorts, parseMobilityStatus } from '../htmlParsers';

// Mock data for static endpoints
export const fetchAZsForCluster = async (cluster: Cluster): Promise<AvailabilityZone[]> => {
  const mockAZs: AvailabilityZone[] = [
    { id: 'IAD7', name: 'IAD7', cluster: 'IAD'},
  ];
  return mockAZs.filter(az => az.cluster === cluster);
};

export const fetchSitesForAZ = async (
  cluster: Cluster,
  azId: string
): Promise<Site[]> => {
  const mockSites: Site[] = [
    { cluster: 'IAD', id: 'IAD222', name: '222', azId: 'IAD7', azName: 'IAD7'},
  ];
  return mockSites.filter(site => site.azId === azId);
};

// Fetch bricks from RDPM with corrected cluster parameter
export const fetchBricksForSite = async (
  cluster: Cluster,
  azId: string,
  siteId: string
): Promise<Brick[]> => {
  if (siteId === 'IAD222') {
    return [
      { cluster: 'IAD', id: 'b24', name: 'B24', siteId: 'IAD222', siteName: '222', hostName: 'iad7-222-es-e1-b24', fabric: 'es', roleId: 'e1' },
    ];
  }
  return [];
};

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

    // NSM endpoint mapping
    const nsmEndpoints: Record<string, string> = {
      iad: 'https://nsm-iad.amazon.com',
      cmh: 'https://nsm.cmh.aws-border.com',
      pdx: 'https://nsm-pdx.amazon.com',
      dub: 'https://nsm-dub.amazon.com',
      fra: 'https://nsm-fra.amazon.com',
      nrt: 'https://nsm-nrt.amazon.com',
      sin: 'https://nsm-sin.amazon.com',
      syd: 'https://nsm-syd.amazon.com',
      gru: 'https://nsm-gru.amazon.com',
      icn: 'https://nsm-icn.amazon.com',
    };

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
          return [];
        }

        const html = await response.text();
        const slots = parseNSMPorts(html, rSlot);

        // Check deployment status for each slot with a serial number
        for (const slot of slots) {
          if (slot.serialNumber) {
            const status = await checkDeploymentStatus(slot.serialNumber);
            slot.status = status === 'DEPLOYED' ? 'deployed' : 'not-deployed';
            slot.assetState = status || undefined;
          }
        }

        return slots;
      } catch (error) {
        console.error(`Error fetching ${hostName}:`, error);
        return [];
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
    return parseMobilityStatus(json);
  } catch (error) {
    console.error(`Error checking deployment status for ${serialNumber}:`, error);
    return null;
  }
}