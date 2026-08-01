import { HStack, Link } from '@chakra-ui/react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/receiving', label: 'Dashboard', end: true },
  { to: '/receiving/asn', label: 'ASN Inbox' },
  { to: '/receiving/docks', label: 'Docks' },
  { to: '/receiving/qc', label: 'QC' },
  { to: '/receiving/discrepancies', label: 'Discrepancies' },
  { to: '/receiving/putaway-tasks', label: 'Putaway Tasks' },
  { to: '/receiving/inventory', label: 'Inventory' },
]

export function ReceivingNav() {
  return (
    <HStack gap="3" mb="6" flexWrap="wrap">
      {links.map((link) => (
        <Link asChild key={link.to} fontSize="sm" colorPalette="blue">
          <NavLink
            to={link.to}
            end={link.end}
            style={({ isActive }) => ({
              fontWeight: isActive ? 700 : 400,
              textDecoration: isActive ? 'underline' : 'none',
            })}
          >
            {link.label}
          </NavLink>
        </Link>
      ))}
    </HStack>
  )
}
