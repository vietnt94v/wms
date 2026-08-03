import { useState } from 'react'
import { Box, Button, Flex, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { isAxiosError } from 'axios'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ColorModeButton } from '@/components/ui/color-mode'
import { OperatorAlertDialog } from '@/components/ui/operator-alert-dialog'
import { OperatorConfirmDialog } from '@/components/ui/operator-confirm-dialog'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/store/authStore'
import { useDockAssignmentStore } from '@/store/dockAssignmentStore'
import { useReceivingStore } from '@/store/receivingStore'

const navItems = [
  { to: '/inbound', label: 'Inbound Feed' },
  { to: '/receiving', label: 'Receiving' },
  { to: '/putaway', label: 'Putaway' },
  { to: '/picking', label: 'Picking' },
  { to: '/packing', label: 'Packing' },
]

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    const msg = data?.message
    if (Array.isArray(msg)) return msg.join(', ')
    if (typeof msg === 'string') return msg
  }
  if (error instanceof Error) return error.message
  return 'Check-out failed'
}

export function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const assignment = useDockAssignmentStore((s) => s.assignment)
  const checkOut = useDockAssignmentStore((s) => s.checkOut)
  const refreshCore = useReceivingStore((s) => s.refreshCore)

  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [alert, setAlert] = useState<{ title: string; description: string } | null>(
    null,
  )

  const showDockControls =
    location.pathname.startsWith('/receiving') &&
    !location.pathname.startsWith('/receiving/check-in') &&
    !!assignment

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const handleLeaveDock = async () => {
    setLeaving(true)
    try {
      await checkOut()
      setConfirmLeave(false)
      await refreshCore().catch(() => undefined)
      navigate('/receiving/check-in', { replace: true })
    } catch (error) {
      setConfirmLeave(false)
      setAlert({
        title: 'Cannot leave dock',
        description: errorMessage(error),
      })
    } finally {
      setLeaving(false)
    }
  }

  return (
    <Flex minH="100vh" bg="bg.subtle" color="fg">
      <Box
        as="aside"
        w="260px"
        bg="gray.900"
        color="white"
        p="6"
        flexShrink={0}
        className="dark"
      >
        <Heading size="md" mb="8" color="white">
          WMS
        </Heading>
        <Stack gap="1">
          {navItems.map((item) => (
            <Box
              key={item.to}
              asChild
              display="block"
              px="3"
              py="2.5"
              borderRadius="md"
              fontSize="sm"
              color="white"
              textDecoration="none"
              cursor="pointer"
              transition="background-color 0.15s ease"
              _hover={{ bg: 'whiteAlpha.200' }}
              css={{ '&.active': { bg: 'gray.700' } }}
            >
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {item.label}
              </NavLink>
            </Box>
          ))}
        </Stack>
      </Box>
      <Box as="main" flex="1" p="6" overflow="auto" bg="bg.subtle" color="fg">
        <HStack justify="space-between" mb="4">
          <Text fontSize="sm" color="fg.muted">
            Warehouse Management System
          </Text>
          <HStack gap="3">
            {showDockControls && assignment && (
              <HStack gap="2">
                <Text fontSize="sm" fontWeight="medium">
                  Dock {assignment.dockId}
                  {assignment.dock.name ? ` — ${assignment.dock.name}` : ''}
                </Text>
                <Button
                  size="xs"
                  colorPalette="orange"
                  variant="outline"
                  onClick={() => setConfirmLeave(true)}
                >
                  Leave dock
                </Button>
              </HStack>
            )}
            {user && (
              <Text fontSize="sm" color="fg.muted">
                {user.fullName} ({user.roles.join(', ')})
              </Text>
            )}
            <Button size="xs" variant="outline" onClick={() => void handleLogout()}>
              Logout
            </Button>
            <ColorModeButton />
          </HStack>
        </HStack>
        <Outlet />
      </Box>
      <Toaster />

      <OperatorConfirmDialog
        open={confirmLeave}
        title="Leave dock"
        description={`Check out from dock ${assignment?.dockId}? You will need to scan a dock again before continuing receiving work.`}
        confirmLabel="Leave dock"
        confirmColorPalette="orange"
        loading={leaving}
        onConfirm={() => void handleLeaveDock()}
        onCancel={() => {
          if (!leaving) setConfirmLeave(false)
        }}
      />

      <OperatorAlertDialog
        open={!!alert}
        title={alert?.title ?? ''}
        description={alert?.description ?? ''}
        onClose={() => setAlert(null)}
      />
    </Flex>
  )
}
