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
import { QueryLoading } from '@/components/ui/query-loading'
import type { DiscrepancyResolution } from '@/lib/domain/receiving'
import {
  useDiscrepancies,
  useGeneratePutawayTasksMutation,
  useResolveDiscrepancyMutation,
} from '@/lib/query/receiving'
import { BackToMenuButton } from './BackToMenuButton'
import { StatusBadge } from './StatusBadge'

const actions: Array<{ resolution: DiscrepancyResolution; label: string; color: string }> = [
  { resolution: 'ACCEPT_VARIANCE', label: 'Accept variance', color: 'green' },
  { resolution: 'PARTIAL_ACCEPT', label: 'Partial accept', color: 'yellow' },
  { resolution: 'QUARANTINE', label: 'Quarantine', color: 'orange' },
  { resolution: 'CLAIM_SUPPLIER', label: 'Claim supplier', color: 'purple' },
  { resolution: 'REJECT', label: 'Reject', color: 'red' },
]

export function DiscrepanciesPage() {
  const { data: discrepancies = [], isLoading } = useDiscrepancies()
  const { mutateAsync: resolveDiscrepancy } = useResolveDiscrepancyMutation()
  const { mutateAsync: generatePutawayTasks } = useGeneratePutawayTasksMutation()

  if (isLoading) {
    return <QueryLoading />
  }

  return (
    <Stack gap="4">
      <BackToMenuButton />
      <Heading size="xl">Discrepancy Handling</Heading>
      <Text color="fg.muted">
        OVER / SHORT / DAMAGED / WRONG_ITEM / QC_FAIL. Resolve before putaway.
      </Text>

      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Table.Root size="sm" interactive>
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
                transition="background-color 0.15s ease"
                _hover={{ bg: 'bg.emphasized' }}
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
                            void resolveDiscrepancy(d.id, a.resolution)
                              .then(() => generatePutawayTasks(d.sessionId))
                              .then(() =>
                                toaster.create({
                                  title: `Resolved: ${a.label}`,
                                  type: 'success',
                                }),
                              )
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
