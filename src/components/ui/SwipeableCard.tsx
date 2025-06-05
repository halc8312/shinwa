'use client'

import { useState, useRef, ReactNode } from 'react'

interface SwipeableCardProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  className?: string
}

export default function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  className = ''
}: SwipeableCardProps) {
  const [startX, setStartX] = useState<number | null>(null)
  const [currentX, setCurrentX] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startX) return
    setCurrentX(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!startX || !currentX) {
      setIsDragging(false)
      return
    }

    const diff = currentX - startX
    const threshold = 100 // スワイプと判定する最小距離

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && onSwipeRight) {
        onSwipeRight()
      } else if (diff < 0 && onSwipeLeft) {
        onSwipeLeft()
      }
    }

    // リセット
    setStartX(null)
    setCurrentX(null)
    setIsDragging(false)
  }

  const getTransform = () => {
    if (!isDragging || !startX || !currentX) return 'translateX(0)'
    const diff = currentX - startX
    return `translateX(${diff * 0.3}px)` // 移動量を30%に制限
  }

  const getOpacity = () => {
    if (!isDragging || !startX || !currentX) return 1
    const diff = Math.abs(currentX - startX)
    return Math.max(0.5, 1 - diff / 500)
  }

  return (
    <div
      ref={cardRef}
      className={`transition-all ${isDragging ? '' : 'duration-300'} ${className}`}
      style={{
        transform: getTransform(),
        opacity: getOpacity(),
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}