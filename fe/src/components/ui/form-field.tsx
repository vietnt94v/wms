import { Field } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  children: ReactNode
  required?: boolean
  hideLabel?: boolean
}

export function FormField({
  label,
  children,
  required,
  hideLabel = false,
}: FormFieldProps) {
  return (
    <Field.Root required={required}>
      <Field.Label
        srOnly={hideLabel}
        fontSize="sm"
        fontWeight="medium"
        mb={hideLabel ? undefined : '1'}
      >
        {label}
      </Field.Label>
      {children}
    </Field.Root>
  )
}
