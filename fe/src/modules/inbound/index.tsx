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
import axios from 'axios'
import { toaster } from '@/components/ui/toaster'
import { uid, type AsnType } from '@/lib/domain/receiving'
import { useReceivingStore } from '@/store/receivingStore'

export function InboundPage() {
  const products = useReceivingStore((s) => s.products)
  const suppliers = useReceivingStore((s) => s.suppliers)
  const createAsn = useReceivingStore((s) => s.createAsn)

  const [asnId, setAsnId] = useState(() => `ASN-${Date.now().toString().slice(-6)}`)
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? 'SUP-01')
  const [type, setType] = useState<AsnType>('SSCC')
  const [carrier, setCarrier] = useState('MockCarrier')
  const [plateNo, setPlateNo] = useState('51C-00001')
  const [linesText, setLinesText] = useState('SKU-SOAP-100:100\nSKU-OIL-1L:40')
  const [ssccText, setSsccText] = useState(
    '00098765432109876543|SKU-SOAP-100:50,SKU-OIL-1L:20',
  )
  const [submitting, setSubmitting] = useState(false)

  const handlePushAsn = async () => {
    const lines = linesText
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => {
        const [sku, qty] = row.split(':')
        return { sku: sku.trim(), expectedQty: Number(qty) }
      })
      .filter((l) => l.sku && l.expectedQty > 0)

    if (!supplierId || lines.length === 0) {
      toaster.create({
        title: 'Invalid ASN',
        description: 'Need supplier and at least one line SKU:QTY',
        type: 'error',
      })
      return
    }

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

    setSubmitting(true)
    try {
      const asn = await createAsn({
        id: asnId || uid('ASN'),
        supplierId,
        type,
        carrier,
        plateNo,
        lines,
        pallets,
      })
      toaster.create({
        title: 'ASN pushed to WMS',
        description: `${asn.id} is now in Receiving inbox (EXPECTED)`,
        type: 'success',
      })
      setAsnId(`ASN-${Date.now().toString().slice(-6)}`)
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string | undefined) ?? 'Failed to create ASN'
        : 'Failed to create ASN'
      toaster.create({
        title: 'Push failed',
        description: Array.isArray(message) ? message.join(', ') : message,
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="6" maxW="720px">
      <Box>
        <Heading size="xl">Inbound Feed</Heading>
        <Text color="fg.muted" mt="2">
          Simulates ERP/OMS pushing ASN into WMS (no PO). Not part of Receiving
          operations.
        </Text>
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
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
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
          <Textarea
            rows={4}
            value={linesText}
            onChange={(e) => setLinesText(e.target.value)}
            placeholder="SKU:QTY per line"
          />
          <Text fontSize="sm" color="fg.muted">
            Products: {products.map((p) => p.sku).join(', ')}
          </Text>
          {type === 'SSCC' && (
            <Textarea
              rows={4}
              value={ssccText}
              onChange={(e) => setSsccText(e.target.value)}
              placeholder="SSCC|SKU:QTY,SKU:QTY"
            />
          )}
          <Button
            colorPalette="green"
            onClick={() => void handlePushAsn()}
            alignSelf="start"
            loading={submitting}
          >
            Push ASN to WMS
          </Button>
        </Stack>
      </Box>
    </Stack>
  )
}
