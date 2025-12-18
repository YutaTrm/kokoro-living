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
