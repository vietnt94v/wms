import { Box, Heading, Stack, Table, Text } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { AppLink } from '@/components/ui/app-link'
import { ClickableTableRow } from '@/components/ui/clickable-table-row'
import { QueryLoading } from '@/components/ui/query-loading'
import { useAsns, useSuppliers } from '@/lib/query/receiving'
import { BackToMenuButton } from './BackToMenuButton'
import { StatusBadge } from './StatusBadge'

export function AsnListPage() {
  const navigate = useNavigate()
  const { data: asns = [], isLoading: asnsLoading } = useAsns()
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers()

  if (asnsLoading || suppliersLoading) {
    return <QueryLoading />
  }

  return (
    <Stack gap="4">
      <BackToMenuButton />
      <Heading size="xl">ASN Inbox</Heading>
      <Text color="fg.muted">
        Read-only inbox of ASNs pushed from external systems (or Inbound Feed).
      </Text>
      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Table.Root size="sm" interactive>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>ASN</Table.ColumnHeader>
              <Table.ColumnHeader>Supplier</Table.ColumnHeader>
              <Table.ColumnHeader>Lines</Table.ColumnHeader>
              <Table.ColumnHeader>Mode</Table.ColumnHeader>
              <Table.ColumnHeader>Carrier / Plate</Table.ColumnHeader>
              <Table.ColumnHeader>Status</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {asns.map((asn) => {
              const supplier = suppliers.find((s) => s.id === asn.supplierId)
              return (
                <ClickableTableRow
                  key={asn.id}
                  onActivate={() => navigate(`/receiving/asn/${asn.id}`)}
                >
                  <Table.Cell>
                    <AppLink to={`/receiving/asn/${asn.id}`}>{asn.id}</AppLink>
                  </Table.Cell>
                  <Table.Cell>{supplier?.name ?? asn.supplierId}</Table.Cell>
                  <Table.Cell>{asn.lines.length}</Table.Cell>
                  <Table.Cell>{asn.type}</Table.Cell>
                  <Table.Cell>
                    {asn.carrier} / {asn.plateNo}
                  </Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={asn.status} />
                  </Table.Cell>
                </ClickableTableRow>
              )
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </Stack>
  )
}
