import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';

type ThemeMode = 'system' | 'light' | 'dark';
type Theme = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  theme: Theme;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@kokoro_living_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 初期値を同期的に取得
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<'light' | 'dark'>(() => {
    return Appearance.getColorScheme() ?? 'light';
  });
  const [isLoading, setIsLoading] = useState(true);

  // システムテーマを監視
  useEffect(() => {
    // システムテーマの変更を監視
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme ?? 'light');
    });

    return () => subscription.remove();
  }, []);

  // 実際のテーマを計算
  const theme: Theme = themeMode === 'system'
    ? systemColorScheme
    : themeMode;

  // AsyncStorageから設定を読み込み
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved === 'system' || saved === 'light' || saved === 'dark')) {
          setThemeModeState(saved as ThemeMode);
        }
      } catch (error) {
        console.error('テーマ設定の読み込みエラー:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  // テーマモードを変更してAsyncStorageに保存
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      // システム設定に切り替える時は、現在のシステムテーマを再取得
      if (mode === 'system') {
        const current = Appearance.getColorScheme() ?? 'light';
        setSystemColorScheme(current);
      }
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('テーマ設定の保存エラー:', error);
    }
  };

  if (isLoading) {
    return null; // またはローディング画面
  }

  return (
    <ThemeContext.Provider value={{ themeMode, theme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
