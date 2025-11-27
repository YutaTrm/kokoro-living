import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView } from 'react-native';

import { Text } from '@/components/Themed';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { CheckIcon } from 'lucide-react-native';

const TERMS_AGREEMENT_KEY = 'terms_agreement_accepted';

export default function TermsAgreementScreen() {
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const handleAccept = async () => {
    if (!termsAccepted || !privacyAccepted) {
      return;
    }

    try {
      await AsyncStorage.setItem(TERMS_AGREEMENT_KEY, 'true');
      router.replace('/(tabs)/(home)');
    } catch (error) {
      console.error('同意状態の保存エラー:', error);
    }
  };

  const openTerms = () => {
    Linking.openURL('https://yutatrm.github.io/kokoro-living/terms.html');
  };

  const openPrivacy = () => {
    Linking.openURL('https://yutatrm.github.io/kokoro-living/privacy.html');
  };

  return (
    <Box className="flex-1 bg-background-0">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <VStack space="lg" className="py-8">
          <VStack space="md">
            <Heading size="2xl" className="text-center">
              こころのリビングへようこそ
            </Heading>
            <Text className="text-center text-typography-500">
              ご利用前に、利用規約とプライバシーポリシーへの同意が必要です
            </Text>
          </VStack>

          <Box className="bg-background-50 p-6 rounded-lg border border-outline-200">
            <Heading size="lg" className="mb-4">
              コミュニティガイドライン
            </Heading>
            <Text className="mb-3">
              こころのリビングは、すべてのユーザーが安全で快適に利用できる環境を目指しています。
            </Text>
            <Text className="font-semibold mb-2">以下のような行為は禁止されています：</Text>
            <VStack space="xs" className="ml-4">
              <Text>• ハラスメント、ヘイトスピーチ、暴力的な発言</Text>
              <Text>• スパム、詐欺行為</Text>
              <Text>• 他人の個人情報の公開</Text>
              <Text>• わいせつなコンテンツ</Text>
              <Text>• その他、利用規約に違反する行為</Text>
            </VStack>
            <Text className="mt-3 text-typography-700">
              違反した場合、アカウント停止の措置を取る場合があります。
            </Text>
          </Box>

          <Box className="bg-info-50 p-6 rounded-lg border border-info-200">
            <Heading size="md" className="mb-3">
              通報機能について
            </Heading>
            <Text>
              不適切なコンテンツを見つけた場合は、投稿詳細画面から通報できます。
            </Text>
            <Text className="mt-2 font-semibold">
              通報されたコンテンツは24時間以内に確認し、適切な対応を行います。
            </Text>
          </Box>

          <VStack space="md" className="mt-4">
            <Checkbox
              value="terms"
              isChecked={termsAccepted}
              onChange={setTermsAccepted}
              size="md"
            >
              <CheckboxIndicator>
                <CheckboxIcon as={CheckIcon} />
              </CheckboxIndicator>
              <CheckboxLabel className="ml-2">
                <Text>
                  <Text
                    className="text-primary-500 underline"
                    onPress={openTerms}
                  >
                    利用規約
                  </Text>
                  に同意します
                </Text>
              </CheckboxLabel>
            </Checkbox>

            <Checkbox
              value="privacy"
              isChecked={privacyAccepted}
              onChange={setPrivacyAccepted}
              size="md"
            >
              <CheckboxIndicator>
                <CheckboxIcon as={CheckIcon} />
              </CheckboxIndicator>
              <CheckboxLabel className="ml-2">
                <Text>
                  <Text
                    className="text-primary-500 underline"
                    onPress={openPrivacy}
                  >
                    プライバシーポリシー
                  </Text>
                  に同意します
                </Text>
              </CheckboxLabel>
            </Checkbox>
          </VStack>

          <Button
            onPress={handleAccept}
            isDisabled={!termsAccepted || !privacyAccepted}
            className="mt-6"
            size="lg"
          >
            <ButtonText>同意して始める</ButtonText>
          </Button>

          <Text className="text-center text-sm text-typography-400 mt-4">
            上記に同意いただけない場合、アプリをご利用いただけません
          </Text>
        </VStack>
      </ScrollView>
    </Box>
  );
}
