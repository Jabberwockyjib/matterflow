'use client'

import { useState } from 'react'
import { useModalState } from '@/hooks/use-modal-state'
import { UserPlus, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { inviteClient } from '@/lib/data/actions'

export function InviteClientModal() {
  const { open, setOpen, loading, setLoading, error, setError, reset } = useModalState()
  const [success, setSuccess] = useState<{ code: string; link: string } | null>(
    null
  )
  const [copied, setCopied] = useState(false)
  const [matterType, setMatterType] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const result = await inviteClient(formData)

    if (!result.ok) {
      setError(result.error || 'Failed to send invitation')
      setLoading(false)
      return
    }

    // Show success state with invite link
    setSuccess({
      code: result.inviteCode!,
      link: result.inviteLink!,
    })
    setLoading(false)
  }

  function handleClose() {
    setOpen(false)
    setError("")
    setSuccess(null)
    setCopied(false)
  }

  async function copyLink() {
    if (success?.link) {
      try {
        await navigator.clipboard.writeText(success.link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
        // Don't set copied state if copy failed
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) {
          // Reset all state when dialog closes
          setError("")
          setSuccess(null)
          setCopied(false)
          setMatterType('')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite New Client
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite New Client</DialogTitle>
          <DialogDescription>
            Send a personalized intake form to a prospective client
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="font-semibold text-green-900 mb-2">
                Invitation sent!
              </div>
              <div className="text-sm text-green-700">
                Email sent with intake form link. You can also share this link
                manually:
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input value={success.link} readOnly className="flex-1" />
              <Button
                onClick={copyLink}
                variant="outline"
                size="icon"
                title="Copy link"
                aria-label={copied ? "Link copied" : "Copy link to clipboard"}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="clientName">
                Client Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="clientName"
                name="clientName"
                required
                placeholder="John Doe"
                autoComplete="name"
              />
            </div>

            <div>
              <Label htmlFor="clientEmail">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="clientEmail"
                name="clientEmail"
                type="email"
                required
                placeholder="john@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="matterType">Matter Type</Label>
              <Select value={matterType} onValueChange={setMatterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select matter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contract Review">Contract Review</SelectItem>
                  <SelectItem value="Employment Agreement">
                    Employment Agreement
                  </SelectItem>
                  <SelectItem value="Policy Review">Policy Review</SelectItem>
                  <SelectItem value="Unknown">
                    Unknown / Not Yet Determined
                  </SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="matterType" value={matterType} />
            </div>

            <div>
              <Label htmlFor="notes">
                Personal Notes <span className="text-slate-500">(Optional)</span>
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Following up on our phone call about..."
                maxLength={500}
                rows={3}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
