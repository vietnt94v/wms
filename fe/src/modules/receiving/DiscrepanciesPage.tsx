import {
  Box,
  Button,
  Heading,
  HStack,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { toaster } from '@/components/ui/toaster'
import type { DiscrepancyResolution } from '@/lib/domain/receiving'
import { useReceivingStore } from '@/store/receivingStore'
import { ReceivingNav } from './ReceivingNav'
import { StatusBadge } from './StatusBadge'

const actions: Array<{ resolution: DiscrepancyResolution; label: string; color: string }> = [
  { resolution: 'ACCEPT_VARIANCE', label: 'Accept variance', color: 'green' },
  { resolution: 'PARTIAL_ACCEPT', label: 'Partial accept', color: 'yellow' },
  { resolution: 'QUARANTINE', label: 'Quarantine', color: 'orange' },
  { resolution: 'CLAIM_SUPPLIER', label: 'Claim supplier', color: 'purple' },
  { resolution: 'REJECT', label: 'Reject', color: 'red' },
]

export function DiscrepanciesPage() {
  const discrepancies = useReceivingStore((s) => s.discrepancies)
  const resolveDiscrepancy = useReceivingStore((s) => s.resolveDiscrepancy)
  const generatePutawayTasks = useReceivingStore((s) => s.generatePutawayTasks)

  return (
    <Stack gap="4">
      <Heading size="xl">Discrepancy Handling</Heading>
      <Text color="fg.muted">
        OVER / SHORT / DAMAGED / WRONG_ITEM / QC_FAIL. Resolve before putaway.
      </Text>
      <ReceivingNav />

      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Type</Table.ColumnHeader>
              <Table.ColumnHeader>ASN</Table.ColumnHeader>
              <Table.ColumnHeader>SKU</Table.ColumnHeader>
              <Table.ColumnHeader>Qty</Table.ColumnHeader>
              <Table.ColumnHeader>Note</Table.ColumnHeader>
              <Table.ColumnHeader>Resolution</Table.ColumnHeader>
              <Table.ColumnHeader>Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {discrepancies.map((d) => (
              <Table.Row
                key={d.id}
                bg={
                  d.resolution === 'PENDING'
                    ? d.type === 'SHORT' || d.type === 'OVER'
                      ? 'bg.warning'
                      : 'bg.error'
                    : undefined
                }
              >
                <Table.Cell>
                  <StatusBadge status={d.type === 'SHORT' || d.type === 'OVER' ? 'QC' : 'REJECTED'} />{' '}
                  {d.type}
                </Table.Cell>
                <Table.Cell>{d.asnId}</Table.Cell>
                <Table.Cell>{d.sku ?? '-'}</Table.Cell>
                <Table.Cell>{d.qty}</Table.Cell>
                <Table.Cell>{d.note ?? '-'}</Table.Cell>
                <Table.Cell>
                  <StatusBadge status={d.resolution} />
                </Table.Cell>
                <Table.Cell>
                  {d.resolution === 'PENDING' ? (
                    <HStack gap="1" flexWrap="wrap">
                      {actions.map((a) => (
                        <Button
                          key={a.resolution}
                          size="xs"
                          colorPalette={a.color}
                          onClick={() => {
                            resolveDiscrepancy(d.id, a.resolution)
                            generatePutawayTasks(d.sessionId)
                            toaster.create({
                              title: `Resolved: ${a.label}`,
                              type: 'success',
                            })
                          }}
                        >
                          {a.label}
                        </Button>
                      ))}
                    </HStack>
                  ) : (
                    <Text fontSize="sm">Done</Text>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        {discrepancies.length === 0 && (
          <Text color="fg.muted" mt="2">
            No discrepancies yet
          </Text>
        )}
      </Box>
    </Stack>
  )
}
