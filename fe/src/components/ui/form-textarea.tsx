import { Textarea, type TextareaProps } from '@chakra-ui/react'
import { FormField } from '@/components/ui/form-field'

interface FormTextareaProps extends TextareaProps {
  label: string
  hideLabel?: boolean
}

export function FormTextarea({ label, hideLabel, ...props }: FormTextareaProps) {
  return (
    <FormField label={label} hideLabel={hideLabel} required={props.required}>
      <Textarea {...props} />
    </FormField>
  )
}
