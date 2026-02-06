import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FlashcardCard } from "@/components/flashcard-card";
import { useFlashcards } from "@/hooks/use-flashcards";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

export default function FlashcardsPage() {
  const { decks, cards, progress, loading, createDeck, deleteDeck, fetchCards, fetchProgress } =
    useFlashcards();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [newDeckName, setNewDeckName] = useState("");
  const [showNewDeckForm, setShowNewDeckForm] = useState(false);

  const selectedDeck = useMemo(
    () => decks.find((d) => d.id === selectedDeckId),
    [decks, selectedDeckId]
  );

  const currentCard = cards[currentCardIndex];

  const handleSelectDeck = async (deckId: string) => {
    setSelectedDeckId(deckId);
    setCurrentCardIndex(0);
    await fetchCards(deckId);
    await fetchProgress(deckId);
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return;

    const newDeck = await createDeck(newDeckName, "Sample flashcard deck");
    if (newDeck) {
      setNewDeckName("");
      setShowNewDeckForm(false);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (window.confirm("Are you sure you want to delete this deck?")) {
      await deleteDeck(deckId);
      if (selectedDeckId === deckId) {
        setSelectedDeckId(null);
        setCurrentCardIndex(0);
      }
    }
  };

  const handleNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") handleNextCard();
    if (e.key === "ArrowLeft") handlePreviousCard();
  };

  return (
    <div className="flex flex-col gap-6 p-6" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Flashcards</h1>
        <p className="text-muted-foreground">
          Learn with interactive flashcards. Click to flip and use arrow keys to navigate.
        </p>
      </div>

      {/* Decks Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Decks</CardTitle>
              <CardDescription>Create or select a flashcard deck to study</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowNewDeckForm(!showNewDeckForm)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Deck
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showNewDeckForm && (
            <div className="flex gap-2">
              <Input
                placeholder="Deck name (e.g., 'Spanish 101')"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateDeck();
                }}
              />
              <Button onClick={handleCreateDeck} size="sm">
                Create
              </Button>
              <Button
                onClick={() => {
                  setShowNewDeckForm(false);
                  setNewDeckName("");
                }}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          )}

          {loading && !decks.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : decks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No decks yet. Create your first deck!</p>
              <Button onClick={() => setShowNewDeckForm(true)}>Create First Deck</Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck) => (
                <Card
                  key={deck.id}
                  className={`cursor-pointer transition-all ${
                    selectedDeckId === deck.id
                      ? "ring-2 ring-primary border-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => handleSelectDeck(deck.id)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{deck.name}</CardTitle>
                    {deck.description && (
                      <CardDescription className="text-sm">{deck.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {deck.card_count || 0} cards
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDeck(deck.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Study Section */}
      {selectedDeck && cards.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedDeck.name}</CardTitle>
                <CardDescription>
                  Card {currentCardIndex + 1} of {cards.length}
                </CardDescription>
              </div>
              <div className="text-sm text-muted-foreground">
                {cards.length > 0 && (
                  <div className="space-y-1 text-right">
                    <p>
                      Progress: {currentCardIndex + 1} / {cards.length}
                    </p>
                    <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${((currentCardIndex + 1) / cards.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Flashcard */}
            {currentCard ? (
              <div className="flex justify-center">
                <FlashcardCard
                  front={currentCard.front}
                  back={currentCard.back}
                  className="max-w-2xl"
                />
              </div>
            ) : (
              <Skeleton className="h-64 rounded-lg" />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              <Button
                onClick={handlePreviousCard}
                disabled={currentCardIndex === 0}
                variant="outline"
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {cards.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentCardIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentCardIndex
                        ? "w-8 bg-primary"
                        : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                    aria-label={`Go to card ${index + 1}`}
                  />
                ))}
              </div>

              <Button
                onClick={handleNextCard}
                disabled={currentCardIndex === cards.length - 1}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Keyboard hint */}
            <div className="text-center text-xs text-muted-foreground">
              💡 Use arrow keys or buttons to navigate between cards. Click cards to flip.
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDeck && cards.length === 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedDeck.name}</CardTitle>
            <CardDescription>No cards in this deck yet</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Add cards to get started studying!</p>
            {/* Card creation will be added in next iteration */}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
