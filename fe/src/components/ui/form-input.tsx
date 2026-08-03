import { Input, type InputProps } from '@chakra-ui/react'
import { FormField } from '@/components/ui/form-field'

interface FormInputProps extends InputProps {
  label: string
  hideLabel?: boolean
}

export function FormInput({ label, hideLabel, ...props }: FormInputProps) {
  return (
    <FormField label={label} hideLabel={hideLabel} required={props.required}>
      <Input {...props} />
    </FormField>
  )
}
