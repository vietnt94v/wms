import { Button, Dialog, Portal, Text } from '@chakra-ui/react'

interface Props {
  open: boolean
  title: string
  description: string
  onClose: () => void
}

export function OperatorAlertDialog({
  open,
  title,
  description,
  onClose,
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
              <Button colorPalette="blue" onClick={onClose}>
                OK
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
