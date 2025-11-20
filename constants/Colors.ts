// こころのリビング カラーパレット
const primaryGreen = '#45a393'; // 濃い緑（メインカラー）
const lightGreen = '#9dd4cb'; // 薄い緑（背景色）
const paleGreen = '#e8f5f2'; // 極薄い緑（カード背景）
const accentCoral = '#f08080'; // サーモンピンク（重要な項目）
const darkText = '#2d6b5f'; // 濃い緑（テキスト）
const borderGreen = '#d0e8e3'; // ボーダー色

const tintColorLight = primaryGreen;
const tintColorDark = '#fff';

export default {
  light: {
    text: darkText,
    background: '#ffffff',
    tint: tintColorLight,
    tabIconDefault: '#a3d9d0',
    tabIconSelected: primaryGreen,
    primary: primaryGreen,
    primaryLight: lightGreen,
    accent: accentCoral,
    border: borderGreen,
    cardBackground: paleGreen,
  },
  dark: {
    text: '#fff',
    background: '#1a1a1a',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
    primary: primaryGreen,
    primaryLight: lightGreen,
    accent: accentCoral,
    border: '#3a3a3a',
    cardBackground: '#2a2a2a',
  },
};
