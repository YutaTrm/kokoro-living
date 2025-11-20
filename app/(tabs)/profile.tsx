import { StyleSheet, Image, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';

import { Text, View } from '@/components/Themed';
import { supabase } from '@/src/lib/supabase';

interface UserProfile {
  avatarUrl: string | null;
  userName: string | null;
  createdAt: string | null;
}

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        setLoading(false);
        return;
      }

      const userProfile: UserProfile = {
        avatarUrl: user.user_metadata?.avatar_url || null,
        userName: user.user_metadata?.user_name || user.user_metadata?.full_name || null,
        createdAt: user.created_at || null,
      };

      setProfile(userProfile);
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('エラー', 'ログアウトに失敗しました');
        return;
      }
      setProfile(null);
    } catch (error) {
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>ログインしていません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {profile.avatarUrl && (
        <Image
          source={{ uri: profile.avatarUrl }}
          style={styles.avatar}
        />
      )}
      {profile.userName && (
        <Text style={styles.userName}>{profile.userName}</Text>
      )}
      {profile.createdAt && (
        <Text style={styles.createdAt}>
          登録日時: {new Date(profile.createdAt).toLocaleDateString('ja-JP')}
        </Text>
      )}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>ログアウト</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  createdAt: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    opacity: 0.7,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
