import { Button, HStack, Input } from '@chakra-ui/react'
import { FormField } from '@/components/ui/form-field'

interface Props {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  disabled?: boolean
  hideLabel?: boolean
}

export function QuantityStepper({
  label,
  value,
  onChange,
  min = 1,
  disabled = false,
  hideLabel = false,
}: Props) {
  const clamp = (n: number) => Math.max(min, Math.floor(n) || min)

  return (
    <FormField label={label} hideLabel={hideLabel}>
      <HStack gap="1" maxW="220px">
      <Button
        size="sm"
        colorPalette="blue"
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
        colorPalette="blue"
        disabled={disabled}
        onClick={() => onChange(clamp(value + 1))}
        aria-label="Increase quantity"
      >
        +
      </Button>
      </HStack>
    </FormField>
  )
}
