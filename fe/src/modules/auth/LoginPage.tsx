import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react'
import axios from 'axios'
import { FormInput } from '@/components/ui/form-input'
import { toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const [username, setUsername] = useState('operator')
  const [password, setPassword] = useState('Password123!')

  if (user) {
    return <Navigate to="/receiving" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(username.trim(), password)
      toaster.create({
        title: 'Signed in',
        description: 'Welcome back',
        type: 'success',
      })
      navigate('/receiving', { replace: true })
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string | undefined) ??
          'Invalid username or password'
        : 'Login failed'
      toaster.create({
        title: 'Login failed',
        description: Array.isArray(message) ? message.join(', ') : message,
        type: 'error',
      })
    }
  }

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="bg.subtle"
      p="6"
    >
      <Box
        as="form"
        onSubmit={handleSubmit}
        w="full"
        maxW="400px"
        bg="bg.panel"
        p="8"
        borderWidth="1px"
        borderRadius="xl"
        shadow="sm"
      >
        <Stack gap="6">
          <Box>
            <Heading size="xl">WMS Login</Heading>
            <Text color="fg.muted" mt="2">
              Sign in to continue to warehouse operations
            </Text>
          </Box>
          <FormInput
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="operator"
            required
          />
          <FormInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Button type="submit" colorPalette="blue" loading={loading} w="full">
            Sign in
          </Button>
          <Text fontSize="xs" color="fg.muted">
            Demo: operator / Password123!
          </Text>
        </Stack>
      </Box>
    </Box>
  )
}
