import { Badge } from '@/components/ui/badge'

type Role = 'admin' | 'staff' | 'client'

interface RoleBadgeProps {
  role: Role
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const variants = {
    admin: 'bg-red-100 text-red-800 hover:bg-red-200',
    staff: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    client: 'bg-green-100 text-green-800 hover:bg-green-200',
  }

  const labels = {
    admin: 'Admin',
    staff: 'Staff',
    client: 'Client',
  }

  return (
    <Badge className={variants[role]} variant="default">
      {labels[role]}
    </Badge>
  )
}
