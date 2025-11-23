import { useState } from 'react';

import { supabase } from '@/src/lib/supabase';

export interface Post {
  id: string;
  content: string;
  created_at: string;
  user: {
    display_name: string;
    user_id: string;
    avatar_url?: string | null;
  };
  diagnoses: string[];
  treatments: string[];
  medications: string[];
}

interface TagsResult {
  diagnoses: string[];
  treatments: string[];
  medications: string[];
}

export const fetchTagsForPosts = async (
  postIds: string[]
): Promise<Map<string, TagsResult>> => {
  const { data: diagnosesTagsData } = await supabase
    .from('post_diagnoses')
    .select('post_id, user_diagnoses(diagnoses(name))')
    .in('post_id', postIds);

  const { data: treatmentsTagsData } = await supabase
    .from('post_treatments')
    .select('post_id, user_treatments(treatments(name))')
    .in('post_id', postIds);

  const { data: medicationsTagsData } = await supabase
    .from('post_medications')
    .select('post_id, user_medications(ingredients(name), products(name))')
    .in('post_id', postIds);

  const tagsMap = new Map<string, TagsResult>();
  postIds.forEach((postId) => {
    const diagnoses: string[] = [];
    const treatments: string[] = [];
    const medications: string[] = [];

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

    tagsMap.set(postId, { diagnoses, treatments, medications });
  });

  return tagsMap;
};

export const usePostsData = () => {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);

  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  const loadUserPosts = async () => {
    setLoadingPosts(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id')
        .eq('user_id', user.id)
        .is('parent_post_id', null)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setUserPosts([]);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      const postIds = postsData.map((p) => p.id);
      const tagsMap = await fetchTagsForPosts(postIds);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedPosts: Post[] = postsData.map((post: any) => {
        const tags = tagsMap.get(post.id) || {
          diagnoses: [],
          treatments: [],
          medications: [],
        };
        return {
          id: post.id,
          content: post.content,
          created_at: post.created_at,
          user: {
            display_name: userData?.display_name || 'Unknown',
            user_id: post.user_id,
            avatar_url: userData?.avatar_url || null,
          },
          diagnoses: tags.diagnoses,
          treatments: tags.treatments,
          medications: tags.medications,
        };
      });

      setUserPosts(formattedPosts);
    } catch (error) {
      console.error('投稿取得エラー:', error);
    } finally {
      setLoadingPosts(false);
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
        .select('post_id, posts!inner(id, content, created_at, user_id)')
        .eq('user_id', user.id)
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
      const tagsMap = await fetchTagsForPosts(postIds);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedPosts: Post[] = likesData.map((like: any) => {
        const tags = tagsMap.get(like.posts.id) || {
          diagnoses: [],
          treatments: [],
          medications: [],
        };
        return {
          id: like.posts.id,
          content: like.posts.content,
          created_at: like.posts.created_at,
          user: {
            display_name: usersMap.get(like.posts.user_id)?.display_name || 'Unknown',
            user_id: like.posts.user_id,
            avatar_url: usersMap.get(like.posts.user_id)?.avatar_url || null,
          },
          diagnoses: tags.diagnoses,
          treatments: tags.treatments,
          medications: tags.medications,
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
        .select('post_id, posts!inner(id, content, created_at, user_id)')
        .eq('user_id', user.id)
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
        };
        return {
          id: bookmark.posts.id,
          content: bookmark.posts.content,
          created_at: bookmark.posts.created_at,
          user: {
            display_name: usersMap.get(bookmark.posts.user_id)?.display_name || 'Unknown',
            user_id: bookmark.posts.user_id,
            avatar_url: usersMap.get(bookmark.posts.user_id)?.avatar_url || null,
          },
          diagnoses: tags.diagnoses,
          treatments: tags.treatments,
          medications: tags.medications,
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
    likedPosts,
    bookmarkedPosts,
    loadingPosts,
    loadingLikes,
    loadingBookmarks,
    loadUserPosts,
    loadLikedPosts,
    loadBookmarkedPosts,
  };
};
