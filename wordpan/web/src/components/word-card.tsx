import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface WordCardProps {
  word: string
  isFavorite?: boolean
  onToggleFavorite?: (word: string) => void
  variant?: 'default' | 'outlined'
  className?: string
}

export function WordCard({
  word,
  isFavorite = false,
  onToggleFavorite,
  variant = 'default',
  className,
}: WordCardProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-all hover:shadow-md',
        variant === 'default'
          ? 'border-gray-200 bg-white hover:bg-gray-50'
          : 'border-gray-300 bg-gray-50 hover:bg-white',
        className
      )}
    >
      <span className={cn('text-sm font-medium', isFavorite && 'text-orange-600')}>
        {word}
      </span>
      {onToggleFavorite && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onToggleFavorite(word)}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            className={cn('h-4 w-4 transition-colors', isFavorite && 'fill-current text-orange-500')}
          />
        </Button>
      )}
    </div>
  )
}
