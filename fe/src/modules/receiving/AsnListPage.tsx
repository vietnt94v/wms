import { Box, Heading, Stack, Table, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { useReceivingStore } from '@/store/receivingStore'
import { ReceivingNav } from './ReceivingNav'
import { StatusBadge } from './StatusBadge'

export function AsnListPage() {
  const asns = useReceivingStore((s) => s.asns)
  const purchaseOrders = useReceivingStore((s) => s.purchaseOrders)

  return (
    <Stack gap="4">
      <Heading size="xl">ASN Inbox</Heading>
      <Text color="fg.muted">
        Read-only inbox of ASN/PO pushed from external systems (or Inbound Feed
        mock).
      </Text>
      <ReceivingNav />
      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Table.Root size="sm">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>ASN</Table.ColumnHeader>
              <Table.ColumnHeader>PO</Table.ColumnHeader>
              <Table.ColumnHeader>Supplier PO lines</Table.ColumnHeader>
              <Table.ColumnHeader>Mode</Table.ColumnHeader>
              <Table.ColumnHeader>Carrier / Plate</Table.ColumnHeader>
              <Table.ColumnHeader>Status</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {asns.map((asn) => {
              const po = purchaseOrders.find((p) => p.id === asn.poId)
              return (
                <Table.Row key={asn.id}>
                  <Table.Cell>
                    <Link to={`/receiving/asn/${asn.id}`}>{asn.id}</Link>
                  </Table.Cell>
                  <Table.Cell>{asn.poId}</Table.Cell>
                  <Table.Cell>{po?.lines.length ?? 0}</Table.Cell>
                  <Table.Cell>{asn.type}</Table.Cell>
                  <Table.Cell>
                    {asn.carrier} / {asn.plateNo}
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={asn.status} />
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </Stack>
  )
}
