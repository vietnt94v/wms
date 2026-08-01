import { Box, Heading, SimpleGrid, Stack, Table, Text } from '@chakra-ui/react'
import { Link, useParams } from 'react-router-dom'
import { useReceivingStore } from '@/store/receivingStore'
import { ReceivingNav } from './ReceivingNav'
import { StatusBadge } from './StatusBadge'

export function AsnDetailPage() {
  const { id } = useParams()
  const asn = useReceivingStore((s) => s.asns.find((a) => a.id === id))
  const po = useReceivingStore((s) =>
    asn ? s.purchaseOrders.find((p) => p.id === asn.poId) : undefined,
  )
  const supplier = useReceivingStore((s) =>
    po ? s.suppliers.find((x) => x.id === po.supplierId) : undefined,
  )

  if (!asn) {
    return (
      <Stack>
        <ReceivingNav />
        <Text>ASN not found</Text>
      </Stack>
    )
  }

  return (
    <Stack gap="4">
      <Heading size="xl">{asn.id}</Heading>
      <ReceivingNav />
      <HMeta
        items={[
          ['PO', asn.poId],
          ['Supplier', supplier?.name ?? '-'],
          ['Mode', asn.type],
          ['Carrier', asn.carrier],
          ['Plate', asn.plateNo],
          ['Status', asn.status],
        ]}
      />

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
        <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
          <Heading size="md" mb="3">
            PO ↔ ASN lines
          </Heading>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>SKU</Table.ColumnHeader>
                <Table.ColumnHeader>PO qty</Table.ColumnHeader>
                <Table.ColumnHeader>ASN expected</Table.ColumnHeader>
                <Table.ColumnHeader>Received</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(po?.lines ?? []).map((line) => {
                const asnLine = asn.lines.find((l) => l.sku === line.sku)
                return (
                  <Table.Row key={line.sku}>
                    <Table.Cell>{line.sku}</Table.Cell>
                    <Table.Cell>{line.qty}</Table.Cell>
                    <Table.Cell>{asnLine?.expectedQty ?? 0}</Table.Cell>
                    <Table.Cell>{asnLine?.receivedQty ?? 0}</Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Root>
        </Box>

        <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
          <Heading size="md" mb="3">
            SSCC pallets
          </Heading>
          {asn.pallets.length === 0 ? (
            <Text color="fg.muted">Container mode — no SSCC list</Text>
          ) : (
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>SSCC</Table.ColumnHeader>
                  <Table.ColumnHeader>WH</Table.ColumnHeader>
                  <Table.ColumnHeader>Items</Table.ColumnHeader>
                  <Table.ColumnHeader>Flags</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {asn.pallets.map((p) => (
                  <Table.Row key={p.sscc}>
                    <Table.Cell>{p.sscc}</Table.Cell>
                    <Table.Cell>{p.destinationWh}</Table.Cell>
                    <Table.Cell>
                      {p.items.map((i) => `${i.sku}×${i.qty}`).join(', ')}
                    </Table.Cell>
                    <Table.Cell>
                      {p.received ? 'RECEIVED ' : ''}
                      {p.blocked ? 'BLOCKED ' : ''}
                      {p.damaged ? 'DAMAGED' : ''}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </SimpleGrid>

      <Text>
        <Link to="/receiving/docks">Schedule dock / gate-in →</Link>
      </Text>
      <StatusBadge status={asn.status} />
    </Stack>
  )
}

function HMeta({ items }: { items: Array<[string, string]> }) {
  return (
    <SimpleGrid columns={{ base: 2, md: 3 }} gap="2">
      {items.map(([k, v]) => (
        <Box key={k} bg="bg.panel" p="3" borderWidth="1px" borderRadius="md">
          <Text fontSize="xs" color="fg.muted">
            {k}
          </Text>
          <Text fontWeight="medium">{v}</Text>
        </Box>
      ))}
    </SimpleGrid>
  )
}
