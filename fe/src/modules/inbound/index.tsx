import { useState } from 'react'
import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { toaster } from '@/components/ui/toaster'
import { uid, type AsnType } from '@/lib/domain/receiving'
import { useReceivingStore } from '@/store/receivingStore'

export function InboundPage() {
  const products = useReceivingStore((s) => s.products)
  const purchaseOrders = useReceivingStore((s) => s.purchaseOrders)
  const pushPo = useReceivingStore((s) => s.pushPo)
  const pushAsn = useReceivingStore((s) => s.pushAsn)

  const [poId, setPoId] = useState(purchaseOrders[0]?.id ?? '')
  const [asnId, setAsnId] = useState(() => `ASN-${Date.now().toString().slice(-6)}`)
  const [type, setType] = useState<AsnType>('SSCC')
  const [carrier, setCarrier] = useState('MockCarrier')
  const [plateNo, setPlateNo] = useState('51C-00001')
  const [linesText, setLinesText] = useState('SKU-SOAP-100:100\nSKU-OIL-1L:40')
  const [ssccText, setSsccText] = useState(
    '00098765432109876543|SKU-SOAP-100:50,SKU-OIL-1L:20',
  )
  const [newPoId, setNewPoId] = useState(() => `PO-${Date.now().toString().slice(-4)}`)
  const [supplierId, setSupplierId] = useState('SUP-01')

  const handlePushPo = () => {
    const lines = linesText
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => {
        const [sku, qty] = row.split(':')
        return { sku: sku.trim(), qty: Number(qty) }
      })
      .filter((l) => l.sku && l.qty > 0)

    if (!newPoId || lines.length === 0) {
      toaster.create({
        title: 'Invalid PO',
        description: 'Need PO id and at least one line SKU:QTY',
        type: 'error',
      })
      return
    }

    pushPo({
      id: newPoId,
      supplierId,
      status: 'OPEN',
      lines,
    })
    setPoId(newPoId)
    toaster.create({
      title: 'PO pushed',
      description: `${newPoId} available for ASN`,
      type: 'success',
    })
  }

  const handlePushAsn = () => {
    const po = purchaseOrders.find((p) => p.id === poId)
    if (!po) {
      toaster.create({
        title: 'PO missing',
        description: 'Push a PO first or select an existing one',
        type: 'error',
      })
      return
    }

    const lines = po.lines.map((l) => ({
      sku: l.sku,
      expectedQty: l.qty,
      receivedQty: 0,
    }))

    const pallets =
      type === 'SSCC'
        ? ssccText
            .split('\n')
            .map((row) => row.trim())
            .filter(Boolean)
            .map((row) => {
              const [sscc, itemsPart] = row.split('|')
              const items = (itemsPart ?? '')
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean)
                .map((part) => {
                  const [sku, qty] = part.split(':')
                  return { sku: sku.trim(), qty: Number(qty) }
                })
              return {
                sscc: sscc.trim(),
                destinationWh: 'WH-01',
                items,
              }
            })
        : []

    pushAsn({
      id: asnId || uid('ASN'),
      poId: po.id,
      type,
      carrier,
      plateNo,
      status: 'EXPECTED',
      eta: new Date().toISOString(),
      lines,
      pallets,
    })

    toaster.create({
      title: 'ASN pushed to WMS',
      description: `${asnId} is now in Receiving inbox (EXPECTED)`,
      type: 'success',
    })
    setAsnId(`ASN-${Date.now().toString().slice(-6)}`)
  }

  return (
    <Stack gap="6" maxW="720px">
      <Box>
        <Heading size="xl">Inbound Feed (mock)</Heading>
        <Text color="fg.muted" mt="2">
          Simulates ERP/OMS pushing PO & ASN into WMS. Not part of Receiving
          operations.
        </Text>
      </Box>

      <Box bg="bg.panel" p="5" borderWidth="1px" borderRadius="lg">
        <Heading size="md" mb="4">
          Push Purchase Order
        </Heading>
        <Stack gap="3">
          <HStack>
            <Input
              placeholder="PO id"
              value={newPoId}
              onChange={(e) => setNewPoId(e.target.value)}
            />
            <NativeSelect.Root>
              <NativeSelect.Field
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="SUP-01">Acme Supplies</option>
                <option value="SUP-02">Northwind Trading</option>
              </NativeSelect.Field>
            </NativeSelect.Root>
          </HStack>
          <Textarea
            rows={4}
            value={linesText}
            onChange={(e) => setLinesText(e.target.value)}
            placeholder="SKU:QTY per line"
          />
          <Text fontSize="sm" color="fg.muted">
            Products: {products.map((p) => p.sku).join(', ')}
          </Text>
          <Button colorPalette="blue" onClick={handlePushPo} alignSelf="start">
            Push PO
          </Button>
        </Stack>
      </Box>

      <Box bg="bg.panel" p="5" borderWidth="1px" borderRadius="lg">
        <Heading size="md" mb="4">
          Push ASN
        </Heading>
        <Stack gap="3">
          <HStack>
            <Input value={asnId} onChange={(e) => setAsnId(e.target.value)} />
            <NativeSelect.Root>
              <NativeSelect.Field
                value={poId}
                onChange={(e) => setPoId(e.target.value)}
              >
                {purchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.id}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={type}
                onChange={(e) => setType(e.target.value as AsnType)}
              >
                <option value="SSCC">Full SSCC</option>
                <option value="CONTAINER">Scan each container</option>
              </NativeSelect.Field>
            </NativeSelect.Root>
          </HStack>
          <HStack>
            <Input
              placeholder="Carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
            <Input
              placeholder="Plate no"
              value={plateNo}
              onChange={(e) => setPlateNo(e.target.value)}
            />
          </HStack>
          {type === 'SSCC' && (
            <Textarea
              rows={4}
              value={ssccText}
              onChange={(e) => setSsccText(e.target.value)}
              placeholder="SSCC|SKU:QTY,SKU:QTY"
            />
          )}
          <Button colorPalette="green" onClick={handlePushAsn} alignSelf="start">
            Push ASN to WMS
          </Button>
        </Stack>
      </Box>
    </Stack>
  )
}
