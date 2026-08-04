import { Box, Heading, Stack, Table, Text } from '@chakra-ui/react'
import { QueryLoading } from '@/components/ui/query-loading'
import { useInventory, useProducts } from '@/lib/query/receiving'
import { BackToMenuButton } from './BackToMenuButton'

export function InventoryPage() {
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory()
  const { data: products = [], isLoading: productsLoading } = useProducts()

  if (inventoryLoading || productsLoading) {
    return <QueryLoading />
  }

  return (
    <Stack gap="4">
      <BackToMenuButton />
      <Heading size="xl">Inventory Update</Heading>
      <Text color="fg.muted">
        Available stock increases after putaway confirm. Quarantine is tracked
        separately.
      </Text>
      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Table.Root size="sm" interactive>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>SKU</Table.ColumnHeader>
              <Table.ColumnHeader>Name</Table.ColumnHeader>
              <Table.ColumnHeader>Available</Table.ColumnHeader>
              <Table.ColumnHeader>Quarantine</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {inventory.map((inv) => {
              const product = products.find((p) => p.sku === inv.sku)
              return (
                <Table.Row key={inv.sku}>
                  <Table.Cell>{inv.sku}</Table.Cell>
                  <Table.Cell>{product?.name ?? '-'}</Table.Cell>
                  <Table.Cell>{inv.available}</Table.Cell>
                  <Table.Cell>{inv.quarantine}</Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>
      </Box>
    </Stack>
  )
}
