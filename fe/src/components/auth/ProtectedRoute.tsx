import { Navigate, Outlet } from 'react-router-dom'
import { Box, Spinner, Text } from '@chakra-ui/react'
import { useAuthStore } from '@/store/authStore'

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)

  if (!initialized) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap="3"
      >
        <Spinner size="sm" />
        <Text color="fg.muted">Loading…</Text>
      </Box>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
