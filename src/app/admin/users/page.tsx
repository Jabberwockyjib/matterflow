import dynamic from 'next/dynamic'
import { getAllUsers } from '@/lib/data/actions'
import { InviteUserModal } from '@/components/admin/invite-user-modal'

// Lazy load heavy table component for better initial load
const UserTable = dynamic(
  () => import('@/components/admin/user-table').then(mod => ({ default: mod.UserTable })),
  {
    loading: () => (
      <div className="rounded-md border">
        <div className="h-12 animate-pulse bg-muted" />
        <div className="space-y-2 p-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    ),
  }
)

export const metadata = {
  title: 'User Management | MatterFlow™',
  description: 'Manage user accounts, roles, and permissions',
}

export default async function UsersPage() {
  const result = await getAllUsers()

  if (!result.success) {
    return (
      <div className="container mx-auto py-10">
        <div className="rounded-md bg-red-50 p-4 text-red-800">
          <h2 className="font-semibold">Error Loading Users</h2>
          <p className="text-sm">{result.error || 'Failed to load users'}</p>
        </div>
      </div>
    )
  }

  const users = result.data || []

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <InviteUserModal />
      </div>

      <UserTable users={users} />
    </div>
  )
}
