import { Button, HStack, Input } from '@chakra-ui/react'

interface Props {
  value: number
  onChange: (value: number) => void
  min?: number
  disabled?: boolean
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  disabled = false,
}: Props) {
  const clamp = (n: number) => Math.max(min, Math.floor(n) || min)

  return (
    <HStack gap="1" maxW="220px">
      <Button
        size="sm"
        variant="outline"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        aria-label="Decrease quantity"
      >
        -
      </Button>
      <Input
        type="number"
        size="sm"
        textAlign="center"
        min={min}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (Number.isNaN(next)) {
            onChange(min)
            return
          }
          onChange(clamp(next))
        }}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => onChange(clamp(value + 1))}
        aria-label="Increase quantity"
      >
        +
      </Button>
    </HStack>
  )
}
