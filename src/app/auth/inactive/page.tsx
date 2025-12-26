import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function InactivePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border p-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Account Deactivated</h1>
          <p className="text-muted-foreground">
            Your account has been deactivated. Please contact an administrator if you believe this is an error.
          </p>
        </div>

        <Link href="/auth/sign-out">
          <Button className="w-full">Sign Out</Button>
        </Link>
      </div>
    </div>
  )
}
