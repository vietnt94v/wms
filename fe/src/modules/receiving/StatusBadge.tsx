import { Badge } from '@chakra-ui/react'

const paletteMap: Record<string, string> = {
  EXPECTED: 'gray',
  SCHEDULED: 'blue',
  GATE_IN: 'cyan',
  UNLOADING: 'teal',
  RECEIVING: 'purple',
  QC: 'orange',
  DISCREPANCY: 'red',
  PUTAWAY: 'yellow',
  COMPLETED: 'green',
  REJECTED: 'red',
  AVAILABLE: 'green',
  OCCUPIED: 'orange',
  BLOCKED: 'red',
  PENDING: 'orange',
  CONFIRMED: 'green',
  BOOKED: 'blue',
  ARRIVED: 'cyan',
  OPEN: 'green',
  CLOSED: 'gray',
  ACCEPT_VARIANCE: 'green',
  REJECT: 'red',
  PARTIAL_ACCEPT: 'yellow',
  QUARANTINE: 'red',
  CLAIM_SUPPLIER: 'purple',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge colorPalette={paletteMap[status] ?? 'gray'} variant="subtle">
      {status}
    </Badge>
  )
}
