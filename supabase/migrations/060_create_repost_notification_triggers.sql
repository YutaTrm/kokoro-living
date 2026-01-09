-- リポスト・引用リポストの通知トリガー

-- リポスト時に通知を作成するトリガー関数
create or replace function public.create_repost_notification()
returns trigger as $$
declare
  post_owner_id uuid;
begin
  -- 投稿の所有者を取得
  select user_id into post_owner_id from public.posts where id = NEW.post_id;

  -- 自分自身へのリポストは通知しない
  if post_owner_id is not null and post_owner_id != NEW.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (post_owner_id, NEW.user_id, 'repost', NEW.post_id)
    on conflict do nothing;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- リポスト追加時のトリガー
drop trigger if exists on_repost_created on public.reposts;
create trigger on_repost_created
  after insert on public.reposts
  for each row
  execute function public.create_repost_notification();

-- リポスト削除時に通知も削除するトリガー関数
create or replace function public.delete_repost_notification()
returns trigger as $$
declare
  post_owner_id uuid;
begin
  -- 投稿の所有者を取得
  select user_id into post_owner_id from public.posts where id = OLD.post_id;

  if post_owner_id is not null then
    delete from public.notifications
    where user_id = post_owner_id
      and actor_id = OLD.user_id
      and type = 'repost'
      and post_id = OLD.post_id;
  end if;

  return OLD;
end;
$$ language plpgsql security definer;

-- リポスト削除時のトリガー
drop trigger if exists on_repost_deleted on public.reposts;
create trigger on_repost_deleted
  after delete on public.reposts
  for each row
  execute function public.delete_repost_notification();

-- 引用リポスト時に通知を作成するトリガー関数
create or replace function public.create_quote_notification()
returns trigger as $$
declare
  quoted_post_owner_id uuid;
begin
  -- 引用元投稿の所有者を取得
  select user_id into quoted_post_owner_id from public.posts where id = NEW.quoted_post_id;

  -- 自分自身への引用リポストは通知しない
  if quoted_post_owner_id is not null and quoted_post_owner_id != NEW.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (quoted_post_owner_id, NEW.user_id, 'quote', NEW.id)
    on conflict do nothing;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- 引用リポスト追加時のトリガー
drop trigger if exists on_quote_created on public.posts;
create trigger on_quote_created
  after insert on public.posts
  for each row
  when (NEW.quoted_post_id is not null)
  execute function public.create_quote_notification();
