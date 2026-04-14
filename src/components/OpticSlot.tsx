import React, { useState, useEffect } from 'react';
import { OpticSlot as OpticSlotType } from '../types';
import '../styles/OpticSlot.css';

interface Props {
  slot: OpticSlotType;
  deviceName: string;
}

const OpticSlot: React.FC<Props> = ({ slot, deviceName }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isManuallyInstalled, setIsManuallyInstalled] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const savedOptics = loadSavedOptics();
    const installed = savedOptics?.[deviceName]?.[slot.rSlot]?.includes(slot.portNumber);
    setIsManuallyInstalled(installed || false);
  }, [deviceName, slot.rSlot, slot.portNumber]);

  // Determine CSS class based on status
  const getPortClass = () => {
    const classes = ['optic-port'];

    if (slot.status === 'deployed') {
      classes.push('has-optic');
    } else if (slot.status === 'not-deployed') {
      classes.push('has-optic-not-deployed');
    } else if (isManuallyInstalled) {
      classes.push('has-optic-seated');
    } else if (slot.status === 'no-optic') {
      classes.push('no-optic');
    } else {
      classes.push('loading');
    }

    return classes.join(' ');
  };

  // Get tooltip text
  const getTooltipText = () => {
    if (slot.serialNumber) {
      return `${slot.serialNumber} (${slot.assetState || 'UNKNOWN'})`;
    }
    if (isManuallyInstalled) {
      return 'Installed (pending NSM update)';
    }
    if (slot.status === 'no-optic') {
      return 'Missing Optic';
    }
    return 'Loading...';
  };

  // Handle left click
  const handleClick = () => {
    // If has serial number (blue or red), open Mobility
    if (slot.serialNumber) {
      window.open(
        `https://mobility.amazon.com/part/search?search_string=${slot.serialNumber}&query=GO&search_type=all`,
        '_blank'
      );
    }
    // If no optic, allow manual marking as installed
    else if (slot.status === 'no-optic' && !isManuallyInstalled) {
      markPortInstalled(deviceName, slot.rSlot, slot.portNumber);
      setIsManuallyInstalled(true);
    }
  };

  // Handle right click (remove manual installation)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isManuallyInstalled) {
      removeInstalledPort(deviceName, slot.rSlot, slot.portNumber);
      setIsManuallyInstalled(false);
    }
  };

  return (
    <div
      className={getPortClass()}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="port-number">{slot.portNumber}</span>

      {showTooltip && (
        <div className="optic-tooltip">
          {getTooltipText()}
        </div>
      )}
    </div>
  );
};

// LocalStorage functions (matching your TamperMonkey script)
function loadSavedOptics() {
  const data = localStorage.getItem('brickTrackerInstalled');
  return data ? JSON.parse(data) : {};
}

function saveSavedOptics(data: any) {
  localStorage.setItem('brickTrackerInstalled', JSON.stringify(data));
}

function markPortInstalled(device: string, rSlot: string, port: number) {
  const data = loadSavedOptics();

  if (!data[device]) data[device] = {};
  if (!data[device][rSlot]) data[device][rSlot] = [];

  if (!data[device][rSlot].includes(port)) {
    data[device][rSlot].push(port);
  }

  saveSavedOptics(data);
}

function removeInstalledPort(device: string, rSlot: string, port: number) {
  const data = loadSavedOptics();

  if (data?.[device]?.[rSlot]) {
    data[device][rSlot] = data[device][rSlot].filter((p: number) => p !== port);

    if (data[device][rSlot].length === 0) delete data[device][rSlot];
    if (Object.keys(data[device]).length === 0) delete data[device];
  }

  saveSavedOptics(data);
}

export default OpticSlot;