
import React from 'react';
import { OpticSlot as OpticSlotType } from '../types';
import OpticSlot from './OpticSlot';
import '../styles/OpticGrid.css';

interface Props {
  slots: OpticSlotType[];
  deviceName: string;
}

const OpticGrid: React.FC<Props> = ({ slots, deviceName }) => {
  // Group slots by r-slot (r1-r16)
  const groupedSlots: Record<string, OpticSlotType[]> = {};

  slots.forEach(slot => {
    if (!groupedSlots[slot.rSlot]) {
      groupedSlots[slot.rSlot] = [];
    }
    groupedSlots[slot.rSlot].push(slot);
  });

  // Port order: odd ports first (1,3,5,7,9,11,13,15), then even ports (2,4,6,8,10,12,14,16)
  const portOrder = [1, 3, 5, 7, 9, 11, 13, 15, 2, 4, 6, 8, 10, 12, 14, 16];

  // Generate all r-slot names (r1-r16)
  const rSlots = Array.from({ length: 16 }, (_, i) => `r${i + 1}`);

  // Split into odd (r1,r3,r5...) and even (r2,r4,r6...)
  const oddRSlots = rSlots.filter((_, i) => i % 2 === 0);  // r1, r3, r5, ..., r15
  const evenRSlots = rSlots.filter((_, i) => i % 2 !== 0); // r2, r4, r6, ..., r16

  const renderRSlotBoard = (rSlot: string) => {
    const allPorts = groupedSlots[rSlot] || [];

    // Create full host name label (matches your TamperMonkey script)
    const hostLabel = `${deviceName}-t1-${rSlot}`;

    // Reorder ports according to portOrder
    const orderedPorts = portOrder.map(portNum => {
      let port = allPorts.find(slot => slot.portNumber === portNum);

      // If port doesn't exist, create a placeholder
      if (!port) {
        port = {
          slotId: `${rSlot}-${portNum}`,
          rSlot: rSlot,
          portNumber: portNum,
          status: 'no-optic',
        };
      }

      return port;
    });

    return (
      <div key={rSlot} className="optic-board-section">
        <div className="optic-board-label">{hostLabel}</div>
        <div className="optic-board">
          {orderedPorts.map(slot => (
            <OpticSlot
              key={slot.slotId}
              slot={slot}
              deviceName={deviceName}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="optic-grid">
      {/* Left Column - Odd r-slots (r1, r3, r5, ..., r15) */}
      <div className="optic-grid-column">
        <div className="optic-column-header">Odd</div>
        {oddRSlots.map(rSlot => renderRSlotBoard(rSlot))}
      </div>

      {/* Right Column - Even r-slots (r2, r4, r6, ..., r16) */}
      <div className="optic-grid-column">
        <div className="optic-column-header">Even</div>
        {evenRSlots.map(rSlot => renderRSlotBoard(rSlot))}
      </div>
    </div>
  );
};

export default OpticGrid;

