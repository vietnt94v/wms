import { Button, HStack, Input, Stack, Text } from '@chakra-ui/react'
import {
  RECEIPT_VARIANCE_REASONS,
  type ReceiptVarianceReasonId,
} from '@/lib/domain/receiving'

interface Props {
  value: ReceiptVarianceReasonId | ''
  onChange: (value: ReceiptVarianceReasonId) => void
  otherText: string
  onOtherTextChange: (text: string) => void
  disabled?: boolean
}

export function VarianceReasonPicker({
  value,
  onChange,
  otherText,
  onOtherTextChange,
  disabled = false,
}: Props) {
  return (
    <Stack gap="2">
      <Text fontSize="sm" color="fg.warning" fontWeight="medium">
        Quantity will not match expected — select a reason
      </Text>
      <HStack gap="2" flexWrap="wrap">
        {RECEIPT_VARIANCE_REASONS.map((reason) => {
          const selected = value === reason.id
          return (
            <Button
              key={reason.id}
              size="sm"
              variant={selected ? 'solid' : 'outline'}
              colorPalette={selected ? 'orange' : 'gray'}
              disabled={disabled}
              onClick={() => onChange(reason.id)}
            >
              {reason.id === 'OTHER' ? 'Other...' : reason.label}
            </Button>
          )
        })}
      </HStack>
      {value === 'OTHER' && (
        <Input
          placeholder="Describe the reason"
          value={otherText}
          disabled={disabled}
          onChange={(e) => onOtherTextChange(e.target.value)}
        />
      )}
    </Stack>
  )
}
