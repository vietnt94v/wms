import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Box, Spinner, Text } from '@chakra-ui/react'
import { useDockAssignmentStore } from '@/store/dockAssignmentStore'

export function DockAssignmentGuard() {
  const location = useLocation()
  const assignment = useDockAssignmentStore((s) => s.assignment)
  const loaded = useDockAssignmentStore((s) => s.loaded)
  const loading = useDockAssignmentStore((s) => s.loading)
  const loadMyAssignment = useDockAssignmentStore((s) => s.loadMyAssignment)

  useEffect(() => {
    if (!loaded && !loading) {
      void loadMyAssignment()
    }
  }, [loaded, loading, loadMyAssignment])

  if (!loaded || loading) {
    return (
      <Box py="16" textAlign="center">
        <Spinner size="lg" />
        <Text mt="3" color="fg.muted">
          Checking dock assignment…
        </Text>
      </Box>
    )
  }

  if (!assignment) {
    return (
      <Navigate
        to="/receiving/check-in"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  return <Outlet />
}
