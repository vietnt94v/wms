import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  Progress,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { toaster } from '@/components/ui/toaster'
import { VarianceReasonPicker } from '@/components/ui/variance-reason-picker'
import {
  RECEIPT_VARIANCE_REASONS,
  receivedQtyForSku,
  willCauseVariance,
  type ASN,
  type ReceiptVarianceReasonId,
  type ReceivingSession,
} from '@/lib/domain/receiving'
import { validateScan, type ScanLineInput } from '@/lib/domain/scan'
import { useReceivingStore } from '@/store/receivingStore'

interface Props {
  session: ReceivingSession
  asn: ASN
}

export function ScanWorkspace({ session, asn }: Props) {
  const products = useReceivingStore((s) => s.products)
  const scan = useReceivingStore((s) => s.scan)

  const [code, setCode] = useState('')
  const [lot, setLot] = useState('')
  const [expiry, setExpiry] = useState('')
  const [allowOver, setAllowOver] = useState(false)

  const [pendingCode, setPendingCode] = useState('')
  const [pendingKind, setPendingKind] = useState<'SSCC' | 'SKU' | null>(null)
  const [pendingLines, setPendingLines] = useState<ScanLineInput[]>([])
  const [varianceReasonId, setVarianceReasonId] = useState<
    ReceiptVarianceReasonId | ''
  >('')
  const [otherReasonText, setOtherReasonText] = useState('')

  const progress = useMemo(() => {
    const expected = asn.lines.reduce((s, l) => s + l.expectedQty, 0)
    const received = asn.lines.reduce((s, l) => s + l.receivedQty, 0)
    return expected === 0 ? 0 : Math.min(100, Math.round((received / expected) * 100))
  }, [asn.lines])

  const exceptions = session.scanEvents.filter((e) => e.result !== 'OK')

  const varianceChecks = useMemo(
    () =>
      pendingLines.map((line) => ({
        sku: line.sku,
        ...willCauseVariance(asn, session, line.sku, line.qty),
      })),
    [asn, session, pendingLines],
  )

  const hasVariance = varianceChecks.some((c) => c.hasVariance)

  const resolvedVarianceReason = useMemo(() => {
    if (!varianceReasonId) return ''
    if (varianceReasonId === 'OTHER') return otherReasonText.trim()
    return (
      RECEIPT_VARIANCE_REASONS.find((r) => r.id === varianceReasonId)?.label ??
      ''
    )
  }, [varianceReasonId, otherReasonText])

  const lotRequiredMissing = useMemo(() => {
    if (session.mode !== 'CONTAINER' || pendingLines.length === 0) return false
    const sku = pendingLines[0]?.sku
    const product = products.find((p) => p.sku === sku)
    return !!product?.requiresLotExpiry && (!lot.trim() || !expiry)
  }, [session.mode, pendingLines, products, lot, expiry])

  const canConfirm =
    !!pendingCode &&
    pendingLines.length > 0 &&
    pendingLines.every((l) => l.qty > 0) &&
    !lotRequiredMissing &&
    (!hasVariance || !!resolvedVarianceReason)

  const resetPending = () => {
    setPendingCode('')
    setPendingKind(null)
    setPendingLines([])
    setVarianceReasonId('')
    setOtherReasonText('')
    setCode('')
  }

  const onResolve = () => {
    if (!code.trim()) return

    const preview = validateScan({
      code,
      session,
      asn,
      products,
      lot: lot || undefined,
      expiry: expiry || undefined,
      qty: session.mode === 'CONTAINER' ? 1 : undefined,
      confirm: false,
      allowOverOverride: allowOver,
    })

    if (
      preview.result === 'BLOCK' &&
      preview.errorType !== 'MISSING_LOT_EXPIRY'
    ) {
      toaster.create({
        title: preview.errorType ?? preview.result,
        description: `${preview.message}${preview.actionHint ? ` — ${preview.actionHint}` : ''}`,
        type: 'error',
      })
      if (preview.errorType === 'UNEXPECTED_ITEM' || preview.errorType === 'UNKNOWN_PALLET') {
        scan({
          sessionId: session.id,
          code,
          confirm: true,
          allowOverOverride: allowOver,
        })
      }
      return
    }

    if (preview.result === 'WARN' && preview.errorType === 'DUPLICATE') {
      toaster.create({
        title: preview.errorType,
        description: `${preview.message}${preview.actionHint ? ` — ${preview.actionHint}` : ''}`,
        type: 'warning',
      })
      return
    }

    const lines = preview.apply?.lines
    if (!lines || lines.length === 0) {
      toaster.create({
        title: preview.errorType ?? 'Cannot resolve',
        description: preview.message,
        type: 'error',
      })
      return
    }

    setPendingCode(code.trim())
    setPendingKind(preview.kind === 'SSCC' ? 'SSCC' : 'SKU')
    setPendingLines(lines.map((l) => ({ ...l })))
    setVarianceReasonId('')
    setOtherReasonText('')
  }

  const updateLineQty = (sku: string, qty: number) => {
    setPendingLines((prev) =>
      prev.map((l) => (l.sku === sku ? { ...l, qty } : l)),
    )
  }

  const onConfirm = () => {
    if (!canConfirm) return

    const primary = pendingLines[0]
    const event = scan({
      sessionId: session.id,
      code: pendingCode,
      lot: lot || primary?.lot,
      expiry: expiry || primary?.expiry,
      qty: session.mode === 'CONTAINER' ? primary?.qty : undefined,
      lines: session.mode === 'SSCC' ? pendingLines : undefined,
      varianceReason: hasVariance ? resolvedVarianceReason : undefined,
      varianceReasonId: hasVariance && varianceReasonId ? varianceReasonId : undefined,
      confirm: true,
      allowOverOverride: allowOver,
    })

    const type =
      event.result === 'OK'
        ? 'success'
        : event.result === 'WARN'
          ? 'warning'
          : 'error'

    toaster.create({
      title: event.errorType ?? event.result,
      description: `${event.message}${event.actionHint ? ` — ${event.actionHint}` : ''}`,
      type,
    })

    if (event.result === 'OK') {
      resetPending()
      setLot('')
      setExpiry('')
      setAllowOver(false)
    }
  }

  return (
    <Stack gap="4">
      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <HStack justify="space-between" mb="3">
          <Heading size="md">
            Scan workspace — {session.mode === 'SSCC' ? 'Full SSCC' : 'Each container'}
          </Heading>
          <Text fontSize="sm">{progress}%</Text>
        </HStack>
        <Progress.Root value={progress} mb="4">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>

        <Stack gap="3">
          <Input
            autoFocus
            placeholder={
              session.mode === 'SSCC'
                ? 'Scan SSCC (e.g. 00012345678901234567)'
                : 'Scan SKU barcode'
            }
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onResolve()
            }}
            disabled={!!pendingCode}
          />
          {session.mode === 'CONTAINER' && (
            <HStack>
              <Input
                placeholder="Lot (if required)"
                value={lot}
                onChange={(e) => setLot(e.target.value)}
              />
              <Input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
              <Button
                variant={allowOver ? 'solid' : 'outline'}
                colorPalette="orange"
                onClick={() => setAllowOver((v) => !v)}
              >
                Supervisor override
              </Button>
            </HStack>
          )}

          {!pendingCode ? (
            <Button colorPalette="blue" onClick={onResolve} alignSelf="start">
              Scan
            </Button>
          ) : (
            <Stack gap="3" borderWidth="1px" borderRadius="md" p="3">
              <HStack justify="space-between">
                <Text fontWeight="medium">
                  {pendingKind === 'SSCC'
                    ? `Pallet ${pendingCode}`
                    : pendingLines[0]?.sku}
                </Text>
                <Button size="sm" variant="ghost" onClick={resetPending}>
                  Clear
                </Button>
              </HStack>

              {pendingKind === 'SKU' && pendingLines[0] && (
                <Stack gap="2">
                  {(() => {
                    const check = varianceChecks[0]
                    return (
                      <HStack gap="4" fontSize="sm" flexWrap="wrap">
                        <Text>Expected: {check?.expected ?? 0}</Text>
                        <Text>Received: {check?.current ?? 0}</Text>
                        <Text fontWeight="medium">
                          After: {check?.next ?? pendingLines[0].qty}
                        </Text>
                      </HStack>
                    )
                  })()}
                  <QuantityStepper
                    value={pendingLines[0].qty}
                    onChange={(qty) => updateLineQty(pendingLines[0].sku, qty)}
                  />
                </Stack>
              )}

              {pendingKind === 'SSCC' && (
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>SKU</Table.ColumnHeader>
                      <Table.ColumnHeader>Expected</Table.ColumnHeader>
                      <Table.ColumnHeader>Received</Table.ColumnHeader>
                      <Table.ColumnHeader>Qty</Table.ColumnHeader>
                      <Table.ColumnHeader>After</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {pendingLines.map((line) => {
                      const check = varianceChecks.find((c) => c.sku === line.sku)
                      const expected =
                        asn.lines.find((l) => l.sku === line.sku)?.expectedQty ?? 0
                      const current = receivedQtyForSku(session, line.sku)
                      return (
                        <Table.Row key={line.sku}>
                          <Table.Cell>{line.sku}</Table.Cell>
                          <Table.Cell>{expected}</Table.Cell>
                          <Table.Cell>{current}</Table.Cell>
                          <Table.Cell>
                            <QuantityStepper
                              value={line.qty}
                              onChange={(qty) => updateLineQty(line.sku, qty)}
                            />
                          </Table.Cell>
                          <Table.Cell>{check?.next ?? current + line.qty}</Table.Cell>
                        </Table.Row>
                      )
                    })}
                  </Table.Body>
                </Table.Root>
              )}

              {hasVariance && (
                <VarianceReasonPicker
                  value={varianceReasonId}
                  onChange={setVarianceReasonId}
                  otherText={otherReasonText}
                  onOtherTextChange={setOtherReasonText}
                />
              )}

              {lotRequiredMissing && (
                <Text fontSize="sm" color="fg.error">
                  Lot and expiry are required for this SKU.
                </Text>
              )}

              <HStack>
                <Button
                  colorPalette="green"
                  disabled={!canConfirm}
                  onClick={onConfirm}
                >
                  Confirm receive
                </Button>
              </HStack>
            </Stack>
          )}

          <Text fontSize="sm" color="fg.muted">
            Lot-required SKUs:{' '}
            {products
              .filter((p) => p.requiresLotExpiry)
              .map((p) => p.sku)
              .join(', ') || 'none'}
          </Text>
        </Stack>
      </Box>

      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Heading size="md" mb="3">
          Expected vs received
        </Heading>
        <Table.Root size="sm" interactive>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>SKU</Table.ColumnHeader>
              <Table.ColumnHeader>Expected</Table.ColumnHeader>
              <Table.ColumnHeader>Received</Table.ColumnHeader>
              <Table.ColumnHeader>Gap</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {asn.lines.map((line) => (
              <Table.Row key={line.sku}>
                <Table.Cell>{line.sku}</Table.Cell>
                <Table.Cell>{line.expectedQty}</Table.Cell>
                <Table.Cell>{line.receivedQty}</Table.Cell>
                <Table.Cell>{line.expectedQty - line.receivedQty}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Heading size="md" mb="3">
          Exceptions
        </Heading>
        {exceptions.length === 0 ? (
          <Text color="fg.muted">No scan exceptions</Text>
        ) : (
          <Table.Root size="sm" interactive>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Code</Table.ColumnHeader>
                <Table.ColumnHeader>Result</Table.ColumnHeader>
                <Table.ColumnHeader>Error</Table.ColumnHeader>
                <Table.ColumnHeader>Message / Action</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {exceptions.map((e) => (
                <Table.Row key={e.id}>
                  <Table.Cell>{e.code}</Table.Cell>
                  <Table.Cell
                    color={e.result === 'BLOCK' ? 'fg.error' : 'fg.warning'}
                  >
                    {e.result}
                  </Table.Cell>
                  <Table.Cell>{e.errorType}</Table.Cell>
                  <Table.Cell>
                    {e.message}
                    {e.actionHint ? ` → ${e.actionHint}` : ''}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Box>
    </Stack>
  )
}
