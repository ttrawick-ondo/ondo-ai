'use client'

import { useState } from 'react'
import { Shield, Smartphone } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Enable2FADialogProps {
  trigger?: React.ReactNode
}

export function Enable2FADialog({ trigger }: Enable2FADialogProps) {
  const [open, setOpen] = useState(false)

  const handleEnable = () => {
    // TODO: Implement actual 2FA setup flow
    // This would typically:
    // 1. Generate a TOTP secret
    // 2. Display a QR code
    // 3. Verify the user's first code
    // 4. Store backup codes
    toast.info('Two-factor authentication setup is coming soon!')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Enable</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Add an extra layer of security to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Secure your account</h3>
              <p className="text-sm text-muted-foreground">
                Two-factor authentication adds an extra layer of security by requiring
                a code from your phone in addition to your password.
              </p>
            </div>
            <div className="bg-muted rounded-lg p-4 w-full">
              <h4 className="font-medium text-sm mb-2">You&apos;ll need:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• An authenticator app (Google Authenticator, Authy, etc.)</li>
                <li>• Access to your phone</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleEnable}>
            Set Up 2FA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
