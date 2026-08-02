import { useEffect } from 'react'
import { Box, Spinner, Text } from '@chakra-ui/react'
import { Outlet } from 'react-router-dom'
import { useReceivingStore } from '@/store/receivingStore'

export function DataLoader() {
  const loaded = useReceivingStore((s) => s.loaded)
  const loading = useReceivingStore((s) => s.loading)
  const loadAll = useReceivingStore((s) => s.loadAll)

  useEffect(() => {
    if (!loaded && !loading) {
      void loadAll()
    }
  }, [loaded, loading, loadAll])

  if (!loaded) {
    return (
      <Box
        minH="40vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap="3"
      >
        <Spinner size="sm" />
        <Text color="fg.muted">Loading warehouse data…</Text>
      </Box>
    )
  }

  return <Outlet />
}
