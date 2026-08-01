import { Table } from '@chakra-ui/react'
import type { ComponentProps } from 'react'

export interface ClickableTableRowProps extends ComponentProps<typeof Table.Row> {
  onActivate: () => void
}

export function ClickableTableRow({
  onActivate,
  children,
  ...rest
}: ClickableTableRowProps) {
  return (
    <Table.Row
      tabIndex={0}
      cursor="pointer"
      transition="background-color 0.15s ease, box-shadow 0.15s ease"
      _hover={{
        bg: 'bg.emphasized',
        boxShadow: 'inset 3px 0 0 var(--chakra-colors-blue-solid)',
      }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'blue.solid',
        outlineOffset: '-2px',
      }}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onActivate()
        }
      }}
      {...rest}
    >
      {children}
    </Table.Row>
  )
}
