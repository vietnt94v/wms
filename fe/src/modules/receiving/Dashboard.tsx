import { Box, Heading, HStack, SimpleGrid, Stack, Table, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { useReceivingStore } from '@/store/receivingStore'
import { BackToMenuButton } from './BackToMenuButton'
import { StatusBadge } from './StatusBadge'

export function ReceivingDashboard() {
  const asns = useReceivingStore((s) => s.asns)
  const docks = useReceivingStore((s) => s.docks)
  const sessions = useReceivingStore((s) => s.sessions)
  const discrepancies = useReceivingStore((s) => s.discrepancies)

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
          <Table.Root size="sm">
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
                <Table.Row key={asn.id}>
                  <Table.Cell>
                    <Link to={`/receiving/asn/${asn.id}`}>{asn.id}</Link>
                  </Table.Cell>
                  <Table.Cell>{asn.type}</Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={asn.status} />
                  </Table.Cell>
                  <Table.Cell>{asn.plateNo}</Table.Cell>
                </Table.Row>
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
              </Box>
            ))}
          </HStack>
          <Text mt="3" fontSize="sm">
            <Link to="/receiving/docks">Open dock scheduling →</Link>
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
