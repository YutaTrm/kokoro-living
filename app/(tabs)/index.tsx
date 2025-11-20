import { StyleSheet, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, View } from '@/components/Themed';
import XLogo from '@/components/icons/XLogo';
import { supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function TabOneScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkLoginStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
    setLoading(false);
  };
  const handleXLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: 'kokoroliving://',
        },
      });

      if (error) {
        console.error('ログインエラー:', error);
        Alert.alert('ログインエラー', error.message);
        return;
      }

      if (data?.url) {
        console.log('認証URL:', data.url);
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'kokoroliving://'
        );

        console.log('認証結果:', result);

        if (result.type === 'success') {
          const url = result.url;
          console.log('コールバックURL（完全）:', url);

          // URLからトークンを取得してセッションを確立
          const hashPart = url.split('#')[1];
          const queryPart = url.split('?')[1];
          console.log('ハッシュ部分:', hashPart);
          console.log('クエリ部分:', queryPart);

          const params = new URLSearchParams(hashPart || queryPart);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          console.log('access_token:', accessToken ? '取得成功' : '取得失敗');
          console.log('refresh_token:', refreshToken ? '取得成功' : '取得失敗');

          if (accessToken && refreshToken) {
            console.log('セッション確立を試行中...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('セッションエラー:', sessionError);
              Alert.alert('エラー', 'ログインに失敗しました: ' + sessionError.message);
            } else {
              console.log('セッション確立成功！');
              Alert.alert('成功', 'ログインしました');
            }
          } else {
            console.error('トークンが見つかりません');
            Alert.alert('エラー', 'トークンを取得できませんでした');
          }
        } else if (result.type === 'cancel') {
          console.log('ユーザーがキャンセルしました');
        } else {
          console.log('認証結果:', result.type);
        }
      }
    } catch (error) {
      console.error('エラー:', error);
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

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.xButton} onPress={handleXLogin}>
          <XLogo width={20} height={20} color="#FFFFFF" />
          <Text style={styles.xButtonText}>Xアカウントで登録</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ログイン済み: タイムライン表示
  return (
    <View style={styles.timelineContainer}>
      <FlatList
        data={[]}
        renderItem={() => null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>まだ投稿がありません</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fabButton}>
        <FontAwesome name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.5,
  },
  xButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
  },
  xButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#45a393',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
