import { useState } from 'react'
import {
  Box,
  Button,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { AppLink } from '@/components/ui/app-link'
import { FormInput } from '@/components/ui/form-input'
import { FormSelect } from '@/components/ui/form-select'
import { toaster } from '@/components/ui/toaster'
import { useDockAssignmentStore } from '@/store/dockAssignmentStore'
import { useReceivingStore } from '@/store/receivingStore'
import { BackToMenuButton } from './BackToMenuButton'
import { StatusBadge } from './StatusBadge'

export function DocksPage() {
  const navigate = useNavigate()
  const docks = useReceivingStore((s) => s.docks)
  const asns = useReceivingStore((s) => s.asns)
  const appointments = useReceivingStore((s) => s.appointments)
  const sessions = useReceivingStore((s) => s.sessions)
  const scheduleAppointment = useReceivingStore((s) => s.scheduleAppointment)
  const gateIn = useReceivingStore((s) => s.gateIn)
  const rejectArrival = useReceivingStore((s) => s.rejectArrival)
  const approveUnknownArrival = useReceivingStore((s) => s.approveUnknownArrival)
  const startUnload = useReceivingStore((s) => s.startUnload)
  const myDockId = useDockAssignmentStore((s) => s.assignment?.dockId)

  const schedulable = asns.filter((a) =>
    ['EXPECTED', 'SCHEDULED'].includes(a.status),
  )
  const gateInAsns = asns.filter((a) =>
    ['EXPECTED', 'SCHEDULED'].includes(a.status),
  )

  const [asnId, setAsnId] = useState(schedulable[0]?.id ?? '')
  const [dockId, setDockId] = useState(docks[0]?.id ?? 'D01')
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [gateDockId, setGateDockId] = useState(myDockId ?? docks[0]?.id ?? 'D01')
  const [gateAptId, setGateAptId] = useState('')
  const [gateAsnId, setGateAsnId] = useState(gateInAsns[0]?.id ?? '')

  const bookableDocks = docks.filter((d) => d.status !== 'BLOCKED')

  const handleSchedule = async () => {
    const result = await scheduleAppointment({
      asnId,
      dockId,
      windowStart: windowStart || new Date().toISOString(),
      windowEnd: windowEnd || new Date(Date.now() + 2 * 3600_000).toISOString(),
    })
    toaster.create({
      title: result.ok ? 'Scheduled' : 'Failed',
      description: result.message,
      type: result.ok ? 'success' : 'error',
    })
  }

  const handleGateIn = async () => {
    const result = await gateIn({
      appointmentId: gateAptId || undefined,
      asnId: gateAptId ? undefined : gateAsnId || undefined,
      dockId: gateDockId,
    })
    toaster.create({
      title: result.unknownArrival ? 'Unknown arrival' : result.ok ? 'Gate-in' : 'Failed',
      description: result.message,
      type: result.unknownArrival ? 'warning' : result.ok ? 'success' : 'error',
    })
    if (result.sessionId) {
      navigate(`/receiving/sessions/${result.sessionId}`)
    }
  }

  return (
    <Stack gap="4">
      <BackToMenuButton />
      <Heading size="xl">Dock Scheduling & Gate-in</Heading>

      <SimpleGrid columns={{ base: 1, md: 5 }} gap="3">
        {docks.map((dock) => {
          const session = sessions.find(
            (s) =>
              s.dockId === dock.id && !['COMPLETED', 'REJECTED'].includes(s.status),
          )
          return (
            <Box
              key={dock.id}
              bg="bg.panel"
              p="4"
              borderWidth="1px"
              borderRadius="lg"
            >
              <Text fontWeight="bold">{dock.name}</Text>
              <StatusBadge status={dock.status} />
              {dock.operator && (
                <Text fontSize="sm" mt="1" color="fg.muted">
                  Operator: {dock.operator.fullName}
                </Text>
              )}
              {session && (
                <Stack mt="2" gap="1">
                  <Text fontSize="sm">
                    Session:{' '}
                    <AppLink to={`/receiving/sessions/${session.id}`}>
                      {session.id.slice(0, 12)}…
                    </AppLink>
                  </Text>
                  <StatusBadge status={session.status} />
                  {(session.asnId === 'UNKNOWN' ||
                    (session.unknownArrival && !session.supervisorApproved)) && (
                    <Box bg="bg.error" p="2" borderRadius="md" mt="1">
                      <Text fontSize="sm" color="fg.error" fontWeight="bold">
                        {session.asnId === 'UNKNOWN'
                          ? 'No ASN linked'
                          : 'Unscheduled / Unknown arrival'}
                      </Text>
                      <HStack mt="2">
                        <Button
                          size="xs"
                          colorPalette="red"
                          onClick={() => {
                            void rejectArrival(session.id, 'Rejected at gate').then(
                              () =>
                                toaster.create({
                                  title: 'Arrival rejected',
                                  type: 'error',
                                }),
                            )
                          }}
                        >
                          Reject
                        </Button>
                        {session.asnId !== 'UNKNOWN' &&
                          session.unknownArrival &&
                          !session.supervisorApproved && (
                            <Button
                              size="xs"
                              colorPalette="orange"
                              onClick={() => {
                                void approveUnknownArrival(session.id).then(() =>
                                  toaster.create({
                                    title: 'Supervisor approved',
                                    type: 'success',
                                  }),
                                )
                              }}
                            >
                              Supervisor approve
                            </Button>
                          )}
                      </HStack>
                    </Box>
                  )}
                  {session.status === 'GATE_IN' &&
                    session.asnId !== 'UNKNOWN' &&
                    (!session.unknownArrival || session.supervisorApproved) && (
                      <Button
                        size="xs"
                        mt="2"
                        onClick={() => {
                          void startUnload(session.id).then(() =>
                            toaster.create({
                              title: 'Unloading started',
                              type: 'success',
                            }),
                          )
                        }}
                      >
                        Start unloading
                      </Button>
                    )}
                </Stack>
              )}
            </Box>
          )
        })}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
        <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
          <Heading size="md" mb="3">
            Book appointment
          </Heading>
          <Stack gap="3">
            <FormSelect
              label="ASN"
              value={asnId}
              onChange={(e) => setAsnId(e.target.value)}
            >
              {schedulable.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} ({a.plateNo})
                </option>
              ))}
            </FormSelect>
            <FormSelect
              label="Dock"
              value={dockId}
              onChange={(e) => setDockId(e.target.value)}
            >
              {bookableDocks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.status}
                  {d.operator ? ` · ${d.operator.fullName}` : ''}
                </option>
              ))}
            </FormSelect>
            <HStack align="flex-end">
              <Box flex="1">
                <FormInput
                  label="Window start"
                  type="datetime-local"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                />
              </Box>
              <Box flex="1">
                <FormInput
                  label="Window end"
                  type="datetime-local"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                />
              </Box>
            </HStack>
            <Button colorPalette="blue" onClick={handleSchedule}>
              Schedule
            </Button>
          </Stack>
        </Box>

        <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
          <Heading size="md" mb="3">
            Gate-in
          </Heading>
          <Stack gap="3">
            <FormSelect
              label="Dock"
              value={gateDockId}
              onChange={(e) => setGateDockId(e.target.value)}
            >
              {docks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.status}
                  {d.id === myDockId ? ' (your dock)' : ''}
                  {d.operator ? ` · ${d.operator.fullName}` : ''}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              label="Appointment"
              value={gateAptId}
              onChange={(e) => setGateAptId(e.target.value)}
            >
              <option value="">No appointment / walk-in</option>
              {appointments
                .filter((a) => a.status === 'BOOKED')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} → {a.asnId} @ {a.dockId}
                  </option>
                ))}
            </FormSelect>
            {!gateAptId && (
              <FormSelect
                label="ASN"
                value={gateAsnId}
                onChange={(e) => setGateAsnId(e.target.value)}
              >
                <option value="">Select ASN</option>
                {gateInAsns.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} ({a.plateNo})
                  </option>
                ))}
              </FormSelect>
            )}
            <Button colorPalette="green" onClick={handleGateIn}>
              Gate-in
            </Button>
            <Text fontSize="sm" color="fg.muted">
              Plate is taken from the ASN. Gate-in dock must match your checked-in
              dock.
            </Text>
          </Stack>
        </Box>
      </SimpleGrid>

      <Box bg="bg.panel" p="4" borderWidth="1px" borderRadius="lg">
        <Heading size="md" mb="3">
          Appointments
        </Heading>
        <Table.Root size="sm" interactive>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>ID</Table.ColumnHeader>
              <Table.ColumnHeader>ASN</Table.ColumnHeader>
              <Table.ColumnHeader>Dock</Table.ColumnHeader>
              <Table.ColumnHeader>Window</Table.ColumnHeader>
              <Table.ColumnHeader>Status</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {appointments.map((a) => (
              <Table.Row key={a.id}>
                <Table.Cell>{a.id}</Table.Cell>
                <Table.Cell>{a.asnId}</Table.Cell>
                <Table.Cell>{a.dockId}</Table.Cell>
                <Table.Cell>
                  {a.windowStart} → {a.windowEnd}
                </Table.Cell>
                <Table.Cell>
                  <StatusBadge status={a.status} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Stack>
  )
}
