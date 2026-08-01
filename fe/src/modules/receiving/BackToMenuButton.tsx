import { Button } from '@chakra-ui/react'
import { LuArrowLeft } from 'react-icons/lu'
import { Link } from 'react-router-dom'

export function BackToMenuButton() {
  return (
    <Button asChild variant="outline" size="sm" alignSelf="flex-start">
      <Link to="/receiving">
        <LuArrowLeft />
        Back to Receiving menu
      </Link>
    </Button>
  )
}
