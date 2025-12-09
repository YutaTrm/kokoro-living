import { useRef, useState } from 'react';
import { Alert } from 'react-native';

import { supabase } from '@/src/lib/supabase';
import { UserProfile } from '@/src/types/profile';
import { checkNGWords } from '@/src/utils/ngWordFilter';

interface UseProfileDataOptions {
  onLoadComplete?: (userId: string) => void;
}

export const useProfileData = (options?: UseProfileDataOptions) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const initialLoadCompleteRef = useRef(false);

  // テキスト編集モーダル用のstate
  const [showNameEditModal, setShowNameEditModal] = useState(false);
  const [showBioEditModal, setShowBioEditModal] = useState(false);

  // 初期データを一括ロード（getUser()は1回だけ）
  const loadInitialData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setLoading(false);
        setCurrentUserId(null);
        return null;
      }

      setCurrentUserId(user.id);

      const { data: userData } = await supabase
        .from('users')
        .select('display_name, created_at, bio, provider, avatar_url')
        .eq('user_id', user.id)
        .single();

      const xName = user.user_metadata?.name || null;
      const userProfile: UserProfile = {
        avatarUrl: userData ? userData.avatar_url : (user.user_metadata?.avatar_url || null),
        userName: userData?.display_name || xName,
        xUserName: xName,
        accountName: user.user_metadata?.user_name || null,
        createdAt: userData?.created_at || user.created_at || null,
        provider: userData?.provider || null,
        bio: userData?.bio || null,
      };

      setProfile(userProfile);
      setBio(userData?.bio || '');
      initialLoadCompleteRef.current = true;

      options?.onLoadComplete?.(user.id);

      return user.id;
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // プロフィール情報のみ再読み込み（アバター変更時など）
  const loadUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setLoading(false);
        setCurrentUserId(null);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('display_name, created_at, bio, provider, avatar_url')
        .eq('user_id', user.id)
        .single();

      const xName = user.user_metadata?.name || null;
      const userProfile: UserProfile = {
        avatarUrl: userData ? userData.avatar_url : (user.user_metadata?.avatar_url || null),
        userName: userData?.display_name || xName,
        xUserName: xName,
        accountName: user.user_metadata?.user_name || null,
        createdAt: userData?.created_at || user.created_at || null,
        provider: userData?.provider || null,
        bio: userData?.bio || null,
      };

      setProfile(userProfile);
      setBio(userData?.bio || '');
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
    }
  };

  const handleSaveDisplayName = async (newName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 空文字列の場合はXアカウントの名前を使用
      const nameToSave = newName.trim() || profile?.xUserName || 'ユーザー';

      // NGワードチェック
      const ngWordCheck = checkNGWords(nameToSave);
      if (!ngWordCheck.isValid) {
        Alert.alert('保存できません', ngWordCheck.message);
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ display_name: nameToSave })
        .eq('user_id', user.id);

      if (error) {
        Alert.alert('エラー', '名前の保存に失敗しました');
        return;
      }

      loadUserProfile();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  const handleSaveBio = async (newBio: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // NGワードチェック
      const ngWordCheck = checkNGWords(newBio);
      if (!ngWordCheck.isValid) {
        Alert.alert('保存できません', ngWordCheck.message);
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ bio: newBio })
        .eq('user_id', user.id);

      if (error) {
        Alert.alert('エラー', '自由記述の保存に失敗しました');
        return;
      }

      setBio(newBio);
      loadUserProfile();
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  return {
    loading,
    profile,
    currentUserId,
    bio,
    showNameEditModal,
    setShowNameEditModal,
    showBioEditModal,
    setShowBioEditModal,
    initialLoadCompleteRef,
    loadInitialData,
    loadUserProfile,
    handleSaveDisplayName,
    handleSaveBio,
  };
};
