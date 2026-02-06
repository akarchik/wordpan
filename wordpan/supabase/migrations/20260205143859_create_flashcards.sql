-- Create flashcard_decks table
CREATE TABLE flashcard_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create flashcard_cards table
CREATE TABLE flashcard_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  order_index integer DEFAULT 0
);

-- Create flashcard_progress table to track user progress
CREATE TABLE flashcard_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES flashcard_cards(id) ON DELETE CASCADE,
  deck_id uuid NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  correct_count integer DEFAULT 0,
  incorrect_count integer DEFAULT 0,
  last_reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, card_id)
);

-- Enable RLS
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flashcard_decks
CREATE POLICY "Users can view their own flashcard decks"
  ON flashcard_decks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flashcard decks"
  ON flashcard_decks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard decks"
  ON flashcard_decks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard decks"
  ON flashcard_decks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for flashcard_cards (access via deck ownership)
CREATE POLICY "Users can view cards in their decks"
  ON flashcard_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks
      WHERE flashcard_decks.id = flashcard_cards.deck_id
      AND flashcard_decks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cards into their decks"
  ON flashcard_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flashcard_decks
      WHERE flashcard_decks.id = flashcard_cards.deck_id
      AND flashcard_decks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cards in their decks"
  ON flashcard_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks
      WHERE flashcard_decks.id = flashcard_cards.deck_id
      AND flashcard_decks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM flashcard_decks
      WHERE flashcard_decks.id = flashcard_cards.deck_id
      AND flashcard_decks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cards from their decks"
  ON flashcard_cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks
      WHERE flashcard_decks.id = flashcard_cards.deck_id
      AND flashcard_decks.user_id = auth.uid()
    )
  );

-- RLS Policies for flashcard_progress
CREATE POLICY "Users can view their own progress"
  ON flashcard_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress entries"
  ON flashcard_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON flashcard_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX idx_flashcard_cards_deck_id ON flashcard_cards(deck_id);
CREATE INDEX idx_flashcard_progress_user_id ON flashcard_progress(user_id);
CREATE INDEX idx_flashcard_progress_deck_id ON flashcard_progress(deck_id);
CREATE INDEX idx_flashcard_progress_card_id ON flashcard_progress(card_id);
