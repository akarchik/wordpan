-- Create favorite_words table for user's favorite words
create table public.favorite_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, word)
);

-- Create index for faster queries
create index favorite_words_user_id_idx on public.favorite_words(user_id);

-- Enable Row-Level Security
alter table public.favorite_words enable row level security;

-- RLS policy: users can only access their own favorite words
create policy "Users can access their own favorite words"
  on public.favorite_words
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Grant permissions
grant select, insert, delete on public.favorite_words to authenticated;
grant select on public.favorite_words to anon;
