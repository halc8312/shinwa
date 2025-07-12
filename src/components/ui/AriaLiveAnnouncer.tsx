'use client'

import { useEffect, useRef } from 'react'

interface AriaLiveAnnouncerProps {
  message: string
  politeness?: 'polite' | 'assertive'
  clearAfter?: number
}

/**
 * Component that announces messages to screen readers using aria-live regions
 * Useful for dynamic content updates like progress, errors, and success messages
 */
export function AriaLiveAnnouncer({ 
  message, 
  politeness = 'polite',
  clearAfter = 5000 
}: AriaLiveAnnouncerProps) {
  const announcerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!message) return

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout to clear the message
    if (clearAfter > 0) {
      timeoutRef.current = setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = ''
        }
      }, clearAfter)
    }

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [message, clearAfter])

  return (
    <div
      ref={announcerRef}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

/**
 * Hook to use aria-live announcements imperatively
 */
export function useAriaAnnounce() {
  const announcePolite = (message: string) => {
    const announcer = document.createElement('div')
    announcer.setAttribute('role', 'status')
    announcer.setAttribute('aria-live', 'polite')
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = message
    
    document.body.appendChild(announcer)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 5000)
  }

  const announceAssertive = (message: string) => {
    const announcer = document.createElement('div')
    announcer.setAttribute('role', 'alert')
    announcer.setAttribute('aria-live', 'assertive')
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = message
    
    document.body.appendChild(announcer)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 5000)
  }

  return { announcePolite, announceAssertive }
}