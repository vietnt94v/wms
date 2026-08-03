import {
  Box,
  Button,
  Heading,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppLink } from '@/components/ui/app-link'
import { toaster } from '@/components/ui/toaster'
import { canFinishReceiving } from '@/lib/domain/receiving'
import { useReceivingStore } from '@/store/receivingStore'
import { BackToMenuButton } from './BackToMenuButton'
import { ScanWorkspace } from './ScanWorkspace'
import { StatusBadge } from './StatusBadge'

export function SessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const session = useReceivingStore((s) => s.sessions.find((x) => x.id === id))
  const asn = useReceivingStore((s) =>
    session ? s.asns.find((a) => a.id === session.asnId) : undefined,
  )
  const startUnload = useReceivingStore((s) => s.startUnload)
  const startReceiving = useReceivingStore((s) => s.startReceiving)
  const finishReceiving = useReceivingStore((s) => s.finishReceiving)
  const rejectArrival = useReceivingStore((s) => s.rejectArrival)
  const approveUnknownArrival = useReceivingStore((s) => s.approveUnknownArrival)

  if (!session) {
    return (
      <Stack>
        <BackToMenuButton />
        <Text>Session not found</Text>
      </Stack>
    )
  }

  const hasAsn = session.asnId !== 'UNKNOWN' && !!asn
  const needsSupervisor =
    !!session.unknownArrival && !session.supervisorApproved
  const canOperate = hasAsn && !needsSupervisor
  const showRejectUnknown = !hasAsn || needsSupervisor
  const finishGate =
    session.status === 'RECEIVING' ? canFinishReceiving(session) : null

  return (
    <Stack gap="4">
      <BackToMenuButton />
      <Heading size="xl">Receiving session</Heading>

      <HStack gap="4" flexWrap="wrap">
        <Meta label="Session" value={session.id} />
        <Meta label="ASN" value={session.asnId} />
        <Meta label="Dock" value={session.dockId} />
        <Meta label="Mode" value={session.mode} />
        <Meta label="Plate (ASN)" value={session.plateNoEntered ?? '-'} />
        <StatusBadge status={session.status} />
      </HStack>

      {showRejectUnknown && (
        <Box bg="bg.error" borderWidth="1px" borderColor="red.emphasized" p="4" borderRadius="lg">
          <Text fontWeight="bold" color="fg.error">
            {!hasAsn
              ? 'No ASN linked'
              : 'Unscheduled / Unknown arrival'}
          </Text>
          <Text mt="1" fontSize="sm">
            {!hasAsn
              ? 'This session has no ASN. Reject the arrival and gate-in again with a matching appointment/ASN. Supervisor approve alone cannot unlock scanning without an ASN.'
              : 'Unscheduled or unknown arrival. Reject delivery or request supervisor exception.'}
          </Text>
          <HStack mt="3">
            <Button
              colorPalette="red"
              onClick={() => {
                void rejectArrival(session.id, 'Rejected unknown truck').then(
                  () => {
                    toaster.create({ title: 'Arrival rejected', type: 'error' })
                    navigate('/receiving/docks')
                  },
                )
              }}
            >
              Reject truck
            </Button>
            {needsSupervisor && hasAsn && (
              <Button
                colorPalette="orange"
                onClick={() => {
                  void approveUnknownArrival(session.id).then(() =>
                    toaster.create({
                      title: 'Exception approved',
                      type: 'success',
                    }),
                  )
                }}
              >
                Supervisor approve exception
              </Button>
            )}
          </HStack>
        </Box>
      )}

      <HStack gap="2" flexWrap="wrap">
        {session.status === 'GATE_IN' && canOperate && (
          <Button
            onClick={() => {
              void startUnload(session.id).then(() =>
                toaster.create({ title: 'Unloading', type: 'success' }),
              )
            }}
          >
            Start unloading
          </Button>
        )}
        {session.status === 'UNLOADING' && (
          <Button
            colorPalette="blue"
            onClick={() => {
              void startReceiving(session.id).then(() =>
                toaster.create({ title: 'Receiving started', type: 'success' }),
              )
            }}
          >
            Start check-in / scan
          </Button>
        )}
        {session.status === 'RECEIVING' && (
          <Button
            colorPalette="green"
            disabled={!finishGate?.ok}
            onClick={() => {
              void finishReceiving(session.id).then((result) => {
                if (!result.ok) {
                  toaster.create({
                    title: 'Cannot close receiving',
                    description: result.message,
                    type: 'error',
                  })
                  return
                }
                toaster.create({
                  title: 'Moved to QC',
                  description: result.message,
                  type: 'success',
                })
                navigate('/receiving/qc')
              })
            }}
          >
            Finish receiving → QC
          </Button>
        )}
        {['QC', 'DISCREPANCY', 'PUTAWAY'].includes(session.status) && (
          <Text fontSize="sm">
            Continue at{' '}
            <AppLink to="/receiving/qc">QC</AppLink> /{' '}
            <AppLink to="/receiving/discrepancies">Discrepancies</AppLink> /{' '}
            <AppLink to="/receiving/putaway-tasks">Putaway</AppLink>
          </Text>
        )}
      </HStack>

      {session.status === 'RECEIVING' && finishGate && !finishGate.ok && (
        <Text fontSize="sm" color="fg.muted">
          {finishGate.message}
        </Text>
      )}

      {session.status === 'RECEIVING' && asn && (
        <ScanWorkspace session={session} asn={asn} />
      )}
    </Stack>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Box bg="bg.panel" px="3" py="2" borderWidth="1px" borderRadius="md">
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="medium">
        {value}
      </Text>
    </Box>
  )
}
