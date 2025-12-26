import { Badge } from '@/components/ui/badge'

type Status = 'active' | 'inactive'

interface StatusBadgeProps {
  status: Status
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    active: 'bg-green-100 text-green-800 hover:bg-green-200',
    inactive: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  }

  const labels = {
    active: 'Active',
    inactive: 'Inactive',
  }

  return (
    <Badge className={variants[status]} variant="default">
      {labels[status]}
    </Badge>
  )
}
