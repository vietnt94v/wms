import { Button, Dialog, Portal, Text } from '@chakra-ui/react'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColorPalette?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function OperatorConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColorPalette = 'blue',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog.Root
      open={open}
      role="alertdialog"
      placement="center"
      closeOnEscape={false}
      closeOnInteractOutside={false}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>{description}</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button
                colorPalette={confirmColorPalette}
                onClick={onConfirm}
                loading={loading}
              >
                {confirmLabel}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
