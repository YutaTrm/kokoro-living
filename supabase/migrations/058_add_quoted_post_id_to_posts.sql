-- 引用リポスト用カラム追加

-- postsテーブルにquoted_post_idカラムを追加
alter table posts add column quoted_post_id uuid references posts(id) on delete set null;

-- インデックス追加
create index posts_quoted_post_id_idx on posts(quoted_post_id);
