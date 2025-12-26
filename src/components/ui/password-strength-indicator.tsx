'use client'

import { useMemo } from 'react'

interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-gray-200' }

    let score = 0

    // Length check
    if (password.length >= 8) score++
    if (password.length >= 12) score++

    // Character variety checks
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++

    // Determine strength level
    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' }
    if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500' }
    return { score, label: 'Strong', color: 'bg-green-500' }
  }, [password])

  const percentage = (strength.score / 6) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Password strength:</span>
        {password && <span className="font-medium">{strength.label}</span>}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full transition-all duration-300 ${strength.color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
