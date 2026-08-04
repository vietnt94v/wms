import { Box, Spinner, Text } from '@chakra-ui/react'

export function QueryLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <Box
      minH="40vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap="3"
    >
      <Spinner size="sm" />
      <Text color="fg.muted">{label}</Text>
    </Box>
  )
}
