import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  Portal,
  Stack,
} from '@chakra-ui/react'
import { LuBarcode, LuCheck, LuX } from 'react-icons/lu'

interface Props {
  open: boolean
  title: string
  placeholder?: string
  submitLabel?: string
  loading?: boolean
  disabled?: boolean
  allowClose?: boolean
  onClose?: () => void
  onSubmit: (code: string) => void
}

export function BarcodeScanDialog({
  open,
  title,
  placeholder = 'Scan barcode',
  submitLabel = 'Submit',
  loading = false,
  disabled = false,
  allowClose = true,
  onClose,
  onSubmit,
}: Props) {
  const [code, setCode] = useState('')
  const [prevOpen, setPrevOpen] = useState(open)
  const inputRef = useRef<HTMLInputElement>(null)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setCode('')
  }

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [open])

  const handleClose = () => {
    setCode('')
    onClose?.()
  }

  const handleSubmit = () => {
    const trimmed = code.trim()
    if (!trimmed || disabled || loading) return
    onSubmit(trimmed)
    setCode('')
  }

  return (
    <Dialog.Root
      open={open}
      placement="center"
      closeOnEscape={allowClose}
      closeOnInteractOutside={false}
      onOpenChange={(e) => {
        if (!e.open && allowClose) handleClose()
      }}
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner p="4">
          <Dialog.Content maxW="md" overflow="hidden" p="0">
            <HStack
              bg="blue.800"
              color="white"
              px="4"
              py="3"
              justify="space-between"
            >
              <Dialog.Title fontSize="lg" fontWeight="semibold">
                {title}
              </Dialog.Title>
              {allowClose && onClose && (
                <IconButton
                  aria-label="Close"
                  variant="ghost"
                  size="sm"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  onClick={handleClose}
                >
                  <LuX />
                </IconButton>
              )}
            </HStack>

            <Box px="6" py="8">
              <Stack gap="6" align="center">
                <InputGroup
                  w="full"
                  endElement={
                    <Icon color="fg.muted" boxSize="5">
                      <LuBarcode />
                    </Icon>
                  }
                >
                  <Input
                    ref={inputRef}
                    size="lg"
                    fontSize="lg"
                    textAlign="center"
                    placeholder={placeholder}
                    value={code}
                    disabled={disabled || loading}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit()
                    }}
                  />
                </InputGroup>

                <Button
                  colorPalette="blue"
                  size="lg"
                  minW="160px"
                  loading={loading}
                  disabled={disabled || !code.trim()}
                  onClick={handleSubmit}
                >
                  <Icon mr="2">
                    <LuCheck />
                  </Icon>
                  {submitLabel}
                </Button>
              </Stack>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
