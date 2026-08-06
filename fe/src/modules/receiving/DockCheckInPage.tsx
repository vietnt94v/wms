import { useState } from 'react'
import {
  Box,
  Button,
  Heading,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react'
import { isAxiosError } from 'axios'
import { Navigate, useNavigate } from 'react-router-dom'
import { BarcodeScanDialog } from '@/components/ui/barcode-scan-dialog'
import { OperatorAlertDialog } from '@/components/ui/operator-alert-dialog'
import { OperatorConfirmDialog } from '@/components/ui/operator-confirm-dialog'
import { useQueryClient } from '@tanstack/react-query'
import { useDockAssignmentStore } from '@/store/dockAssignmentStore'
import { receivingKeys } from '@/lib/query/keys'
import { useDocks } from '@/lib/query/receiving'

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    const msg = data?.message
    if (Array.isArray(msg)) return msg.join(', ')
    if (typeof msg === 'string') return msg
  }
  if (error instanceof Error) return error.message
  return 'Check-in failed'
}

export function DockCheckInPage() {
  const navigate = useNavigate()
  const { data: docks = [] } = useDocks()
  const queryClient = useQueryClient()
  const assignment = useDockAssignmentStore((s) => s.assignment)
  const loaded = useDockAssignmentStore((s) => s.loaded)
  const checkIn = useDockAssignmentStore((s) => s.checkIn)

  const [scanDialogOpen, setScanDialogOpen] = useState(true)
  const [pendingDockId, setPendingDockId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState<{ title: string; description: string } | null>(
    null,
  )

  if (!loaded) {
    return (
      <Box py="16" textAlign="center">
        <Spinner size="lg" />
        <Text mt="3" color="fg.muted">
          Loading…
        </Text>
      </Box>
    )
  }

  if (assignment) {
    return <Navigate to="/receiving" replace />
  }

  const pendingDock = pendingDockId
    ? docks.find((d) => d.id === pendingDockId)
    : undefined

  const resolveScan = (scannedCode: string) => {
    const dockId = scannedCode.trim().toUpperCase()
    if (!dockId) return
    const dock = docks.find((d) => d.id.toUpperCase() === dockId)
    if (!dock) {
      setAlert({
        title: 'Dock not found',
        description: `No dock matches "${dockId}". Scan a valid dock ID (e.g. D01).`,
      })
      return
    }
    setScanDialogOpen(false)
    setPendingDockId(dock.id)
  }

  const handleConfirm = async () => {
    if (!pendingDockId) return
    setSubmitting(true)
    try {
      await checkIn(pendingDockId)
      void queryClient.invalidateQueries({ queryKey: receivingKeys.docks() })
      setPendingDockId(null)
      setScanDialogOpen(true)
      navigate('/receiving', { replace: true })
    } catch (error) {
      setPendingDockId(null)
      setScanDialogOpen(true)
      setAlert({
        title: 'Check-in failed',
        description: errorMessage(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="6" maxW="480px" mx="auto" mt="8">
      <BarcodeScanDialog
        open={scanDialogOpen && !pendingDockId}
        title="Scan Dock"
        placeholder="Scan dock ID (e.g. D01)"
        onSubmit={resolveScan}
        onClose={() => setScanDialogOpen(false)}
        disabled={submitting}
      />
      <Stack gap="1">
        <Heading size="2xl">Dock check-in</Heading>
        <Text color="fg.muted">
          Go to your dock and scan the dock ID to start your shift.
        </Text>
      </Stack>

      <Box bg="bg.panel" p="6" borderWidth="1px" borderRadius="xl">
        <Stack gap="4">
          {!scanDialogOpen && !pendingDockId && (
            <Button
              colorPalette="blue"
              onClick={() => setScanDialogOpen(true)}
            >
              Scan dock ID
            </Button>
          )}
          <Text fontSize="sm" color="fg.muted">
            Available docks:{' '}
            {docks.map((d) => d.id).join(', ') || 'none loaded'}
          </Text>
        </Stack>
      </Box>

      <OperatorConfirmDialog
        open={!!pendingDockId}
        title="Confirm check-in"
        description={`Check in to ${pendingDock?.name ?? pendingDockId}? The system will record that you are working at this dock.`}
        confirmLabel="Check in"
        confirmColorPalette="green"
        loading={submitting}
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          if (!submitting) {
            setPendingDockId(null)
            setScanDialogOpen(true)
          }
        }}
      />

      <OperatorAlertDialog
        open={!!alert}
        title={alert?.title ?? ''}
        description={alert?.description ?? ''}
        onClose={() => setAlert(null)}
      />
    </Stack>
  )
}
