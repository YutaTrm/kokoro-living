import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// 広告ユニットID
const AD_UNIT_IDS = {
  ios: 'ca-app-pub-8595003034177265/7780715181',
  android: 'ca-app-pub-8595003034177265/6670991103',
};

// 開発時はテスト広告、本番は実際の広告
const getAdUnitId = () => {
  if (__DEV__) {
    return TestIds.BANNER;
  }
  return Platform.OS === 'ios' ? AD_UNIT_IDS.ios : AD_UNIT_IDS.android;
};

interface AdBannerProps {
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: Error) => void;
}

export default function AdBanner({ onAdLoaded, onAdFailedToLoad }: AdBannerProps) {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const adUnitId = getAdUnitId();

  return (
    <View
      style={{
        width: '100%',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        minHeight: isAdLoaded ? undefined : 50,
      }}
    >
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          setIsAdLoaded(true);
          onAdLoaded?.();
        }}
        onAdFailedToLoad={(error) => {
          console.log('Ad failed to load:', error);
          onAdFailedToLoad?.(error);
        }}
      />
    </View>
  );
}
