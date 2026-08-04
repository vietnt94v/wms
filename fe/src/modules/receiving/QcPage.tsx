import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Heading,
  HStack,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { FormInput } from '@/components/ui/form-input'
import { FormSelect } from '@/components/ui/form-select'
import { FormTextarea } from '@/components/ui/form-textarea'
import { toaster } from '@/components/ui/toaster'
import { QueryLoading } from '@/components/ui/query-loading'
import {
  getQcResultForSku,
  pendingQcSkus,
  receivedSkus,
} from '@/lib/domain/receiving'
import {
  useQcResults,
  useSessions,
  useSubmitQcMutation,
} from '@/lib/query/receiving'
import { BackToMenuButton } from './BackToMenuButton'
import { StatusBadge } from './StatusBadge'

export function QcPage() {
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions()
  const { data: qcResults = [], isLoading: qcLoading } = useQcResults()
  const { mutateAsync: submitQc } = useSubmitQcMutation()

  const qcSessions = sessions.filter((s) =>
    ['QC', 'DISCREPANCY', 'PUTAWAY'].includes(s.status),
  )
  const [sessionId, setSessionId] = useState(qcSessions[0]?.id ?? '')
  const session = sessions.find((s) => s.id === sessionId)

  const skus = useMemo(() => {
    if (!session) return []
    return receivedSkus(session)
  }, [session])

  const pendingSkus = useMemo(() => {
    if (!session) return []
    return pendingQcSkus(session, qcResults)
  }, [session, qcResults])

  const [sku, setSku] = useState('')
  const [sampleQty, setSampleQty] = useState('1')
  const [reason, setReason] = useState('')

  if (sessionsLoading || qcLoading) {
    return <QueryLoading />
  }

  const activeSku = sku || pendingSkus[0] || skus[0] || ''
  const existingQc =
    session && activeSku
      ? getQcResultForSku(qcResults, session.id, activeSku)
      : undefined
  const skuAlreadyQc = !!existingQc

  const handleQc = async (pass: boolean) => {
    if (!sessionId || !activeSku) return
    const result = await submitQc({
      sessionId,
      sku: activeSku,
      sampleQty: Number(sampleQty) || 1,
      pass,
      reason: pass ? undefined : reason || 'QC failed',
    })
    if (!result.ok) {
      toaster.create({
        title: 'Cannot record QC',
        description: result.message,
        type: 'error',
      })
      return
    }
    toaster.create({
      title: pass ? 'QC passed' : 'QC failed → Quarantine',
      description: result.message,
      type: pass ? 'success' : 'error',
    })
    setSku('')
    setReason('')
  }

  return (
    <Stack gap="4">
      <BackToMenuButton />
      <Heading size="xl">Quality Check</Heading>
      <Text color="fg.muted">
        One QC result per SKU per session. Fail → quarantine stock (not
        available), auto QC_FAIL discrepancy.
      </Text>

      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Stack gap="3" maxW="560px">
          <FormSelect
            label="Session"
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
          </FormSelect>
          <FormSelect
            label="SKU"
            value={activeSku}
            onChange={(e) => setSku(e.target.value)}
          >
            {skus.map((s) => {
              const done = getQcResultForSku(qcResults, sessionId, s)
              return (
                <option key={s} value={s}>
                  {s}
                  {done ? (done.pass ? ' — QC passed' : ' — QC failed') : ' — pending'}
                </option>
              )
            })}
          </FormSelect>
          <FormInput
            label="Sample qty"
            type="number"
            value={sampleQty}
            onChange={(e) => setSampleQty(e.target.value)}
            placeholder="Sample qty"
            disabled={skuAlreadyQc}
          />
          <FormTextarea
            label="Fail reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Fail reason"
            disabled={skuAlreadyQc}
          />
          {skuAlreadyQc && existingQc && (
            <Text fontSize="sm" color="fg.muted">
              QC already recorded for {activeSku} (
              {existingQc.pass ? 'passed' : 'failed'}). Select another pending
              SKU.
            </Text>
          )}
          {session && pendingSkus.length > 0 && !skuAlreadyQc && (
            <Text fontSize="sm" color="fg.muted">
              {pendingSkus.length} SKU(s) pending QC
            </Text>
          )}
          <HStack>
            <Button
              colorPalette="green"
              disabled={!activeSku || skuAlreadyQc}
              onClick={() => handleQc(true)}
            >
              Pass
            </Button>
            <Button
              colorPalette="red"
              disabled={!activeSku || skuAlreadyQc}
              onClick={() => handleQc(false)}
            >
              Fail → Quarantine
            </Button>
          </HStack>
          {session && pendingSkus.length === 0 && skus.length > 0 && (
            <Text fontSize="sm" color="fg.muted">
              QC complete. Putaway tasks are created automatically when ready —
              continue in Putaway.
            </Text>
          )}
        </Stack>
      </Box>

      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Heading size="md" mb="3">
          QC history
        </Heading>
        <Table.Root size="sm" interactive>
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
