import type { ReactNode } from 'react'
import { Box, Button, Heading, Stack, Table, Text } from '@chakra-ui/react'
import { toaster } from '@/components/ui/toaster'
import { QueryLoading } from '@/components/ui/query-loading'
import {
  useConfirmPutawayMutation,
  useGeneratePutawayTasksMutation,
  usePutawayTasks,
  useSessions,
} from '@/lib/query/receiving'
import { BackToMenuButton } from './BackToMenuButton'
import { StatusBadge } from './StatusBadge'

export function PutawayTasksPage() {
  const { data: putawayTasks = [], isLoading: tasksLoading } = usePutawayTasks()
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions()
  const { mutateAsync: generatePutawayTasks } = useGeneratePutawayTasksMutation()
  const { mutateAsync: confirmPutaway } = useConfirmPutawayMutation()

  if (tasksLoading || sessionsLoading) {
    return <QueryLoading />
  }

  const readySessions = sessions.filter((s) =>
    ['PUTAWAY', 'DISCREPANCY', 'QC', 'COMPLETED'].includes(s.status),
  )

  return (
    <Stack gap="4">
      <BackToMenuButton />
      <Heading size="xl">Putaway Tasks (from Receiving)</Heading>
      <Text color="fg.muted">
        Confirm storage location. Inventory updates on confirm. Full Putaway
        module remains a stub.
      </Text>

      <HStackLike>
        {readySessions.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant="outline"
            onClick={() => {
              void generatePutawayTasks(s.id).then(() =>
                toaster.create({ title: 'Tasks generated', type: 'success' }),
              )
            }}
          >
            Generate for {s.asnId}
          </Button>
        ))}
      </HStackLike>

      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Table.Root size="sm" interactive>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Task</Table.ColumnHeader>
              <Table.ColumnHeader>ASN</Table.ColumnHeader>
              <Table.ColumnHeader>SKU</Table.ColumnHeader>
              <Table.ColumnHeader>Qty</Table.ColumnHeader>
              <Table.ColumnHeader>Location</Table.ColumnHeader>
              <Table.ColumnHeader>Quarantine</Table.ColumnHeader>
              <Table.ColumnHeader>Status</Table.ColumnHeader>
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {putawayTasks.map((t) => (
              <Table.Row key={t.id}>
                <Table.Cell>{t.id}</Table.Cell>
                <Table.Cell>{t.asnId}</Table.Cell>
                <Table.Cell>{t.sku}</Table.Cell>
                <Table.Cell>{t.qty}</Table.Cell>
                <Table.Cell>{t.suggestedLocation}</Table.Cell>
                <Table.Cell>{t.quarantine ? 'YES' : 'NO'}</Table.Cell>
                <Table.Cell>
                  <StatusBadge status={t.status} />
                </Table.Cell>
                <Table.Cell>
                  {t.status === 'PENDING' && (
                    <Button
                      size="xs"
                      colorPalette="green"
                      onClick={() => {
                        void confirmPutaway(t.id).then(() =>
                          toaster.create({
                            title: 'Putaway confirmed',
                            description: t.quarantine
                              ? 'Kept in quarantine'
                              : 'Available inventory updated',
                            type: 'success',
                          }),
                        )
                      }}
                    >
                      Confirm
                    </Button>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        {putawayTasks.length === 0 && (
          <Text color="fg.muted" mt="2">
            No putaway tasks
          </Text>
        )}
      </Box>
    </Stack>
  )
}

function HStackLike({ children }: { children: ReactNode }) {
  return (
    <Box display="flex" gap="2" flexWrap="wrap">
      {children}
    </Box>
  )
}
