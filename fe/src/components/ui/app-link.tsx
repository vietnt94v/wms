import { Link as ChakraLink, type LinkProps } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'

export interface AppLinkProps extends Omit<LinkProps, 'href'> {
  to: string
}

export function AppLink({ to, children, ...rest }: AppLinkProps) {
  return (
    <ChakraLink
      asChild
      colorPalette="blue"
      color="colorPalette.fg"
      fontWeight="medium"
      textDecoration="underline"
      textUnderlineOffset="3px"
      cursor="pointer"
      transition="color 0.15s ease"
      _hover={{ color: 'colorPalette.solid' }}
      {...rest}
    >
      <RouterLink to={to}>{children}</RouterLink>
    </ChakraLink>
  )
}
