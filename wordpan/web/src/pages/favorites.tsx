import { useFavoriteWords } from '@/hooks/use-favorite-words'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WordCard } from '@/components/word-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function FavoritesPage() {
  const { favorites, loading, removeFavorite } = useFavoriteWords()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteWord = async (word: string) => {
    setDeleting(true)
    try {
      const success = await removeFavorite(word)
      if (success) {
        toast.success(`Removed "${word}" from favorites`)
        setDeleteConfirm(null)
      } else {
        toast.error('Failed to remove favorite')
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-orange-500" />
            Favorite Words
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your collection of favorite words. These words can be used to generate personalized
            phrases and learning materials.
          </p>
        </div>

        {favorites.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 space-y-4">
                <p className="text-lg font-medium">No favorite words yet</p>
                <p className="text-muted-foreground">
                  Visit the Random Phrase Generator and click the ❤️ icon to add words to your favorites
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {favorites.length} Word{favorites.length !== 1 ? 's' : ''}
              </CardTitle>
              <CardDescription>Click the heart icon to remove a word from your favorites</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {favorites.map((word) => (
                  <div key={word} className="relative group">
                    <WordCard
                      word={word}
                      isFavorite={true}
                      onToggleFavorite={handleDeleteWord}
                      variant="outlined"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove from Favorites?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove "{deleteConfirm}" from your favorites? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogContent className="flex gap-3 pt-6 border-0 bg-transparent">
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={() => deleteConfirm && handleDeleteWord(deleteConfirm)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Removing...' : 'Remove'}
              </AlertDialogAction>
            </AlertDialogContent>
          </AlertDialogContent>
        </AlertDialog>

        {/* Info Card */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                💡 <strong>Pro Tip:</strong> Build your favorite words collection by visiting the Random Phrase
                Generator and clicking the heart icon on interesting words.
              </p>
              <p>
                Once you have several favorite words saved, they can be combined to generate longer, more
                personalized phrases tailored to your interests!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
