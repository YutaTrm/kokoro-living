import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

import { supabase } from '@/src/lib/supabase';
import { UserProfile } from '@/src/types/profile';
import { pickAndCompressImage } from '@/src/utils/imageCompression';

interface UseAvatarOptions {
  profile: UserProfile | null;
  onSuccess: () => void;
}

export const useAvatar = ({ profile, onSuccess }: UseAvatarOptions) => {
  // アバター変更
  const handleAvatarChange = async () => {
    try {
      const compressedUri = await pickAndCompressImage();
      if (!compressedUri) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未ログイン');

      // 古いアバターを削除（存在する場合）
      if (profile?.avatarUrl && profile.avatarUrl.includes('/avatars/')) {
        const oldPath = profile.avatarUrl.split('/avatars/')[1];
        if (oldPath) {
          console.log('古い画像を削除:', oldPath);
          const { error: deleteError } = await supabase.storage.from('avatars').remove([oldPath]);
          if (deleteError) {
            console.error('古い画像の削除エラー:', deleteError);
          }
        }
      }

      // ファイル名を生成
      const fileExt = 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Supabase Storageにアップロード
      const base64 = await FileSystem.readAsStringAsync(compressedUri, {
        encoding: 'base64',
      });

      // Base64をUint8Arrayに変換
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, byteArray, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // usersテーブルのavatar_urlを更新
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      Alert.alert('成功', 'プロフィール画像を更新しました');
      onSuccess();
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      Alert.alert('エラー', '画像のアップロードに失敗しました');
    }
  };

  // アバター削除
  const handleAvatarDelete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未ログイン');

      // Storageから削除
      if (profile?.avatarUrl && profile.avatarUrl.includes('/avatars/')) {
        const oldPath = profile.avatarUrl.split('/avatars/')[1];
        if (oldPath) {
          console.log('削除するファイルパス:', oldPath);
          const { error: deleteError } = await supabase.storage.from('avatars').remove([oldPath]);
          if (deleteError) {
            console.error('Storage削除エラー:', deleteError);
          } else {
            console.log('Storageから削除成功');
          }
        }
      }

      // usersテーブルのavatar_urlをnullに更新
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      Alert.alert('成功', 'プロフィール画像を削除しました');
      onSuccess();
    } catch (error) {
      console.error('画像削除エラー:', error);
      Alert.alert('エラー', '画像の削除に失敗しました');
    }
  };

  // プロバイダーのアバターに戻す
  const handleAvatarReset = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未ログイン');

      const oauthAvatarUrl = user.user_metadata?.avatar_url;
      if (!oauthAvatarUrl) {
        Alert.alert('エラー', 'プロバイダーのアバター画像が見つかりません');
        return;
      }

      // カスタムアバターをStorageから削除
      if (profile?.avatarUrl && profile.avatarUrl.includes('/avatars/')) {
        const oldPath = profile.avatarUrl.split('/avatars/')[1];
        if (oldPath) {
          console.log('削除するファイルパス:', oldPath);
          const { error: deleteError } = await supabase.storage.from('avatars').remove([oldPath]);
          if (deleteError) {
            console.error('Storage削除エラー:', deleteError);
          } else {
            console.log('Storageから削除成功');
          }
        }
      }

      // usersテーブルのavatar_urlをOAuthアバターに更新
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: oauthAvatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      Alert.alert('成功', 'プロバイダーのアバター画像に戻しました');
      onSuccess();
    } catch (error) {
      console.error('アバターリセットエラー:', error);
      Alert.alert('エラー', 'アバターのリセットに失敗しました');
    }
  };

  return {
    handleAvatarChange,
    handleAvatarDelete,
    handleAvatarReset,
  };
};
