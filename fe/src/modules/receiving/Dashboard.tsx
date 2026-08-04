import { Box, Heading, HStack, SimpleGrid, Stack, Table, Text } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { AppLink } from '@/components/ui/app-link'
import { ClickableTableRow } from '@/components/ui/clickable-table-row'
import { QueryLoading } from '@/components/ui/query-loading'
import { useAsns, useDiscrepancies, useDocks, useSessions } from '@/lib/query/receiving'
import { BackToMenuButton } from './BackToMenuButton'
import { StatusBadge } from './StatusBadge'

export function ReceivingDashboard() {
  const navigate = useNavigate()
  const { data: asns = [], isLoading: asnsLoading } = useAsns()
  const { data: docks = [], isLoading: docksLoading } = useDocks()
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions()
  const { data: discrepancies = [], isLoading: discLoading } = useDiscrepancies()

  if (asnsLoading || docksLoading || sessionsLoading || discLoading) {
    return <QueryLoading />
  }

  const occupied = docks.filter((d) => d.status === 'OCCUPIED').length
  const pendingDisc = discrepancies.filter((d) => d.resolution === 'PENDING').length
  const activeSessions = sessions.filter(
    (s) => !['COMPLETED', 'REJECTED'].includes(s.status),
  )

  return (
    <Stack gap="4">
      <BackToMenuButton />
      <Heading size="xl">Receiving Dashboard</Heading>

      <SimpleGrid columns={{ base: 1, md: 4 }} gap="4">
        <Kpi title="ASN total" value={String(asns.length)} />
        <Kpi title="Docks occupied" value={`${occupied}/${docks.length}`} />
        <Kpi title="Active sessions" value={String(activeSessions.length)} />
        <Kpi title="Pending discrepancies" value={String(pendingDisc)} />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
        <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
          <Heading size="md" mb="3">
            ASN inbox
          </Heading>
          <Table.Root size="sm" interactive>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>ASN</Table.ColumnHeader>
                <Table.ColumnHeader>Type</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Plate</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {asns.map((asn) => (
                <ClickableTableRow
                  key={asn.id}
                  onActivate={() => navigate(`/receiving/asn/${asn.id}`)}
                >
                  <Table.Cell>
                    <AppLink to={`/receiving/asn/${asn.id}`}>{asn.id}</AppLink>
                  </Table.Cell>
                  <Table.Cell>{asn.type}</Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={asn.status} />
                  </Table.Cell>
                  <Table.Cell>{asn.plateNo}</Table.Cell>
                </ClickableTableRow>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>

        <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
          <Heading size="md" mb="3">
            Dock board
          </Heading>
          <HStack gap="3" flexWrap="wrap">
            {docks.map((dock) => (
              <Box
                key={dock.id}
                borderWidth="1px"
                borderRadius="md"
                p="3"
                minW="120px"
                bg={dock.status === 'AVAILABLE' ? 'bg.success' : 'bg.warning'}
              >
                <Text fontWeight="bold">{dock.name}</Text>
                <StatusBadge status={dock.status} />
                <Text fontSize="xs" mt="1" color="fg.muted">
                  {dock.operator
                    ? `Operator: ${dock.operator.fullName}`
                    : 'No operator'}
                </Text>
              </Box>
            ))}
          </HStack>
          <Text mt="3" fontSize="sm">
            <AppLink to="/receiving/docks">Open dock scheduling →</AppLink>
          </Text>
        </Box>
      </SimpleGrid>
    </Stack>
  )
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
      <Text fontSize="sm" color="fg.muted">
        {title}
      </Text>
      <Heading size="lg">{value}</Heading>
    </Box>
  )
}
