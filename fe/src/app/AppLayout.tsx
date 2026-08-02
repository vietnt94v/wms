import { Box, Button, Flex, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ColorModeButton } from '@/components/ui/color-mode'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/store/authStore'

const navItems = [
  { to: '/inbound', label: 'Inbound Feed' },
  { to: '/receiving', label: 'Receiving' },
  { to: '/putaway', label: 'Putaway' },
  { to: '/picking', label: 'Picking' },
  { to: '/packing', label: 'Packing' },
]

export function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
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
    </Flex>
  )
}
