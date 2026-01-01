'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import type { UserWithProfile } from '@/lib/data/actions'
import {
  updateUserRole,
  deactivateUser,
  reactivateUser,
  adminResetPassword,
} from '@/lib/data/actions'
import { RoleBadge } from '@/components/ui/role-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UserTableProps {
  users: UserWithProfile[]
  onUpdate?: () => void
}

export function UserTable({ users, onUpdate }: UserTableProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (action: () => Promise<any>, userId: string) => {
    setLoading(userId)
    try {
      const result = await action()
      if (result.success) {
        onUpdate?.()
      } else {
        alert(result.error || 'Action failed')
      }
    } catch (error) {
      alert('An unexpected error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'staff' | 'client') => {
    await handleAction(() => updateUserRole(userId, newRole), userId)
  }

  const handleToggleStatus = async (userId: string, currentStatus: 'active' | 'inactive') => {
    const action = currentStatus === 'active' ? deactivateUser : reactivateUser
    await handleAction(() => action(userId), userId)
  }

  const handleResetPassword = async (userId: string) => {
    if (confirm('Reset this user\'s password? They will receive an email with a new temporary password.')) {
      await handleAction(() => adminResetPassword(userId), userId)
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.userId}>
                <TableCell className="font-medium">{user.fullName || 'N/A'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <RoleBadge role={user.role} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.status} />
                </TableCell>
                <TableCell>
                  {user.lastLogin
                    ? format(new Date(user.lastLogin), 'MMM d, yyyy')
                    : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loading === user.userId}
                      >
                        {loading === user.userId ? 'Loading...' : 'Actions'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {user.role === 'client' && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${user.userId}`}>
                              View Client Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}

                      <DropdownMenuItem onClick={() => handleRoleChange(user.userId, 'admin')}>
                        Change to Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(user.userId, 'staff')}>
                        Change to Staff
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(user.userId, 'client')}>
                        Change to Client
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => handleResetPassword(user.userId)}>
                        Reset Password
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleToggleStatus(user.userId, user.status)}
                      >
                        {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
