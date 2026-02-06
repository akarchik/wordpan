-- Create word_pairs table for user-managed word relationships
create table public.word_pairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word1 text not null,
  word2 text not null,
  pair_type text not null default 'custom' check (pair_type in ('synonym', 'antonym', 'translation', 'related', 'custom')),
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better query performance
create index word_pairs_user_id_idx on public.word_pairs(user_id);
create index word_pairs_created_at_idx on public.word_pairs(created_at);

-- Enable Row-Level Security
alter table public.word_pairs enable row level security;

-- RLS policy: users can only access their own word pairs
create policy "Users can access their own word pairs"
  on public.word_pairs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Grant permissions
grant select, insert, update, delete on public.word_pairs to authenticated;
grant select on public.word_pairs to anon;
