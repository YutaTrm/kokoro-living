import { useState } from 'react';

import { supabase } from '@/src/lib/supabase';
import { fetchPostsStats } from '@/src/utils/postStats';
import {
  extractQuotedPostIdsFromReposts,
  fetchParentPostInfo,
  fetchQuotedPostInfo,
  fetchRepostMetadata,
  fetchRepostPostsData,
  fetchRepostsForTimeline,
  fetchUsersMap,
  mergeAndSortPostsWithReposts,
  QuotedPostInfo,
} from '@/src/utils/postUtils';

export interface Post {
  id: string;
  content: string;
  created_at: string;
  experienced_at?: string | null;
  is_hidden?: boolean;
  parent_post_id?: string | null;
  parentContent?: string;
  parentAvatarUrl?: string | null;
  quoted_post_id?: string | null;
  quotedPost?: QuotedPostInfo | null;
  user: {
    display_name: string;
    user_id: string;
    avatar_url?: string | null;
  };
  diagnoses: string[];
  treatments: string[];
  medications: string[];
  statuses: string[];
  repliesCount?: number;
  likesCount?: number;
  repostsCount?: number;
  isLikedByCurrentUser?: boolean;
  isRepostedByCurrentUser?: boolean;
  hasRepliedByCurrentUser?: boolean;
  repostedBy?: {
    user_id: string;
    display_name: string;
    avatar_url?: string | null;
  } | null;
  timelineSortDate?: string;
}

interface TagsResult {
  diagnoses: string[];
  treatments: string[];
  medications: string[];
  statuses: string[];
}

export const fetchTagsForPosts = async (
  postIds: string[]
): Promise<Map<string, TagsResult>> => {
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

  const diagnosesTagsData = diagnosesRes.data;
  const treatmentsTagsData = treatmentsRes.data;
  const medicationsTagsData = medicationsRes.data;
  const statusesTagsData = statusesRes.data;

  const tagsMap = new Map<string, TagsResult>();
  postIds.forEach((postId) => {
    const diagnoses: string[] = [];
    const treatments: string[] = [];
    const medications: string[] = [];
    const statuses: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    diagnosesTagsData?.forEach((d: any) => {
      if (d.post_id === postId && d.user_diagnoses?.diagnoses?.name) {
        diagnoses.push(d.user_diagnoses.diagnoses.name);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    treatmentsTagsData?.forEach((t: any) => {
      if (t.post_id === postId && t.user_treatments?.treatments?.name) {
        treatments.push(t.user_treatments.treatments.name);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    medicationsTagsData?.forEach((m: any) => {
      if (m.post_id === postId) {
        const name = m.user_medications?.ingredients?.name;
        if (name && !medications.includes(name)) {
          medications.push(name);
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statusesTagsData?.forEach((s: any) => {
      if (s.post_id === postId && s.user_statuses?.statuses?.name) {
        statuses.push(s.user_statuses.statuses.name);
      }
    });

    tagsMap.set(postId, { diagnoses, treatments, medications, statuses });
  });

  return tagsMap;
};

export const usePostsData = () => {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReplies, setUserReplies] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);

  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  const loadUserPosts = async () => {
    setLoadingPosts(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 自分の投稿（引用リポスト含む）とリポストを並列取得
      const [postsResult, repostsResult, userRes] = await Promise.all([
        supabase
          .from('posts')
          .select('id, content, created_at, user_id, is_hidden, experienced_at, quoted_post_id')
          .eq('user_id', user.id)
          .is('parent_post_id', null)
          .order('created_at', { ascending: false }),
        fetchRepostsForTimeline([user.id], 1000, 0),
        supabase
          .from('users')
          .select('user_id, display_name, avatar_url')
          .eq('user_id', user.id)
          .single(),
      ]);

      if (postsResult.error) throw postsResult.error;

      const postsData = postsResult.data || [];
      const repostsData = repostsResult || [];
      const userData = userRes.data;

      // 投稿IDリスト
      const postIds = postsData.map((p) => p.id);
      const repostPostIds = repostsData.map((r) => r.postId);
      const allPostIds = [...new Set([...postIds, ...repostPostIds])];

      // 引用元投稿IDリスト
      let quotedPostIds = postsData
        .map((p) => p.quoted_post_id)
        .filter((qid): qid is string => qid !== null);

      // リポスト元投稿の情報を取得（共通関数使用）
      const repostPostsData = await fetchRepostPostsData(repostPostIds);

      // リポスト元投稿の引用元も取得対象に追加（共通関数使用）
      quotedPostIds = extractQuotedPostIdsFromReposts(repostPostsData, quotedPostIds);

      // リポスト元投稿のユーザー情報を取得（共通関数使用）
      const repostUserIds = [...new Set(repostPostsData.map((p) => p.user_id))];
      const repostUsersMap = await fetchUsersMap(repostUserIds);

      // タグ・メタデータ・引用投稿情報を並列取得
      const [tagsMap, statsMap, repostMetadataResult, quotedPostsInfo] = await Promise.all([
        fetchTagsForPosts(allPostIds),
        fetchPostsStats(allPostIds, user.id),
        fetchRepostMetadata(allPostIds, user.id),
        fetchQuotedPostInfo([...new Set(quotedPostIds)]),
      ]);

      const { repostsMap, myRepostsMap } = repostMetadataResult;

      // 通常投稿をフォーマット
      const formattedPosts: Post[] = postsData.map((post) => {
        const tags = tagsMap.get(post.id) || {
          diagnoses: [],
          treatments: [],
          medications: [],
          statuses: [],
        };
        const stats = statsMap.get(post.id) || {
          repliesCount: 0,
          likesCount: 0,
          isLikedByCurrentUser: false,
          hasRepliedByCurrentUser: false,
        };
        return {
          id: post.id,
          content: post.content,
          created_at: post.created_at,
          experienced_at: post.experienced_at,
          is_hidden: post.is_hidden || false,
          quoted_post_id: post.quoted_post_id,
          quotedPost: post.quoted_post_id ? quotedPostsInfo.get(post.quoted_post_id) || null : null,
          user: {
            display_name: userData?.display_name || 'Unknown',
            user_id: post.user_id,
            avatar_url: userData?.avatar_url || null,
          },
          diagnoses: tags.diagnoses,
          treatments: tags.treatments,
          medications: tags.medications,
          statuses: tags.statuses,
          repliesCount: stats.repliesCount,
          likesCount: stats.likesCount,
          repostsCount: repostsMap.get(post.id) || 0,
          isLikedByCurrentUser: stats.isLikedByCurrentUser,
          isRepostedByCurrentUser: myRepostsMap.get(post.id) || false,
          hasRepliedByCurrentUser: stats.hasRepliedByCurrentUser,
          timelineSortDate: post.created_at,
        };
      });

      // リポストをフォーマット
      const formattedReposts: Post[] = [];
      for (const repost of repostsData) {
        const originalPost = repostPostsData.find((p) => p.id === repost.postId);
        if (!originalPost) continue;

        const originalUser = repostUsersMap.get(originalPost.user_id);
        const tags = tagsMap.get(originalPost.id) || {
          diagnoses: [],
          treatments: [],
          medications: [],
          statuses: [],
        };
        const stats = statsMap.get(originalPost.id) || {
          repliesCount: 0,
          likesCount: 0,
          isLikedByCurrentUser: false,
          hasRepliedByCurrentUser: false,
        };

        formattedReposts.push({
          id: originalPost.id,
          content: originalPost.content,
          created_at: originalPost.created_at,
          experienced_at: originalPost.experienced_at,
          is_hidden: false,
          quoted_post_id: originalPost.quoted_post_id,
          quotedPost: originalPost.quoted_post_id ? quotedPostsInfo.get(originalPost.quoted_post_id) || null : null,
          user: {
            display_name: originalUser?.display_name || 'Unknown',
            user_id: originalPost.user_id,
            avatar_url: originalUser?.avatar_url || null,
          },
          diagnoses: tags.diagnoses,
          treatments: tags.treatments,
          medications: tags.medications,
          statuses: tags.statuses,
          repliesCount: stats.repliesCount,
          likesCount: stats.likesCount,
          repostsCount: repostsMap.get(originalPost.id) || 0,
          isLikedByCurrentUser: stats.isLikedByCurrentUser,
          isRepostedByCurrentUser: myRepostsMap.get(originalPost.id) || false,
          hasRepliedByCurrentUser: stats.hasRepliedByCurrentUser,
          repostedBy: {
            user_id: repost.repostedBy.user_id,
            display_name: repost.repostedBy.display_name,
            avatar_url: repost.repostedBy.avatar_url,
          },
          timelineSortDate: repost.repostedAt,
        });
      }

      // 通常投稿とリポストをマージしてソート（共通関数使用）
      const allPosts = mergeAndSortPostsWithReposts(formattedPosts, formattedReposts);

      setUserPosts(allPosts);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadUserReplies = async () => {
    setLoadingReplies(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: repliesData, error: repliesError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id, is_hidden, parent_post_id')
        .eq('user_id', user.id)
        .not('parent_post_id', 'is', null)
        .order('created_at', { ascending: false });

      if (repliesError) throw repliesError;

      if (!repliesData || repliesData.length === 0) {
        setUserReplies([]);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      const postIds = repliesData.map((p) => p.id);
      const tagsMap = await fetchTagsForPosts(postIds);
      const statsMap = await fetchPostsStats(postIds, user.id);

      // 親投稿の内容とアバターを取得
      const parentPostIds = [
        ...new Set(repliesData.map((r) => r.parent_post_id).filter((id): id is string => id !== null)),
      ];
      const parentInfoMap = await fetchParentPostInfo(parentPostIds);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedReplies: Post[] = repliesData.map((reply: any) => {
        const tags = tagsMap.get(reply.id) || {
          diagnoses: [],
          treatments: [],
          medications: [],
          statuses: [],
        };
        const stats = statsMap.get(reply.id) || {
          repliesCount: 0,
          likesCount: 0,
          isLikedByCurrentUser: false,
          hasRepliedByCurrentUser: false,
        };
        const parentInfo = reply.parent_post_id ? parentInfoMap.get(reply.parent_post_id) : undefined;
        return {
          id: reply.id,
          content: reply.content,
          created_at: reply.created_at,
          is_hidden: reply.is_hidden || false,
          parent_post_id: reply.parent_post_id,
          parentContent: parentInfo?.content,
          parentAvatarUrl: parentInfo?.avatarUrl,
          user: {
            display_name: userData?.display_name || 'Unknown',
            user_id: reply.user_id,
            avatar_url: userData?.avatar_url || null,
          },
          diagnoses: tags.diagnoses,
          treatments: tags.treatments,
          medications: tags.medications,
          statuses: tags.statuses,
          repliesCount: stats.repliesCount,
          likesCount: stats.likesCount,
          isLikedByCurrentUser: stats.isLikedByCurrentUser,
          hasRepliedByCurrentUser: stats.hasRepliedByCurrentUser,
        };
      });

      setUserReplies(formattedReplies);
    } catch (error) {
      console.error('返信取得エラー:', error);
    } finally {
      setLoadingReplies(false);
    }
  };

  const loadLikedPosts = async () => {
    setLoadingLikes(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('post_id, posts!inner(id, content, created_at, user_id, experienced_at, parent_post_id)')
        .eq('user_id', user.id)
        .eq('posts.is_hidden', false)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;

      if (!likesData || likesData.length === 0) {
        setLikedPosts([]);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postUserIds = [...new Set(likesData.map((like: any) => like.posts.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .in('user_id', postUserIds);

      const usersMap = new Map(
        (usersData || []).map((u) => [
          u.user_id,
          { display_name: u.display_name, avatar_url: u.avatar_url },
        ])
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postIds = likesData.map((like: any) => like.posts.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parentPostIds = [...new Set(likesData.map((like: any) => like.posts.parent_post_id).filter((pid: string | null): pid is string => pid !== null))];

      const [tagsMap, parentInfoMap] = await Promise.all([
        fetchTagsForPosts(postIds),
        fetchParentPostInfo(parentPostIds),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedPosts: Post[] = likesData.map((like: any) => {
        const tags = tagsMap.get(like.posts.id) || {
          diagnoses: [],
          treatments: [],
          medications: [],
          statuses: [],
        };
        const parentInfo = like.posts.parent_post_id ? parentInfoMap.get(like.posts.parent_post_id) : undefined;
        return {
          id: like.posts.id,
          content: like.posts.content,
          created_at: like.posts.created_at,
          experienced_at: like.posts.experienced_at,
          is_hidden: false,
          parent_post_id: like.posts.parent_post_id,
          parentContent: parentInfo?.content,
          parentAvatarUrl: parentInfo?.avatarUrl,
          user: {
            display_name: usersMap.get(like.posts.user_id)?.display_name || 'Unknown',
            user_id: like.posts.user_id,
            avatar_url: usersMap.get(like.posts.user_id)?.avatar_url || null,
          },
          diagnoses: tags.diagnoses,
          treatments: tags.treatments,
          medications: tags.medications,
          statuses: tags.statuses,
          isLikedByCurrentUser: true,
        };
      });

      setLikedPosts(formattedPosts);
    } catch (error) {
      console.error('いいね取得エラー:', error);
    } finally {
      setLoadingLikes(false);
    }
  };

  const loadBookmarkedPosts = async () => {
    setLoadingBookmarks(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bookmarksData, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select('post_id, posts!inner(id, content, created_at, user_id, experienced_at)')
        .eq('user_id', user.id)
        .eq('posts.is_hidden', false)
        .order('created_at', { ascending: false });

      if (bookmarksError) throw bookmarksError;

      if (!bookmarksData || bookmarksData.length === 0) {
        setBookmarkedPosts([]);
        return;
      }

      const postUserIds = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...new Set(bookmarksData.map((bookmark: any) => bookmark.posts.user_id)),
      ];
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .in('user_id', postUserIds);

      const usersMap = new Map(
        (usersData || []).map((u) => [
          u.user_id,
          { display_name: u.display_name, avatar_url: u.avatar_url },
        ])
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postIds = bookmarksData.map((bookmark: any) => bookmark.posts.id);
      const tagsMap = await fetchTagsForPosts(postIds);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedPosts: Post[] = bookmarksData.map((bookmark: any) => {
        const tags = tagsMap.get(bookmark.posts.id) || {
          diagnoses: [],
          treatments: [],
          medications: [],
          statuses: [],
        };
        return {
          id: bookmark.posts.id,
          content: bookmark.posts.content,
          created_at: bookmark.posts.created_at,
          experienced_at: bookmark.posts.experienced_at,
          is_hidden: false, // ブックマーク一覧では非表示投稿は除外されている
          user: {
            display_name: usersMap.get(bookmark.posts.user_id)?.display_name || 'Unknown',
            user_id: bookmark.posts.user_id,
            avatar_url: usersMap.get(bookmark.posts.user_id)?.avatar_url || null,
          },
          diagnoses: tags.diagnoses,
          treatments: tags.treatments,
          medications: tags.medications,
          statuses: tags.statuses,
        };
      });

      setBookmarkedPosts(formattedPosts);
    } catch (error) {
      console.error('ブックマーク取得エラー:', error);
    } finally {
      setLoadingBookmarks(false);
    }
  };

  return {
    userPosts,
    userReplies,
    likedPosts,
    bookmarkedPosts,
    loadingPosts,
    loadingReplies,
    loadingLikes,
    loadingBookmarks,
    loadUserPosts,
    loadUserReplies,
    loadLikedPosts,
    loadBookmarkedPosts,
  };
};
