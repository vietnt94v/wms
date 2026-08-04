import type { IconType } from 'react-icons'
import {
  LuBoxes,
  LuClipboardCheck,
  LuGauge,
  LuInbox,
  LuTriangleAlert,
  LuTruck,
  LuWarehouse,
} from 'react-icons/lu'
import { Badge, Box, Heading, HStack, Icon, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { QueryLoading } from '@/components/ui/query-loading'
import { usePutawayTasks } from '@/lib/query/putaway'
import {
  useAsns,
  useDiscrepancies,
  useDocks,
  useInventory,
  useSessions,
} from '@/lib/query/receiving'

type MenuItem = {
  to: string
  label: string
  description: string
  icon: IconType
  accent: string
  badge?: string
}

export function ReceivingHome() {
  const { data: asns = [], isLoading: asnsLoading } = useAsns()
  const { data: docks = [], isLoading: docksLoading } = useDocks()
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions()
  const { data: discrepancies = [], isLoading: discLoading } = useDiscrepancies()
  const { data: putawayTasks = [], isLoading: tasksLoading } = usePutawayTasks()
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory()

  if (
    asnsLoading ||
    docksLoading ||
    sessionsLoading ||
    discLoading ||
    tasksLoading ||
    inventoryLoading
  ) {
    return <QueryLoading />
  }

  const occupied = docks.filter((d) => d.status === 'OCCUPIED').length
  const pendingDisc = discrepancies.filter((d) => d.resolution === 'PENDING').length
  const qcPending = sessions.filter((s) => s.status === 'QC').length
  const openTasks = putawayTasks.filter((t) => t.status === 'PENDING').length

  const items: MenuItem[] = [
    {
      to: '/receiving/dashboard',
      label: 'Dashboard',
      description: 'KPI overview, ASN inbox and dock board',
      icon: LuGauge,
      accent: 'blue',
    },
    {
      to: '/receiving/asn',
      label: 'ASN Inbox',
      description: 'ASNs pushed from external systems',
      icon: LuInbox,
      accent: 'cyan',
      badge: `${asns.length} ASN`,
    },
    {
      to: '/receiving/docks',
      label: 'Docks',
      description: 'Dock scheduling and gate-in',
      icon: LuTruck,
      accent: 'purple',
      badge: `${occupied}/${docks.length} occupied`,
    },
    {
      to: '/receiving/qc',
      label: 'QC',
      description: 'Quality check for receiving sessions',
      icon: LuClipboardCheck,
      accent: 'green',
      badge: `${qcPending} pending QC`,
    },
    {
      to: '/receiving/discrepancies',
      label: 'Discrepancies',
      description: 'Resolve over, short and damaged quantities',
      icon: LuTriangleAlert,
      accent: 'orange',
      badge: `${pendingDisc} pending`,
    },
    {
      to: '/putaway',
      label: 'Putaway',
      description: 'Load handling units onto the conveyor',
      icon: LuBoxes,
      accent: 'teal',
      badge: `${openTasks} open`,
    },
    {
      to: '/receiving/inventory',
      label: 'Inventory',
      description: 'Stock updated after receiving',
      icon: LuWarehouse,
      accent: 'gray',
      badge: `${inventory.length} SKUs`,
    },
  ]

  return (
    <Stack gap="6">
      <Stack gap="1">
        <Heading size="2xl">Receiving</Heading>
        <Text color="fg.muted">Choose a work area to get started.</Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="5">
        {items.map((item) => (
          <MenuCard key={item.to} item={item} />
        ))}
      </SimpleGrid>
    </Stack>
  )
}

function MenuCard({ item }: { item: MenuItem }) {
  return (
    <Box
      asChild
      bg="bg.panel"
      borderWidth="1px"
      borderRadius="xl"
      p="6"
      minH="150px"
      textDecoration="none"
      transition="all 0.15s ease"
      _hover={{
        borderColor: `${item.accent}.solid`,
        transform: 'translateY(-2px)',
        boxShadow: 'md',
      }}
      _focusVisible={{ outline: '2px solid', outlineColor: `${item.accent}.solid` }}
    >
      <Link to={item.to}>
        <Stack gap="4" h="full">
          <HStack justify="space-between" align="start">
            <Icon
              size="lg"
              p="2"
              boxSize="10"
              borderRadius="lg"
              bg={`${item.accent}.subtle`}
              color={`${item.accent}.fg`}
            >
              <item.icon />
            </Icon>
            {item.badge ? (
              <Badge colorPalette={item.accent} variant="subtle">
                {item.badge}
              </Badge>
            ) : null}
          </HStack>
          <Stack gap="1">
            <Heading size="md">{item.label}</Heading>
            <Text fontSize="sm" color="fg.muted">
              {item.description}
            </Text>
          </Stack>
        </Stack>
      </Link>
    </Box>
  )
}
