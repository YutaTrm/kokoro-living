-- リポストテーブル作成

-- 1. reposts テーブル
create table reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  post_id uuid references posts(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  unique(user_id, post_id)
);

-- インデックス
create index reposts_user_id_idx on reposts(user_id);
create index reposts_post_id_idx on reposts(post_id);
create index reposts_created_at_idx on reposts(created_at desc);

-- RLS
alter table reposts enable row level security;
create policy "リポストは全員が閲覧可能" on reposts for select using (true);
create policy "ログインユーザーはリポスト可能" on reposts for insert with check (auth.uid() = user_id);
create policy "自分のリポストのみ削除可能" on reposts for delete using (auth.uid() = user_id);
