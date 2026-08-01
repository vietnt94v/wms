import { useState } from 'react'
import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  NativeSelect,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { AppLink } from '@/components/ui/app-link'
import { toaster } from '@/components/ui/toaster'
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

  const schedulable = asns.filter((a) =>
    ['EXPECTED', 'SCHEDULED'].includes(a.status),
  )

  const [asnId, setAsnId] = useState(schedulable[0]?.id ?? '')
  const [dockId, setDockId] = useState(docks[0]?.id ?? 'D01')
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [gateDockId, setGateDockId] = useState(docks[0]?.id ?? 'D01')
  const [gateAptId, setGateAptId] = useState('')
  const [plateNo, setPlateNo] = useState('')

  const bookableDocks = docks.filter((d) => d.status !== 'BLOCKED')

  const handleSchedule = () => {
    const result = scheduleAppointment({
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

  const handleGateIn = () => {
    const result = gateIn({
      appointmentId: gateAptId || undefined,
      dockId: gateDockId,
      plateNo,
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
                            rejectArrival(session.id, 'Rejected at gate')
                            toaster.create({
                              title: 'Arrival rejected',
                              type: 'error',
                            })
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
                                approveUnknownArrival(session.id)
                                toaster.create({
                                  title: 'Supervisor approved',
                                  type: 'success',
                                })
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
                          startUnload(session.id)
                          toaster.create({
                            title: 'Unloading started',
                            type: 'success',
                          })
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
            <NativeSelect.Root>
              <NativeSelect.Field
                value={asnId}
                onChange={(e) => setAsnId(e.target.value)}
              >
                {schedulable.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} ({a.plateNo})
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={dockId}
                onChange={(e) => setDockId(e.target.value)}
              >
                {bookableDocks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.status}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
            <HStack>
              <Input
                type="datetime-local"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
              />
              <Input
                type="datetime-local"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
              />
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
            <NativeSelect.Root>
              <NativeSelect.Field
                value={gateDockId}
                onChange={(e) => setGateDockId(e.target.value)}
              >
                {docks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.status}
                  </option>
                ))}
              </NativeSelect.Field>
            </NativeSelect.Root>
            <NativeSelect.Root>
              <NativeSelect.Field
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
              </NativeSelect.Field>
            </NativeSelect.Root>
            <Input
              placeholder="Plate number on truck"
              value={plateNo}
              onChange={(e) => setPlateNo(e.target.value)}
            />
            <Button colorPalette="green" onClick={handleGateIn}>
              Gate-in
            </Button>
            <Text fontSize="sm" color="fg.muted">
              Wrong plate vs appointment → unknown arrival banner (reject or
              supervisor approve).
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
