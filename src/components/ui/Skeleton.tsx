import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: boolean
}

export default function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = true
}: SkeletonProps) {
  const baseClasses = cn(
    'bg-gray-200 dark:bg-gray-700',
    animation && 'animate-shimmer',
    className
  )

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  }

  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined)
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant])}
      style={style}
      aria-label="読み込み中..."
      role="status"
    >
      <span className="sr-only">読み込み中...</span>
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6', className)}>
      <div className="mb-3 sm:mb-4">
        <Skeleton variant="text" height="1.5rem" className="mb-2 w-3/4" />
        <Skeleton variant="text" height="1rem" className="mb-1" />
        <Skeleton variant="text" height="1rem" className="w-5/6" />
      </div>
      <div className="space-y-1 mb-3 sm:mb-4">
        <Skeleton variant="text" height="0.875rem" className="w-1/2" />
        <Skeleton variant="text" height="0.875rem" className="w-1/2" />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width="4rem" height="2.5rem" />
        <Skeleton variant="rectangular" width="4rem" height="2.5rem" />
        <Skeleton variant="rectangular" width="4rem" height="2.5rem" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  )
}