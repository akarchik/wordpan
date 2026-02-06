import { useEffect, useState } from 'react'
import { useRandomPhrase } from '@/hooks/use-random-phrase'
import { useFlashcards } from '@/hooks/use-flashcards'
import { useFavoriteWords } from '@/hooks/use-favorite-words'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { WordCard } from '@/components/word-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Zap } from 'lucide-react'
import { toast } from 'sonner'

export default function RandomPhrasePage() {
  const { phrase, words, loading, error, generatePhrase } = useRandomPhrase()
  const { decks, addCard } = useFlashcards()
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavoriteWords()
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [savingCard, setSavingCard] = useState(false)
  const [savingWords, setSavingWords] = useState(false)

  // Generate initial phrase on component mount
  useEffect(() => {
    generatePhrase()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSavePhraseAsCard = async () => {
    if (!selectedDeckId || !phrase || words.length === 0) {
      toast.error('Please select a deck and generate a phrase first')
      return
    }

    setSavingCard(true)
    try {
      const wordList = words.map((w) => w.word).join(', ')
      const success = await addCard(selectedDeckId, phrase, wordList)
      if (success) {
        toast.success('Phrase saved as flashcard!')
        setSelectedDeckId(null)
      } else {
        toast.error('Failed to save phrase as card')
      }
    } catch (err) {
      toast.error('Error saving phrase')
    } finally {
      setSavingCard(false)
    }
  }

  const handleSaveWordsAsCards = async () => {
    if (!selectedDeckId || words.length === 0) {
      toast.error('Please select a deck and have words displayed')
      return
    }

    setSavingWords(true)
    try {
      let successCount = 0
      for (const word of words) {
        const success = await addCard(selectedDeckId, word.word, '')
        if (success) {
          successCount++
        }
      }

      if (successCount === words.length) {
        toast.success(`All ${words.length} words added to deck!`)
        setSelectedDeckId(null)
      } else {
        toast.success(`Added ${successCount} of ${words.length} words`)
      }
    } catch (err) {
      toast.error('Error saving words')
    } finally {
      setSavingWords(false)
    }
  }

  const handleToggleFavorite = async (word: string) => {
    if (isFavorite(word)) {
      const success = await removeFavorite(word)
      if (success) {
        toast.success(`Removed "${word}" from favorites`)
      }
    } else {
      const success = await addFavorite(word)
      if (success) {
        toast.success(`Added "${word}" to favorites`)
      }
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Random Phrase Generator</CardTitle>
            <CardDescription>
              Generate creative phrases using three random words from the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Random Words Section */}
            <div>
              <h3 className="text-sm font-medium mb-3">Selected Words (Click ❤️ to save to favorites):</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {loading && words.length === 0 ? (
                  <>
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                  </>
                ) : (
                  words.map((word) => (
                    <WordCard
                      key={word.id}
                      word={word.word}
                      isFavorite={isFavorite(word.word)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Generated Phrase Section */}
            <div>
              <h3 className="text-sm font-medium mb-3">Generated Phrase:</h3>
              <div className="rounded-lg border bg-muted/50 p-6 min-h-[120px] flex items-center justify-center">
                {loading ? (
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : error ? (
                  <div className="text-center space-y-2">
                    <p className="text-destructive font-medium">Error generating phrase</p>
                    <p className="text-sm text-muted-foreground">{error.message}</p>
                  </div>
                ) : phrase ? (
                  <p className="text-lg text-center leading-relaxed">{phrase}</p>
                ) : (
                  <p className="text-muted-foreground text-center">
                    Click "Generate New Phrase" to start
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 pt-4">
              <Button
                size="lg"
                onClick={generatePhrase}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Generating...' : 'Generate New Phrase'}
              </Button>

              {/* Save to Flashcards Section */}
              {phrase && words.length > 0 && decks.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <p className="text-sm font-medium">Save to Flashcard Deck:</p>
                  <div className="flex gap-2">
                    <Select value={selectedDeckId || ''} onValueChange={setSelectedDeckId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a deck..." />
                      </SelectTrigger>
                      <SelectContent>
                        {decks.map((deck) => (
                          <SelectItem key={deck.id} value={deck.id}>
                            {deck.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Save buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleSavePhraseAsCard}
                      disabled={!selectedDeckId || savingCard}
                      variant="secondary"
                      size="sm"
                    >
                      {savingCard ? 'Saving...' : 'Save Phrase'}
                    </Button>
                    <Button
                      onClick={handleSaveWordsAsCards}
                      disabled={!selectedDeckId || savingWords}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {savingWords ? 'Saving...' : 'Save Words'}
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    💡 Save Phrase: Adds the complete phrase with all 3 words in the back | Save Words: Adds each word as a separate card
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Favorite Words Section */}
        {favorites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                Your Favorite Words
              </CardTitle>
              <CardDescription>
                {favorites.length} word{favorites.length !== 1 ? 's' : ''} saved
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {favorites.map((word) => (
                  <WordCard
                    key={word}
                    word={word}
                    isFavorite={true}
                    onToggleFavorite={handleToggleFavorite}
                    variant="outlined"
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Tip: These favorite words can be used to generate longer, more personalized phrases!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                This feature pulls three random words from the database and uses AI to create
                a creative phrase that incorporates all three words.
              </p>
              <p>
                Each generation is personalized based on your user profile context for a unique
                experience.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
