'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SelectionTooltipProps {
  containerRef: React.RefObject<HTMLElement | null>
  onAskAboutThis: (selectedText: string) => void
}

export function SelectionTooltip({ containerRef, onAskAboutThis }: SelectionTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const tooltipRef = useRef<HTMLDivElement>(null)

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection()
    if (
      !selection ||
      selection.isCollapsed ||
      !selection.toString().trim() ||
      !containerRef.current
    ) {
      setPosition(null)
      setSelectedText('')
      return
    }

    // Verify the selection is within our container
    const range = selection.getRangeAt(0)
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setPosition(null)
      setSelectedText('')
      return
    }

    const text = selection.toString().trim()
    if (!text) {
      setPosition(null)
      return
    }

    setSelectedText(text)

    // Position the tooltip near the selection
    const rect = range.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    setPosition({
      top: rect.top - containerRect.top - 36,
      left: rect.left - containerRect.left + rect.width / 2,
    })
  }, [containerRef])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  }, [handleSelectionChange])

  // Dismiss on mousedown outside the tooltip
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        // Don't dismiss immediately — let the selection change handler handle it
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  if (!position || !selectedText) return null

  return (
    <div
      ref={tooltipRef}
      className="absolute z-50 animate-in fade-in-0 zoom-in-95 duration-100"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <Button
        size="sm"
        variant="secondary"
        className="h-7 gap-1.5 rounded-full px-3 shadow-md border text-xs font-medium"
        onMouseDown={(e) => {
          e.preventDefault() // Prevent losing selection
          onAskAboutThis(selectedText)
        }}
      >
        <GitBranch className="h-3 w-3" />
        Ask About This
      </Button>
    </div>
  )
}
