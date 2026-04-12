import { aw } from 'vitest/dist/chunks/reporters.WnPwkmgA.js';
import { Cluster, AvailabilityZone, Site, Brick, OpticSlot } from '../types';

const NSM_REGIONS = [
  'ale', 'apa', 'arn', 'bah', 'bjs', 'bom', 'cdg', 'cgk', 'cmh',
  'cpt', 'dub', 'dxb', 'fra', 'gru', 'hkg', 'hyd', 'iad', 'icn',
  'kix', 'lab', 'lhr', 'mel', 'mxp', 'nrt', 'osu', 'pdt', 'pdx',
  'phx', 'sfo', 'sin', 'syd', 'yul', 'zaz', 'zhy', 'zrh'
];

// Fetch Availability Zones for a Cluster (IAD → IAD7, IAD12, etc.)
export const fetchAZsForCluster = async (cluster: Cluster): Promise<AvailabilityZone[]> => {
  // TODO: Replace with real API call or data source
  // For now, return mock data
  const mockData: Record<Cluster, AvailabilityZone[]> = {
    'IAD': [
      { id: 'iad7', name: 'IAD7', cluster: 'IAD', siteCount: 36 },
    ],
  }; 

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockData[cluster] || [];
};

// Fetch Sites for an Availability Zone (IAD7 → 109, 222, 314, etc.)
export const fetchSitesForAZ = async (
  cluster: Cluster,
  azId: string
): Promise<Site[]> => {
  // TODO: Replace with real API call or data source
  // For now, return mock data
  const mockSites: Site[] = [
    { id: '11', name: '11', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '14', name: '14', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '24', name: '24', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '35', name: '35', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '52', name: '52', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '55', name: '55', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '59', name: '59', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '73', name: '73', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '74', name: '74', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '75', name: '75', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '77', name: '77', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '85', name: '85', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '95', name: '95', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '96', name: '96', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '100', name: '100', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '101', name: '101', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '102', name: '102', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '103', name: '103', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '104', name: '104', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '105', name: '105', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '106', name: '106', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '107', name: '107', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '108', name: '108', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '109', name: '109', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '130', name: '130', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '131', name: '131', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '133', name: '133', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '193', name: '193', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '195', name: '195', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '210', name: '210', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '211', name: '211', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '222', name: '222', azId: azId, azName: azId.toUpperCase(), brickCount: 49 },
    { id: '223', name: '223', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '234', name: '234', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '314', name: '314', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '322', name: '322', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '370', name: '370', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
    { id: '607', name: '607', azId: azId, azName: azId.toUpperCase(), brickCount: 0 },
  ];

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockSites;
};

// Fetch Bricks for a Site (222 → B24, B29, B30, etc.)
export const fetchBricksForSite = async (
  // TODO: RDPM Euclid Brick Position Managerment - [Site] -> [Hostname]
  cluster: Cluster,
  azId: string,
  siteId: string,
  
): Promise<Brick[]> => {
  // TODO: Replace with real API call or data source

  try{
    const rdpmUrl = `https://rdpm.amazon.com/euclid20_bricks?utf8=%E2%9C%93&cluster=${azId.toUpperCase()}&site=${siteId}&room=&commit=Search`;

    console.log(`Fetching bricks from RDPM: ${rdpmUrl}`);

    const response = await fetch(rdpmUrl, {
      headers: {
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`RDPM return ${response.status}`);
    }

    const html = await response.text();

    const bricks = parseRDPMBricks(html, azId, siteId);

    console.log(`Found ${bricks.length} bricks for site ${siteId}`);
    return bricks;
  } catch (error) {
    console.error('Error fetching bricks from RDPM:', error);
    // Return empty array on error to avoid breaking the UI
    return [];
  }
};

// Fetch Optic Data for a Brick Device
export const fetchOpticData = async (deviceName: string): Promise<OpticSlot[]> => {
  // TODO: Integrate your TamperMonkey NSM API logic here
  const slots: OpticSlot[] = [];

  for (let rSlot = 1; rSlot <= 16; rSlot++) {
    for (let port = 1; port <= 16; port++) {
      const slotId = `r${rSlot}-${port}`;

      try {
        // TODO: Replace with actual NSM API call
        const serialNumber = await fetchSerialNumber(deviceName, `r${rSlot}`, port);
        const status = serialNumber
          ? await checkDeploymentStatus(serialNumber)
          : 'no-optic';

        slots.push({
          slotId,
          rSlot: `r${rSlot}`,
          portNumber: port,
          serialNumber,
          status,
        });
      } catch (error) {
        slots.push({
          slotId,
          rSlot: `r${rSlot}`,
          portNumber: port,
          status: 'unknown',
        });
      }
    }
  }

  return slots;
};

// Fetch Serial Number from NSM API
const fetchSerialNumber = async (
  deviceName: string,
  rSlot: string,
  port: number
): Promise<string | undefined> => {
  // TODO: Implement your TamperMonkey NSM API logic
  // Extract region from device name (e.g., "[MAC_ADDRESS]" → "iad")
  const region = deviceName.match(/^[a-z]+/i)?.[0] || 'iad';

  // Build NSM URL
  const hostName = `${deviceName}-t1-${rSlot}`;
  const nsmUrl = `https://nsm-${region}.amazon.com/device/${hostName}.ec2.${region}.network`;

  // TODO: Make actual HTTP request and parse HTML response
  // For now, return mock data
  return Math.random() > 0.1 ? `SN${Math.random().toString(36).substring(7).toUpperCase()}` : undefined;
};

// Check Deployment Status via Mobility API
const checkDeploymentStatus = async (
  serialNumber: string
): Promise<'deployed' | 'not-deployed' | 'unknown'> => {
  // TODO: Implement your Mobility Solr API logic
  const mobilityUrl = `https://mobility-search.amazon.com/solr/assets/select/?q=serial_id:${serialNumber}`;

  // TODO: Make actual HTTP request and parse response
  // For now, return mock data
  const states = ['deployed', 'not-deployed', 'unknown'] as const;
  return states[Math.floor(Math.random() * states.length)];
};

function parseRDPMBricks(html: string, azId: string, siteId: string): Brick[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const bricks: Brick[] = [];
  const rows = doc.querySelectorAll('table tbody tr');

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');

    if (cells.length > 10) {
      const hostnameCell = cells;
      const hostnameLink = hostnameCell?.querySelector('a');
      const hostName = hostnameLink?.textContent?.trim() || hostnameCell?.textContent?.trim() || '';

      if (hostName) {
        const match = hostName.match(/^([a-z]+\d+)-(\d+)-([a-z]+)-(e\d+)-(b\d+)$/i);

        if (match) {
          const [, parsedAz, parsedSite, fabric, roleId, brickId] = match;

          if (parsedSite === siteId){
            bricks.push({
              id: brickId,
              name: brickId.toUpperCase(),
              siteId: parsedSite,
              siteName: parsedSite,
              hostName: hostName,
              fabric: fabric as 'es' | 'ws',
              roleId: roleId,
              deployedOptics: 0, // Mock deployed optics
              totalOptics: 256, // Assume all bricks have 16 optic slots
            });
          }
        }
      }
    }
  });
  return bricks;
}
