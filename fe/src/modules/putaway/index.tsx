import { useMemo, useState } from 'react'
import axios from 'axios'
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { BarcodeScanDialog } from '@/components/ui/barcode-scan-dialog'
import { QueryLoading } from '@/components/ui/query-loading'
import { toaster } from '@/components/ui/toaster'
import type { PutawayTask } from '@/lib/domain/putaway'
import {
  useConfirmPutawayMutation,
  usePutawayTasks,
} from '@/lib/query/putaway'

export function PutawayPage() {
  const { data: tasks = [], isLoading } = usePutawayTasks()
  const { mutateAsync: confirmPutaway, isPending } = useConfirmPutawayMutation()

  const [selectedId, setSelectedId] = useState<string>('')
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [lastAssigned, setLastAssigned] = useState<string | null>(null)

  const pendingTasks = useMemo(
    () => tasks.filter((t) => t.status === 'PENDING'),
    [tasks],
  )
  const confirmedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'CONFIRMED'),
    [tasks],
  )

  const selected: PutawayTask | undefined =
    pendingTasks.find((t) => t.id === selectedId) ?? pendingTasks[0]

  const activeId = selected?.id ?? ''

  const selectTask = (task: PutawayTask) => {
    setSelectedId(task.id)
    setScanDialogOpen(true)
    setLastAssigned(null)
  }

  const handleConfirm = async (code: string) => {
    if (!selected) return
    const trimmed = code.trim()
    if (!trimmed) {
      toaster.create({
        title: 'Scan required',
        description: 'Scan the pallet/container code before loading',
        type: 'error',
      })
      return
    }

    try {
      const result = await confirmPutaway({
        taskId: selected.id,
        code: trimmed,
      })
      setLastAssigned(result.assignedLocation ?? null)
      toaster.create({
        title: 'Loaded to conveyor',
        description: result.message ?? `Dispatched to ${result.assignedLocation}`,
        type: 'success',
      })
      setSelectedId('')
      setScanDialogOpen(false)
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string | undefined) ?? err.message
        : 'Confirm failed'
      toaster.create({ title: 'Putaway failed', description: message, type: 'error' })
    }
  }

  if (isLoading) {
    return <QueryLoading />
  }

  return (
    <Stack gap="4">
      <BarcodeScanDialog
        open={!!selected && scanDialogOpen}
        title="Scan Container"
        placeholder={selected?.handlingUnitCode ?? 'Scan SSCC / container'}
        loading={isPending}
        onSubmit={(code) => void handleConfirm(code)}
        onClose={() => setScanDialogOpen(false)}
      />
      <Stack gap="1">
        <Heading size="xl">Putaway</Heading>
        <Text color="fg.muted">
          Move pallet/container from receiving onto the conveyor and scan the
          handling unit. The system assigns a location and completes the move.
        </Text>
      </Stack>

      {lastAssigned && (
        <Box
          bg="green.subtle"
          borderWidth="1px"
          borderColor="green.solid"
          borderRadius="lg"
          p="3"
        >
          <Text fontWeight="medium">Conveyor dispatched to {lastAssigned}</Text>
        </Box>
      )}

      <HStack align="start" gap="4" flexWrap="wrap">
        <Box
          flex="1"
          minW="280px"
          bg="bg.panel"
          p="4"
          borderWidth="1px"
          borderRadius="lg"
        >
          <Heading size="md" mb="3">
            Pending tasks ({pendingTasks.length})
          </Heading>
          {pendingTasks.length === 0 ? (
            <Text color="fg.muted">No pending putaway tasks</Text>
          ) : (
            <Table.Root size="sm" interactive>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>ASN</Table.ColumnHeader>
                  <Table.ColumnHeader>Unit</Table.ColumnHeader>
                  <Table.ColumnHeader>Contents</Table.ColumnHeader>
                  <Table.ColumnHeader />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {pendingTasks.map((t) => (
                  <Table.Row
                    key={t.id}
                    bg={t.id === activeId ? 'bg.emphasized' : undefined}
                    cursor="pointer"
                    onClick={() => selectTask(t)}
                  >
                    <Table.Cell>{t.asnId}</Table.Cell>
                    <Table.Cell>
                      <Stack gap="0">
                        <Text fontSize="sm">{t.handlingUnitCode}</Text>
                        <HStack gap="1">
                          <Badge size="sm">{t.handlingUnitType}</Badge>
                          {t.quarantine && (
                            <Badge size="sm" colorPalette="orange">
                              QUARANTINE
                            </Badge>
                          )}
                        </HStack>
                      </Stack>
                    </Table.Cell>
                    <Table.Cell>
                      {t.lines.map((l) => `${l.sku}×${l.qty}`).join(', ')}
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        size="xs"
                        variant={t.id === activeId ? 'solid' : 'outline'}
                        onClick={(e) => {
                          e.stopPropagation()
                          selectTask(t)
                        }}
                      >
                        Select
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>

        <Box
          flex="1"
          minW="280px"
          bg="bg.panel"
          p="4"
          borderWidth="1px"
          borderRadius="lg"
        >
          <Heading size="md" mb="3">
            Load to conveyor
          </Heading>
          {!selected ? (
            <Text color="fg.muted">Select a pending task</Text>
          ) : (
            <Stack gap="4">
              <Stack gap="1">
                <Text fontSize="sm" color="fg.muted">
                  Handling unit
                </Text>
                <Text fontWeight="medium">
                  {selected.handlingUnitType}: {selected.handlingUnitCode}
                </Text>
                {selected.quarantine && (
                  <Badge colorPalette="orange" w="fit-content">
                    Quarantine zone
                  </Badge>
                )}
              </Stack>

              <Stack gap="1">
                <Text fontSize="sm" color="fg.muted">
                  Contents (from receiving)
                </Text>
                {selected.lines.map((line) => (
                  <Text key={line.id} fontSize="sm">
                    {line.sku} × {line.qty}
                  </Text>
                ))}
              </Stack>

              <Button
                colorPalette="blue"
                onClick={() => setScanDialogOpen(true)}
              >
                Scan to load
              </Button>
            </Stack>
          )}
        </Box>
      </HStack>

      {confirmedTasks.length > 0 && (
        <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
          <Heading size="md" mb="3">
            Completed
          </Heading>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>ASN</Table.ColumnHeader>
                <Table.ColumnHeader>Unit</Table.ColumnHeader>
                <Table.ColumnHeader>Location</Table.ColumnHeader>
                <Table.ColumnHeader>Contents</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {confirmedTasks.map((t) => (
                <Table.Row key={t.id}>
                  <Table.Cell>{t.asnId}</Table.Cell>
                  <Table.Cell>{t.handlingUnitCode}</Table.Cell>
                  <Table.Cell>{t.assignedLocation ?? '-'}</Table.Cell>
                  <Table.Cell>
                    {t.lines.map((l) => `${l.sku}×${l.qty}`).join(', ')}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Stack>
  )
}
