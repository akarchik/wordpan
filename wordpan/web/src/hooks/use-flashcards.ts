import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

export interface FlashcardDeck {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  card_count?: number;
}

export interface FlashcardCard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface FlashcardProgress {
  id: string;
  card_id: string;
  correct_count: number;
  incorrect_count: number;
  last_reviewed_at?: string;
}

interface UseFlashcardsReturn {
  decks: FlashcardDeck[];
  cards: FlashcardCard[];
  progress: Record<string, FlashcardProgress>;
  loading: boolean;
  error: Error | null;
  createDeck: (name: string, description?: string) => Promise<FlashcardDeck | null>;
  deleteDeck: (deckId: string) => Promise<boolean>;
  addCard: (deckId: string, front: string, back: string) => Promise<FlashcardCard | null>;
  deleteCard: (cardId: string) => Promise<boolean>;
  updateCard: (cardId: string, front: string, back: string) => Promise<FlashcardCard | null>;
  recordProgress: (cardId: string, deckId: string, correct: boolean) => Promise<boolean>;
  fetchDecks: () => Promise<void>;
  fetchCards: (deckId: string) => Promise<void>;
  fetchProgress: (deckId: string) => Promise<void>;
}

export function useFlashcards(): UseFlashcardsReturn {
  const { user } = useUser();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [cards, setCards] = useState<FlashcardCard[]>([]);
  const [progress, setProgress] = useState<Record<string, FlashcardProgress>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDecks = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from("flashcard_decks")
        .select(`
          id,
          name,
          description,
          created_at,
          updated_at,
          flashcard_cards(count)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (supabaseError) throw supabaseError;

      const decksWithCounts: FlashcardDeck[] = (data || []).map((deck: any) => ({
        id: deck.id,
        name: deck.name,
        description: deck.description,
        created_at: deck.created_at,
        updated_at: deck.updated_at,
        card_count: deck.flashcard_cards?.[0]?.count || 0,
      }));

      setDecks(decksWithCounts);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch decks");
      setError(error);
      console.error("Error fetching flashcard decks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCards = async (deckId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from("flashcard_cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("order_index", { ascending: true });

      if (supabaseError) throw supabaseError;

      setCards(data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch cards");
      setError(error);
      console.error("Error fetching flashcard cards:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async (deckId: string) => {
    if (!user) return;

    try {
      const { data, error: supabaseError } = await supabase
        .from("flashcard_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("deck_id", deckId);

      if (supabaseError) throw supabaseError;

      const progressMap: Record<string, FlashcardProgress> = {};
      (data || []).forEach((p) => {
        progressMap[p.card_id] = p;
      });

      setProgress(progressMap);
    } catch (err) {
      console.error("Error fetching progress:", err);
    }
  };

  const createDeck = async (name: string, description?: string): Promise<FlashcardDeck | null> => {
    if (!user) return null;

    try {
      const { data, error: supabaseError } = await supabase
        .from("flashcard_decks")
        .insert([
          {
            user_id: user.id,
            name,
            description,
          },
        ])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      const newDeck: FlashcardDeck = {
        id: data.id,
        name: data.name,
        description: data.description,
        created_at: data.created_at,
        updated_at: data.updated_at,
        card_count: 0,
      };

      setDecks([newDeck, ...decks]);
      return newDeck;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to create deck");
      setError(error);
      console.error("Error creating deck:", error);
      return null;
    }
  };

  const deleteDeck = async (deckId: string): Promise<boolean> => {
    if (!user) {
      console.error("No user found when attempting to delete deck");
      const error = new Error("User not authenticated");
      setError(error);
      return false;
    }

    try {
      console.log("Deleting deck:", { deckId, userId: user.id });
      
      // First, verify the session exists in Supabase client
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log("Current session:", { session: sessionData?.session?.user?.id, sessionError });

      // RLS policy will enforce that user can only delete their own deck
      const { data, error: supabaseError, status } = await supabase
        .from("flashcard_decks")
        .delete()
        .eq("id", deckId)
        .select();

      console.log("Delete response:", { 
        data, 
        supabaseError, 
        status,
        dataLength: data?.length 
      });

      if (supabaseError) {
        console.error("Supabase delete error:", supabaseError);
        throw supabaseError;
      }

      // Check if anything was actually deleted
      if (!data || data.length === 0) {
        console.warn("No rows deleted - deck may not exist or RLS denied it");
        const error = new Error("Deck not found or you don't have permission to delete it");
        setError(error);
        return false;
      }

      setDecks(decks.filter((d) => d.id !== deckId));
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to delete deck");
      setError(error);
      console.error("Error deleting deck:", error);
      return false;
    }
  };

  const addCard = async (
    deckId: string,
    front: string,
    back: string
  ): Promise<FlashcardCard | null> => {
    try {
      const { data, error: supabaseError } = await supabase
        .from("flashcard_cards")
        .insert([
          {
            deck_id: deckId,
            front,
            back,
            order_index: cards.length,
          },
        ])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      setCards([...cards, data]);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to add card");
      setError(error);
      console.error("Error adding card:", error);
      return null;
    }
  };

  const deleteCard = async (cardId: string): Promise<boolean> => {
    try {
      const { error: supabaseError } = await supabase
        .from("flashcard_cards")
        .delete()
        .eq("id", cardId);

      if (supabaseError) throw supabaseError;

      setCards(cards.filter((c) => c.id !== cardId));
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to delete card");
      setError(error);
      console.error("Error deleting card:", error);
      return false;
    }
  };

  const updateCard = async (
    cardId: string,
    front: string,
    back: string
  ): Promise<FlashcardCard | null> => {
    try {
      const { data, error: supabaseError } = await supabase
        .from("flashcard_cards")
        .update({
          front,
          back,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cardId)
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      setCards(cards.map((c) => (c.id === cardId ? data : c)));
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to update card");
      setError(error);
      console.error("Error updating card:", error);
      return null;
    }
  };

  const recordProgress = async (
    cardId: string,
    deckId: string,
    correct: boolean
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const existing = progress[cardId];

      if (existing) {
        // Update existing progress
        const { error: supabaseError } = await supabase
          .from("flashcard_progress")
          .update({
            correct_count: existing.correct_count + (correct ? 1 : 0),
            incorrect_count: existing.incorrect_count + (correct ? 0 : 1),
            last_reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (supabaseError) throw supabaseError;
      } else {
        // Create new progress entry
        const { error: supabaseError } = await supabase
          .from("flashcard_progress")
          .insert([
            {
              user_id: user.id,
              card_id: cardId,
              deck_id: deckId,
              correct_count: correct ? 1 : 0,
              incorrect_count: correct ? 0 : 1,
              last_reviewed_at: new Date().toISOString(),
            },
          ]);

        if (supabaseError) throw supabaseError;
      }

      // Refetch progress to keep state in sync
      await fetchProgress(deckId);
      return true;
    } catch (err) {
      console.error("Error recording progress:", err);
      return false;
    }
  };

  // Fetch decks on mount
  useEffect(() => {
    if (user) {
      fetchDecks();
    }
  }, [user]);

  return {
    decks,
    cards,
    progress,
    loading,
    error,
    createDeck,
    deleteDeck,
    addCard,
    deleteCard,
    updateCard,
    recordProgress,
    fetchDecks,
    fetchCards,
    fetchProgress,
  };
}
