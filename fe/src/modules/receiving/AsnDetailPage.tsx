import { Box, Heading, SimpleGrid, Stack, Table, Text } from '@chakra-ui/react'
import { useParams } from 'react-router-dom'
import { AppLink } from '@/components/ui/app-link'
import { QueryLoading } from '@/components/ui/query-loading'
import { useAsns, useSuppliers } from '@/lib/query/receiving'
import { BackToMenuButton } from './BackToMenuButton'
import { StatusBadge } from './StatusBadge'

export function AsnDetailPage() {
  const { id } = useParams()
  const { data: asns = [], isLoading: asnsLoading } = useAsns()
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers()

  if (asnsLoading || suppliersLoading) {
    return <QueryLoading />
  }

  const asn = asns.find((a) => a.id === id)
  const supplier = asn ? suppliers.find((x) => x.id === asn.supplierId) : undefined

  if (!asn) {
    return (
      <Stack>
        <BackToMenuButton />
        <Text>ASN not found</Text>
      </Stack>
    )
  }

  return (
    <Stack gap="4">
      <BackToMenuButton />
      <Heading size="xl">{asn.id}</Heading>
      <HMeta
        items={[
          ['Supplier', supplier?.name ?? asn.supplierId],
          ['Mode', asn.type],
          ['Carrier', asn.carrier],
          ['Plate', asn.plateNo],
          ['Status', asn.status],
        ]}
      />

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
        <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
          <Heading size="md" mb="3">
            ASN lines
          </Heading>
          <Table.Root size="sm" interactive>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>SKU</Table.ColumnHeader>
                <Table.ColumnHeader>Expected</Table.ColumnHeader>
                <Table.ColumnHeader>Received</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {asn.lines.map((line) => (
                <Table.Row key={line.sku}>
                  <Table.Cell>{line.sku}</Table.Cell>
                  <Table.Cell>{line.expectedQty}</Table.Cell>
                  <Table.Cell>{line.receivedQty}</Table.Cell>
                </Table.Row>
              ))}
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
            <Table.Root size="sm" interactive>
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
        <AppLink to="/receiving/docks">Schedule dock / gate-in →</AppLink>
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
