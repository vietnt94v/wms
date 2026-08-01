import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Table,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { toaster } from '@/components/ui/toaster'
import { useReceivingStore } from '@/store/receivingStore'
import { ReceivingNav } from './ReceivingNav'
import { StatusBadge } from './StatusBadge'

export function QcPage() {
  const sessions = useReceivingStore((s) => s.sessions)
  const qcResults = useReceivingStore((s) => s.qcResults)
  const submitQc = useReceivingStore((s) => s.submitQc)
  const generatePutawayTasks = useReceivingStore((s) => s.generatePutawayTasks)

  const qcSessions = sessions.filter((s) =>
    ['QC', 'DISCREPANCY', 'PUTAWAY'].includes(s.status),
  )
  const [sessionId, setSessionId] = useState(qcSessions[0]?.id ?? '')
  const session = sessions.find((s) => s.id === sessionId)

  const skus = useMemo(() => {
    if (!session) return []
    return [...new Set(session.receivedLines.map((l) => l.sku))]
  }, [session])

  const [sku, setSku] = useState('')
  const [sampleQty, setSampleQty] = useState('1')
  const [reason, setReason] = useState('')

  const activeSku = sku || skus[0] || ''

  const handleQc = (pass: boolean) => {
    if (!sessionId || !activeSku) return
    submitQc({
      sessionId,
      sku: activeSku,
      sampleQty: Number(sampleQty) || 1,
      pass,
      reason: pass ? undefined : reason || 'QC failed',
    })
    toaster.create({
      title: pass ? 'QC passed' : 'QC failed → Quarantine',
      description: pass
        ? `${activeSku} accepted`
        : `${activeSku} moved to quarantine / discrepancy`,
      type: pass ? 'success' : 'error',
    })
  }

  return (
    <Stack gap="4">
      <Heading size="xl">Quality Check</Heading>
      <Text color="fg.muted">
        Fail → quarantine stock (not available), auto QC_FAIL discrepancy.
      </Text>
      <ReceivingNav />

      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Stack gap="3" maxW="560px">
          <NativeSelect.Root>
            <NativeSelect.Field
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value)
                setSku('')
              }}
            >
              {qcSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.asnId} ({s.status})
                </option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={activeSku}
              onChange={(e) => setSku(e.target.value)}
            >
              {skus.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </NativeSelect.Field>
          </NativeSelect.Root>
          <Input
            type="number"
            value={sampleQty}
            onChange={(e) => setSampleQty(e.target.value)}
            placeholder="Sample qty"
          />
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Fail reason"
          />
          <HStack>
            <Button colorPalette="green" onClick={() => handleQc(true)}>
              Pass
            </Button>
            <Button colorPalette="red" onClick={() => handleQc(false)}>
              Fail → Quarantine
            </Button>
            {session && (
              <Button
                variant="outline"
                onClick={() => {
                  generatePutawayTasks(session.id)
                  toaster.create({
                    title: 'Putaway tasks generated',
                    type: 'success',
                  })
                }}
              >
                Generate putaway tasks
              </Button>
            )}
          </HStack>
        </Stack>
      </Box>

      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Heading size="md" mb="3">
          QC history
        </Heading>
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Session</Table.ColumnHeader>
              <Table.ColumnHeader>SKU</Table.ColumnHeader>
              <Table.ColumnHeader>Sample</Table.ColumnHeader>
              <Table.ColumnHeader>Result</Table.ColumnHeader>
              <Table.ColumnHeader>Reason</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {qcResults.map((q) => (
              <Table.Row key={q.id}>
                <Table.Cell>{q.sessionId}</Table.Cell>
                <Table.Cell>{q.sku}</Table.Cell>
                <Table.Cell>{q.sampleQty}</Table.Cell>
                <Table.Cell>
                  <StatusBadge status={q.pass ? 'COMPLETED' : 'REJECTED'} />
                </Table.Cell>
                <Table.Cell>{q.reason ?? '-'}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Stack>
  )
}
