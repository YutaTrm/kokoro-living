import { supabase } from '@/src/lib/supabase';

export interface ParentPostInfo {
  content: string;
  avatarUrl: string | null;
}

/**
 * 親投稿の内容とアバターを取得
 */
export async function fetchParentPostInfo(
  parentPostIds: string[]
): Promise<Map<string, ParentPostInfo>> {
  if (parentPostIds.length === 0) {
    return new Map();
  }

  // 親投稿を取得
  const { data: parentPostsData } = await supabase
    .from('posts')
    .select('id, content, user_id')
    .in('id', parentPostIds);

  if (!parentPostsData || parentPostsData.length === 0) {
    return new Map();
  }

  // 親投稿の投稿者のアバターを取得
  const parentUserIds = [...new Set(parentPostsData.map((p) => p.user_id))];
  const { data: parentUsersData } = await supabase
    .from('users')
    .select('user_id, avatar_url')
    .in('user_id', parentUserIds);

  const userAvatarMap = new Map<string, string | null>();
  (parentUsersData || []).forEach((u) => {
    userAvatarMap.set(u.user_id, u.avatar_url);
  });

  // 親投稿IDごとにコンテンツとアバターをマッピング
  const parentInfoMap = new Map<string, ParentPostInfo>();
  parentPostsData.forEach((p) => {
    parentInfoMap.set(p.id, {
      content: p.content,
      avatarUrl: userAvatarMap.get(p.user_id) || null,
    });
  });

  return parentInfoMap;
}

export interface PostMetadata {
  repliesCount: number;
  likesCount: number;
  isLikedByCurrentUser: boolean;
  hasRepliedByCurrentUser: boolean;
}

export interface PostMetadataMaps {
  repliesMap: Map<string, number>;
  likesMap: Map<string, number>;
  myLikesMap: Map<string, boolean>;
  myRepliesMap: Map<string, boolean>;
}

/**
 * 投稿IDリストに対する返信数・いいね数・現在ユーザーの状態を取得
 */
export async function fetchPostMetadata(
  postIds: string[],
  currentUserId: string | null
): Promise<PostMetadataMaps> {
  if (postIds.length === 0) {
    return {
      repliesMap: new Map(),
      likesMap: new Map(),
      myLikesMap: new Map(),
      myRepliesMap: new Map(),
    };
  }

  const [repliesRes, likesRes, myLikesRes, myRepliesRes] = await Promise.all([
    // 返信数
    supabase
      .from('posts')
      .select('parent_post_id')
      .in('parent_post_id', postIds),
    // いいね数
    supabase
      .from('likes')
      .select('post_id')
      .in('post_id', postIds),
    // 現在ユーザーのいいね
    currentUserId
      ? supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', postIds)
      : Promise.resolve({ data: [] }),
    // 現在ユーザーの返信
    currentUserId
      ? supabase
          .from('posts')
          .select('parent_post_id')
          .eq('user_id', currentUserId)
          .in('parent_post_id', postIds)
      : Promise.resolve({ data: [] }),
  ]);

  // 返信数マップ
  const repliesMap = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repliesRes.data?.forEach((r: any) => {
    const count = repliesMap.get(r.parent_post_id) || 0;
    repliesMap.set(r.parent_post_id, count + 1);
  });

  // いいね数マップ
  const likesMap = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  likesRes.data?.forEach((l: any) => {
    const count = likesMap.get(l.post_id) || 0;
    likesMap.set(l.post_id, count + 1);
  });

  // 自分のいいね・返信マップ
  const myLikesMap = new Map<string, boolean>();
  const myRepliesMap = new Map<string, boolean>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  myLikesRes.data?.forEach((l: any) => {
    myLikesMap.set(l.post_id, true);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  myRepliesRes.data?.forEach((r: any) => {
    myRepliesMap.set(r.parent_post_id, true);
  });

  return { repliesMap, likesMap, myLikesMap, myRepliesMap };
}

/**
 * 投稿のタグを取得してマップに変換
 */
export async function fetchPostTags(postIds: string[]): Promise<{
  diagnosesMap: Map<string, string[]>;
  treatmentsMap: Map<string, string[]>;
  medicationsMap: Map<string, string[]>;
  statusesMap: Map<string, string[]>;
}> {
  if (postIds.length === 0) {
    return {
      diagnosesMap: new Map(),
      treatmentsMap: new Map(),
      medicationsMap: new Map(),
      statusesMap: new Map(),
    };
  }

  const [diagnosesRes, treatmentsRes, medicationsRes, statusesRes] = await Promise.all([
    supabase
      .from('post_diagnoses')
      .select('post_id, user_diagnoses(diagnoses(name))')
      .in('post_id', postIds),
    supabase
      .from('post_treatments')
      .select('post_id, user_treatments(treatments(name))')
      .in('post_id', postIds),
    supabase
      .from('post_medications')
      .select('post_id, user_medications(ingredients(name), products(name))')
      .in('post_id', postIds),
    supabase
      .from('post_statuses')
      .select('post_id, user_statuses(statuses(name))')
      .in('post_id', postIds),
  ]);

  const diagnosesMap = new Map<string, string[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  diagnosesRes.data?.forEach((d: any) => {
    const name = d.user_diagnoses?.diagnoses?.name;
    if (name) {
      if (!diagnosesMap.has(d.post_id)) {
        diagnosesMap.set(d.post_id, []);
      }
      diagnosesMap.get(d.post_id)?.push(name);
    }
  });

  const treatmentsMap = new Map<string, string[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  treatmentsRes.data?.forEach((t: any) => {
    const name = t.user_treatments?.treatments?.name;
    if (name) {
      if (!treatmentsMap.has(t.post_id)) {
        treatmentsMap.set(t.post_id, []);
      }
      treatmentsMap.get(t.post_id)?.push(name);
    }
  });

  const medicationsMap = new Map<string, string[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  medicationsRes.data?.forEach((m: any) => {
    const name = m.user_medications?.ingredients?.name;
    if (name) {
      if (!medicationsMap.has(m.post_id)) {
        medicationsMap.set(m.post_id, []);
      }
      const meds = medicationsMap.get(m.post_id)!;
      if (!meds.includes(name)) {
        meds.push(name);
      }
    }
  });

  const statusesMap = new Map<string, string[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statusesRes.data?.forEach((s: any) => {
    const name = s.user_statuses?.statuses?.name;
    if (name) {
      if (!statusesMap.has(s.post_id)) {
        statusesMap.set(s.post_id, []);
      }
      statusesMap.get(s.post_id)?.push(name);
    }
  });

  return { diagnosesMap, treatmentsMap, medicationsMap, statusesMap };
}

export interface QuotedPostInfo {
  id: string;
  content: string;
  created_at: string;
  is_hidden?: boolean;
  user: {
    display_name: string;
    avatar_url: string | null;
  };
}

/**
 * 引用元投稿の情報を取得
 */
export async function fetchQuotedPostInfo(
  quotedPostIds: string[]
): Promise<Map<string, QuotedPostInfo>> {
  if (quotedPostIds.length === 0) {
    return new Map();
  }

  // 引用元投稿を取得
  const { data: quotedPostsData } = await supabase
    .from('posts')
    .select('id, content, created_at, user_id, is_hidden')
    .in('id', quotedPostIds);

  if (!quotedPostsData || quotedPostsData.length === 0) {
    return new Map();
  }

  // 引用元投稿の投稿者情報を取得
  const quotedUserIds = [...new Set(quotedPostsData.map((p) => p.user_id))];
  const { data: quotedUsersData } = await supabase
    .from('users')
    .select('user_id, display_name, avatar_url')
    .in('user_id', quotedUserIds);

  const userInfoMap = new Map<string, { display_name: string; avatar_url: string | null }>();
  (quotedUsersData || []).forEach((u) => {
    userInfoMap.set(u.user_id, {
      display_name: u.display_name || 'Unknown',
      avatar_url: u.avatar_url,
    });
  });

  // 引用元投稿IDごとに情報をマッピング
  const quotedInfoMap = new Map<string, QuotedPostInfo>();
  quotedPostsData.forEach((p) => {
    const userInfo = userInfoMap.get(p.user_id);
    quotedInfoMap.set(p.id, {
      id: p.id,
      content: p.content,
      created_at: p.created_at,
      is_hidden: p.is_hidden,
      user: {
        display_name: userInfo?.display_name || 'Unknown',
        avatar_url: userInfo?.avatar_url || null,
      },
    });
  });

  return quotedInfoMap;
}

export interface RepostMetadataMaps {
  repostsMap: Map<string, number>;
  myRepostsMap: Map<string, boolean>;
}

/**
 * 投稿IDリストに対するリポスト数・現在ユーザーのリポスト状態を取得
 */
export async function fetchRepostMetadata(
  postIds: string[],
  currentUserId: string | null
): Promise<RepostMetadataMaps> {
  if (postIds.length === 0) {
    return {
      repostsMap: new Map(),
      myRepostsMap: new Map(),
    };
  }

  const [repostsRes, myRepostsRes] = await Promise.all([
    // リポスト数
    supabase
      .from('reposts')
      .select('post_id')
      .in('post_id', postIds),
    // 現在ユーザーのリポスト
    currentUserId
      ? supabase
          .from('reposts')
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', postIds)
      : Promise.resolve({ data: [] }),
  ]);

  // リポスト数マップ
  const repostsMap = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repostsRes.data?.forEach((r: any) => {
    const count = repostsMap.get(r.post_id) || 0;
    repostsMap.set(r.post_id, count + 1);
  });

  // 自分のリポストマップ
  const myRepostsMap = new Map<string, boolean>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  myRepostsRes.data?.forEach((r: any) => {
    myRepostsMap.set(r.post_id, true);
  });

  return { repostsMap, myRepostsMap };
}

export interface RepostForTimeline {
  postId: string;
  repostedAt: string;
  repostedBy: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

/**
 * タイムライン用のリポストを取得（指定ユーザーがリポストした投稿）
 */
export async function fetchRepostsForTimeline(
  userIds: string[],
  limit: number,
  offset: number
): Promise<RepostForTimeline[]> {
  if (userIds.length === 0) {
    return [];
  }

  // リポストを取得
  const { data: repostsData, error } = await supabase
    .from('reposts')
    .select('post_id, user_id, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !repostsData || repostsData.length === 0) {
    return [];
  }

  // リポストしたユーザーの情報を取得
  const repostUserIds = [...new Set(repostsData.map(r => r.user_id))];
  const { data: usersData } = await supabase
    .from('users')
    .select('user_id, display_name, avatar_url')
    .in('user_id', repostUserIds);

  const usersMap = new Map<string, { display_name: string; avatar_url: string | null }>();
  (usersData || []).forEach(u => {
    usersMap.set(u.user_id, {
      display_name: u.display_name || 'Unknown',
      avatar_url: u.avatar_url || null,
    });
  });

  return repostsData.map(r => ({
    postId: r.post_id,
    repostedAt: r.created_at,
    repostedBy: {
      user_id: r.user_id,
      display_name: usersMap.get(r.user_id)?.display_name || 'Unknown',
      avatar_url: usersMap.get(r.user_id)?.avatar_url || null,
    },
  }));
}

export interface UserInfo {
  display_name: string;
  avatar_url: string | null;
}

/**
 * ユーザーID配列からユーザー情報Mapを取得
 */
export async function fetchUsersMap(
  userIds: string[]
): Promise<Map<string, UserInfo>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data: usersData } = await supabase
    .from('users')
    .select('user_id, display_name, avatar_url')
    .in('user_id', userIds);

  const usersMap = new Map<string, UserInfo>();
  (usersData || []).forEach((u) => {
    usersMap.set(u.user_id, {
      display_name: u.display_name || 'Unknown',
      avatar_url: u.avatar_url || null,
    });
  });

  return usersMap;
}

export interface RepostPostData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  experienced_at: string | null;
  quoted_post_id: string | null;
  is_hidden?: boolean;
}

/**
 * リポスト元投稿のデータを取得
 */
export async function fetchRepostPostsData(
  postIds: string[]
): Promise<RepostPostData[]> {
  if (postIds.length === 0) {
    return [];
  }

  const { data } = await supabase
    .from('posts')
    .select('id, content, created_at, user_id, experienced_at, quoted_post_id, is_hidden')
    .in('id', postIds)
    .eq('is_hidden', false);

  return data || [];
}

/**
 * 投稿とリポストをマージして時系列でソート
 */
export function mergeAndSortPostsWithReposts<T extends { timelineSortDate?: string; created_at: string }>(
  posts: T[],
  reposts: T[]
): T[] {
  const allPosts = [...posts, ...reposts];
  allPosts.sort((a, b) => {
    const dateA = a.timelineSortDate || a.created_at;
    const dateB = b.timelineSortDate || b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
  return allPosts;
}

/**
 * リポストデータから引用元投稿IDを抽出して追加
 */
export function extractQuotedPostIdsFromReposts(
  repostPostsData: RepostPostData[],
  existingQuotedPostIds: string[]
): string[] {
  const quotedPostIds = [...existingQuotedPostIds];
  repostPostsData.forEach((p) => {
    if (p.quoted_post_id && !quotedPostIds.includes(p.quoted_post_id)) {
      quotedPostIds.push(p.quoted_post_id);
    }
  });
  return quotedPostIds;
}
