import { useState } from 'react'
import {
  Box,
  Button,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react'
import { isAxiosError } from 'axios'
import { Navigate, useNavigate } from 'react-router-dom'
import { FormInput } from '@/components/ui/form-input'
import { OperatorAlertDialog } from '@/components/ui/operator-alert-dialog'
import { OperatorConfirmDialog } from '@/components/ui/operator-confirm-dialog'
import { useDockAssignmentStore } from '@/store/dockAssignmentStore'
import { useReceivingStore } from '@/store/receivingStore'

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
  const docks = useReceivingStore((s) => s.docks)
  const refreshCore = useReceivingStore((s) => s.refreshCore)
  const assignment = useDockAssignmentStore((s) => s.assignment)
  const loaded = useDockAssignmentStore((s) => s.loaded)
  const checkIn = useDockAssignmentStore((s) => s.checkIn)

  const [code, setCode] = useState('')
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

  const resolveScan = () => {
    const dockId = code.trim().toUpperCase()
    if (!dockId) return
    const dock = docks.find((d) => d.id.toUpperCase() === dockId)
    if (!dock) {
      setAlert({
        title: 'Dock not found',
        description: `No dock matches "${dockId}". Scan a valid dock ID (e.g. D01).`,
      })
      return
    }
    setPendingDockId(dock.id)
  }

  const handleConfirm = async () => {
    if (!pendingDockId) return
    setSubmitting(true)
    try {
      await checkIn(pendingDockId)
      await refreshCore().catch(() => undefined)
      setPendingDockId(null)
      setCode('')
      navigate('/receiving', { replace: true })
    } catch (error) {
      setPendingDockId(null)
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
      <Stack gap="1">
        <Heading size="2xl">Dock check-in</Heading>
        <Text color="fg.muted">
          Go to your dock and scan the dock ID to start your shift.
        </Text>
      </Stack>

      <Box bg="bg.panel" p="6" borderWidth="1px" borderRadius="xl">
        <Stack gap="4">
          <FormInput
            label="Dock ID"
            autoFocus
            size="lg"
            placeholder="Scan dock ID (e.g. D01)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') resolveScan()
            }}
            disabled={!!pendingDockId || submitting}
          />
          <HStack>
            <Button
              colorPalette="blue"
              flex="1"
              onClick={resolveScan}
              disabled={!code.trim() || !!pendingDockId || submitting}
            >
              Scan
            </Button>
          </HStack>
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
          if (!submitting) setPendingDockId(null)
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
