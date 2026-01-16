'use client'

import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { GleanAgentCreator } from '@/components/model'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster position="bottom-right" richColors />
      <GleanAgentCreator />
    </ThemeProvider>
  )
}
