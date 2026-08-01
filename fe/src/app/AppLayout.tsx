import { Box, Flex, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { NavLink, Outlet } from 'react-router-dom'
import { ColorModeButton } from '@/components/ui/color-mode'
import { Toaster } from '@/components/ui/toaster'

const navItems = [
  { to: '/inbound', label: 'Inbound Feed (mock)' },
  { to: '/receiving', label: 'Receiving' },
  { to: '/putaway', label: 'Putaway' },
  { to: '/picking', label: 'Picking' },
  { to: '/packing', label: 'Packing' },
]

export function AppLayout() {
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
          <ColorModeButton />
        </HStack>
        <Outlet />
      </Box>
      <Toaster />
    </Flex>
  )
}
