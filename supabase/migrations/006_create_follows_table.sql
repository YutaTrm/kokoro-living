-- フォロー機能のテーブル作成

create table follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references auth.users(id) on delete cascade not null,
  following_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  unique(follower_id, following_id),
  check (follower_id != following_id) -- 自分自身をフォローできないように
);

-- インデックス
create index follows_follower_id_idx on follows(follower_id);
create index follows_following_id_idx on follows(following_id);

-- RLS
alter table follows enable row level security;
create policy "フォロー関係は全員が閲覧可能" on follows for select using (true);
create policy "ログインユーザーはフォロー可能" on follows for insert with check (auth.uid() = follower_id);
create policy "自分のフォローのみ削除可能" on follows for delete using (auth.uid() = follower_id);
