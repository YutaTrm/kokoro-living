-- 投稿機能関連のテーブル作成・更新

-- 1. 既存のpostsテーブルにparent_post_idカラムを追加
alter table posts add column parent_post_id uuid references posts(id) on delete cascade;

-- インデックス追加
create index if not exists posts_parent_post_id_idx on posts(parent_post_id);

-- 2. likes テーブル（いいね）
create table likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  unique(post_id, user_id)
);

-- インデックス
create index likes_post_id_idx on likes(post_id);
create index likes_user_id_idx on likes(user_id);

-- RLS
alter table likes enable row level security;
create policy "いいねは全員が閲覧可能" on likes for select using (true);
create policy "ログインユーザーはいいね可能" on likes for insert with check (auth.uid() = user_id);
create policy "自分のいいねのみ削除可能" on likes for delete using (auth.uid() = user_id);

-- 3. bookmarks テーブル（ブックマーク）
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  unique(post_id, user_id)
);

-- インデックス
create index bookmarks_post_id_idx on bookmarks(post_id);
create index bookmarks_user_id_idx on bookmarks(user_id);

-- RLS
alter table bookmarks enable row level security;
create policy "自分のブックマークのみ閲覧可能" on bookmarks for select using (auth.uid() = user_id);
create policy "ログインユーザーはブックマーク可能" on bookmarks for insert with check (auth.uid() = user_id);
create policy "自分のブックマークのみ削除可能" on bookmarks for delete using (auth.uid() = user_id);

-- 4. post_diagnoses テーブル（投稿と診断名の関連付け）
create table post_diagnoses (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  user_diagnosis_id uuid references user_diagnoses(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  unique(post_id, user_diagnosis_id)
);

-- インデックス
create index post_diagnoses_post_id_idx on post_diagnoses(post_id);
create index post_diagnoses_user_diagnosis_id_idx on post_diagnoses(user_diagnosis_id);

-- RLS
alter table post_diagnoses enable row level security;
create policy "投稿タグ（診断名）は全員が閲覧可能" on post_diagnoses for select using (true);
create policy "投稿者のみタグ（診断名）を追加可能" on post_diagnoses
  for insert with check (
    exists (
      select 1 from posts where posts.id = post_id and posts.user_id = auth.uid()
    )
  );
create policy "投稿者のみタグ（診断名）を削除可能" on post_diagnoses
  for delete using (
    exists (
      select 1 from posts where posts.id = post_id and posts.user_id = auth.uid()
    )
  );

-- 5. post_treatments テーブル（投稿と治療法の関連付け）
create table post_treatments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  user_treatment_id uuid references user_treatments(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  unique(post_id, user_treatment_id)
);

-- インデックス
create index post_treatments_post_id_idx on post_treatments(post_id);
create index post_treatments_user_treatment_id_idx on post_treatments(user_treatment_id);

-- RLS
alter table post_treatments enable row level security;
create policy "投稿タグ（治療法）は全員が閲覧可能" on post_treatments for select using (true);
create policy "投稿者のみタグ（治療法）を追加可能" on post_treatments
  for insert with check (
    exists (
      select 1 from posts where posts.id = post_id and posts.user_id = auth.uid()
    )
  );
create policy "投稿者のみタグ（治療法）を削除可能" on post_treatments
  for delete using (
    exists (
      select 1 from posts where posts.id = post_id and posts.user_id = auth.uid()
    )
  );

-- 6. post_medications テーブル（投稿と服薬の関連付け）
create table post_medications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  user_medication_id uuid references user_medications(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  unique(post_id, user_medication_id)
);

-- インデックス
create index post_medications_post_id_idx on post_medications(post_id);
create index post_medications_user_medication_id_idx on post_medications(user_medication_id);

-- RLS
alter table post_medications enable row level security;
create policy "投稿タグ（服薬）は全員が閲覧可能" on post_medications for select using (true);
create policy "投稿者のみタグ（服薬）を追加可能" on post_medications
  for insert with check (
    exists (
      select 1 from posts where posts.id = post_id and posts.user_id = auth.uid()
    )
  );
create policy "投稿者のみタグ（服薬）を削除可能" on post_medications
  for delete using (
    exists (
      select 1 from posts where posts.id = post_id and posts.user_id = auth.uid()
    )
  );
