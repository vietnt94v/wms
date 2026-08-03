export { Appointment } from './appointment.entity';
export { AsnLine } from './asn-line.entity';
export { AsnPallet } from './asn-pallet.entity';
export { Asn } from './asn.entity';
export { Discrepancy } from './discrepancy.entity';
export { DockAssignment } from './dock-assignment.entity';
export { Dock } from './dock.entity';
export { Inventory } from './inventory.entity';
export { PalletItem } from './pallet-item.entity';
export { Product } from './product.entity';
export { PutawayTask } from './putaway-task.entity';
export { QcResult } from './qc-result.entity';
export { ReceivingSession } from './receiving-session.entity';
export { ScanEvent } from './scan-event.entity';
export { SessionContainer } from './session-container.entity';
export { SessionReceivedLine } from './session-received-line.entity';
export { SessionSscc } from './session-sscc.entity';
export { Supplier } from './supplier.entity';

import { Appointment } from './appointment.entity';
import { AsnLine } from './asn-line.entity';
import { AsnPallet } from './asn-pallet.entity';
import { Asn } from './asn.entity';
import { Discrepancy } from './discrepancy.entity';
import { DockAssignment } from './dock-assignment.entity';
import { Dock } from './dock.entity';
import { Inventory } from './inventory.entity';
import { PalletItem } from './pallet-item.entity';
import { Product } from './product.entity';
import { PutawayTask } from './putaway-task.entity';
import { QcResult } from './qc-result.entity';
import { ReceivingSession } from './receiving-session.entity';
import { ScanEvent } from './scan-event.entity';
import { SessionContainer } from './session-container.entity';
import { SessionReceivedLine } from './session-received-line.entity';
import { SessionSscc } from './session-sscc.entity';
import { Supplier } from './supplier.entity';

export const RECEIVING_ENTITIES = [
  Supplier,
  Product,
  Asn,
  AsnLine,
  AsnPallet,
  PalletItem,
  Dock,
  DockAssignment,
  Appointment,
  ReceivingSession,
  SessionReceivedLine,
  ScanEvent,
  SessionSscc,
  SessionContainer,
  Discrepancy,
  QcResult,
  PutawayTask,
  Inventory,
];
