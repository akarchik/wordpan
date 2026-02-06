import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FlashcardCard } from "@/components/flashcard-card";
import { useFlashcards } from "@/hooks/use-flashcards";
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function FlashcardsPage() {
  const navigate = useNavigate();
  const { decks, cards, progress, loading, createDeck, deleteDeck, addCard, deleteCard, updateCard, fetchCards, fetchProgress, fetchDecks } =
    useFlashcards();
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [newDeckName, setNewDeckName] = useState("");
  const [showNewDeckForm, setShowNewDeckForm] = useState(false);
  
  // Card management state
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [deleteCardConfirm, setDeleteCardConfirm] = useState<string | null>(null);
  
  // Phrase generation state
  const [generatingPhrase, setGeneratingPhrase] = useState(false);

  const selectedDeck = useMemo(
    () => decks.find((d) => d.id === selectedDeckId),
    [decks, selectedDeckId]
  );

  const currentCard = cards[currentCardIndex];

  const handleSelectDeck = async (deckId: string) => {
    setSelectedDeckId(deckId);
    setCurrentCardIndex(0);
    setShowAddCardForm(false);
    setEditingCardId(null);
    setCardFront("");
    setCardBack("");
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
    console.log("handleDeleteDeck called with:", deckId);
    const confirmed = window.confirm("Are you sure you want to delete this deck?");
    console.log("User confirmed delete:", confirmed);
    
    if (confirmed) {
      try {
        console.log("Starting delete process for deck:", deckId);
        const success = await deleteDeck(deckId);
        console.log("Delete result:", success);
        
        if (success) {
          toast.success("Deck deleted successfully");
          if (selectedDeckId === deckId) {
            setSelectedDeckId(null);
            setCurrentCardIndex(0);
          }
        } else {
          console.error("Delete returned false");
          toast.error("Failed to delete deck - check console for details");
        }
      } catch (err) {
        console.error("Delete threw error:", err);
        toast.error("Error deleting deck - check console");
      }
    }
  };

  const handleAddCard = async () => {
    if (!selectedDeckId || !cardFront.trim() || !cardBack.trim()) {
      toast.error("Front and back text are required");
      return;
    }

    if (editingCardId) {
      const success = await updateCard(editingCardId, cardFront, cardBack);
      if (success) {
        toast.success("Card updated successfully");
        setEditingCardId(null);
      } else {
        toast.error("Failed to update card");
        return;
      }
    } else {
      const success = await addCard(selectedDeckId, cardFront, cardBack);
      if (success) {
        toast.success("Card added successfully");
      } else {
        toast.error("Failed to add card");
        return;
      }
    }

    setCardFront("");
    setCardBack("");
    setShowAddCardForm(false);
    
    // Refetch decks to update card counts
    await fetchDecks();
  };

  const handleEditCard = (card: (typeof cards)[0]) => {
    setEditingCardId(card.id);
    setCardFront(card.front);
    setCardBack(card.back);
    setShowAddCardForm(true);
  };

  const handleDeleteCard = async () => {
    if (!deleteCardConfirm) return;

    const success = await deleteCard(deleteCardConfirm);
    if (success) {
      toast.success("Card deleted successfully");
      if (currentCardIndex >= cards.length - 1) {
        setCurrentCardIndex(Math.max(0, currentCardIndex - 1));
      }
      // Refetch decks to update card counts
      await fetchDecks();
    } else {
      toast.error("Failed to delete card");
    }
    setDeleteCardConfirm(null);
  };

  const handleCancelCardForm = () => {
    setShowAddCardForm(false);
    setEditingCardId(null);
    setCardFront("");
    setCardBack("");
  };

  const handleGeneratePhraseFromDeck = async () => {
    if (!selectedDeckId || cards.length === 0) {
      toast.error("Please select a deck with cards first");
      return;
    }

    // Extract up to 3 words from card backs (answers)
    const wordsToUse = cards
      .slice(0, 3)
      .map((card) => card.back.split(",")[0].trim())
      .filter((word) => word.length > 0);

    if (wordsToUse.length === 0) {
      toast.error("No words found in cards");
      return;
    }

    setGeneratingPhrase(true);
    try {
      // Navigate to random phrase page with words as query params
      const wordParam = wordsToUse.join(",");
      navigate(`/random-phrase?words=${encodeURIComponent(wordParam)}`);
    } catch (err) {
      toast.error("Failed to generate phrase");
    } finally {
      setGeneratingPhrase(false);
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
              <div className="flex flex-col items-end gap-3">
                <Button
                  onClick={handleGeneratePhraseFromDeck}
                  disabled={generatingPhrase}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Phrase
                </Button>
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
            <Button onClick={() => setShowAddCardForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Card
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Card Management Form */}
      {selectedDeck && showAddCardForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCardId ? "Edit Card" : "Add New Card"}</CardTitle>
            <CardDescription>
              {editingCardId ? "Update card content" : "Add a new card to this deck"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Front (Question/Prompt)</label>
              <Input
                placeholder="e.g., 'What is the capital of France?'"
                value={cardFront}
                onChange={(e) => setCardFront(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Back (Answer)</label>
              <Input
                placeholder="e.g., 'Paris'"
                value={cardBack}
                onChange={(e) => setCardBack(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddCard} disabled={loading}>
                {loading ? "Saving..." : editingCardId ? "Update Card" : "Add Card"}
              </Button>
              <Button variant="outline" onClick={handleCancelCardForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards List (when deck selected and has cards or form shown) */}
      {selectedDeck && (cards.length > 0 || showAddCardForm) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cards in "{selectedDeck.name}"</CardTitle>
                <CardDescription>{cards.length} card{cards.length !== 1 ? "s" : ""}</CardDescription>
              </div>
              {!showAddCardForm && (
                <Button onClick={() => setShowAddCardForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Card
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {cards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No cards yet</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cards.map((card, index) => (
                  <div key={card.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{card.front}</p>
                      <p className="text-xs text-muted-foreground truncate">{card.back}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditCard(card)}
                        disabled={loading}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteCardConfirm(card.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Card Confirmation */}
      <AlertDialog open={deleteCardConfirm !== null} onOpenChange={() => setDeleteCardConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Card?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The card will be permanently deleted from this deck.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCard}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
