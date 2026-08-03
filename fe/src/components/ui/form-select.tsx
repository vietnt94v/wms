import { NativeSelect } from '@chakra-ui/react'
import type { ChangeEventHandler, ReactNode } from 'react'
import { FormField } from '@/components/ui/form-field'

interface FormSelectProps {
  label: string
  value: string
  onChange: ChangeEventHandler<HTMLSelectElement>
  children: ReactNode
  disabled?: boolean
  hideLabel?: boolean
}

export function FormSelect({
  label,
  value,
  onChange,
  children,
  disabled,
  hideLabel,
}: FormSelectProps) {
  return (
    <FormField label={label} hideLabel={hideLabel}>
      <NativeSelect.Root disabled={disabled}>
        <NativeSelect.Field value={value} onChange={onChange}>
          {children}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </FormField>
  )
}
