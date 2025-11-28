import Svg, { Circle, Path } from 'react-native-svg';

interface DefaultAvatarProps {
  size?: number;
}

export default function DefaultAvatar({ size = 48 }: DefaultAvatarProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* 背景円 */}
      <Circle cx="24" cy="24" r="24" fill="#E5E7EB" />

      {/* 人型アイコン */}
      <Path
        d="M24 24c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm0 3.5c-4.667 0-14 2.34-14 7v3.5h28v-3.5c0-4.66-9.333-7-14-7z"
        fill="#9CA3AF"
      />
    </Svg>
  );
}
