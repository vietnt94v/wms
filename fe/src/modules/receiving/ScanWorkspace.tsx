import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  Progress,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { toaster } from '@/components/ui/toaster'
import type { ASN, ReceivingSession } from '@/lib/domain/receiving'
import { useReceivingStore } from '@/store/receivingStore'

interface Props {
  session: ReceivingSession
  asn: ASN
}

export function ScanWorkspace({ session, asn }: Props) {
  const products = useReceivingStore((s) => s.products)
  const scan = useReceivingStore((s) => s.scan)
  const [code, setCode] = useState('')
  const [lot, setLot] = useState('')
  const [expiry, setExpiry] = useState('')
  const [allowOver, setAllowOver] = useState(false)

  const progress = useMemo(() => {
    const expected = asn.lines.reduce((s, l) => s + l.expectedQty, 0)
    const received = asn.lines.reduce((s, l) => s + l.receivedQty, 0)
    return expected === 0 ? 0 : Math.min(100, Math.round((received / expected) * 100))
  }, [asn.lines])

  const exceptions = session.scanEvents.filter((e) => e.result !== 'OK')

  const onScan = () => {
    if (!code.trim()) return
    const event = scan({
      sessionId: session.id,
      code,
      lot: lot || undefined,
      expiry: expiry || undefined,
      allowOverOverride: allowOver,
    })

    const type =
      event.result === 'OK'
        ? 'success'
        : event.result === 'WARN'
          ? 'warning'
          : 'error'

    toaster.create({
      title: event.errorType ?? event.result,
      description: `${event.message}${event.actionHint ? ` — ${event.actionHint}` : ''}`,
      type,
    })
    setCode('')
  }

  return (
    <Stack gap="4">
      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <HStack justify="space-between" mb="3">
          <Heading size="md">
            Scan workspace — {session.mode === 'SSCC' ? 'Full SSCC' : 'Each container'}
          </Heading>
          <Text fontSize="sm">{progress}%</Text>
        </HStack>
        <Progress.Root value={progress} mb="4">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>

        <Stack gap="3">
          <Input
            autoFocus
            placeholder={
              session.mode === 'SSCC'
                ? 'Scan SSCC (e.g. 00012345678901234567)'
                : 'Scan SKU or SKU:QTY[:LOT:EXPIRY]'
            }
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onScan()
            }}
          />
          {session.mode === 'CONTAINER' && (
            <HStack>
              <Input
                placeholder="Lot (if required)"
                value={lot}
                onChange={(e) => setLot(e.target.value)}
              />
              <Input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
              <Button
                variant={allowOver ? 'solid' : 'outline'}
                colorPalette="orange"
                onClick={() => setAllowOver((v) => !v)}
              >
                Supervisor override
              </Button>
            </HStack>
          )}
          <Button colorPalette="blue" onClick={onScan} alignSelf="start">
            Scan
          </Button>
          <Text fontSize="sm" color="fg.muted">
            Lot-required SKUs:{' '}
            {products
              .filter((p) => p.requiresLotExpiry)
              .map((p) => p.sku)
              .join(', ') || 'none'}
          </Text>
        </Stack>
      </Box>

      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Heading size="md" mb="3">
          Expected vs received
        </Heading>
        <Table.Root size="sm" interactive>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>SKU</Table.ColumnHeader>
              <Table.ColumnHeader>Expected</Table.ColumnHeader>
              <Table.ColumnHeader>Received</Table.ColumnHeader>
              <Table.ColumnHeader>Gap</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {asn.lines.map((line) => (
              <Table.Row key={line.sku}>
                <Table.Cell>{line.sku}</Table.Cell>
                <Table.Cell>{line.expectedQty}</Table.Cell>
                <Table.Cell>{line.receivedQty}</Table.Cell>
                <Table.Cell>{line.expectedQty - line.receivedQty}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Heading size="md" mb="3">
          Exceptions
        </Heading>
        {exceptions.length === 0 ? (
          <Text color="fg.muted">No scan exceptions</Text>
        ) : (
          <Table.Root size="sm" interactive>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Code</Table.ColumnHeader>
                <Table.ColumnHeader>Result</Table.ColumnHeader>
                <Table.ColumnHeader>Error</Table.ColumnHeader>
                <Table.ColumnHeader>Message / Action</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {exceptions.map((e) => (
                <Table.Row key={e.id}>
                  <Table.Cell>{e.code}</Table.Cell>
                  <Table.Cell
                    color={e.result === 'BLOCK' ? 'fg.error' : 'fg.warning'}
                  >
                    {e.result}
                  </Table.Cell>
                  <Table.Cell>{e.errorType}</Table.Cell>
                  <Table.Cell>
                    {e.message}
                    {e.actionHint ? ` → ${e.actionHint}` : ''}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Box>
    </Stack>
  )
}
