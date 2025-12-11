import { Sparkles, TicketPlus } from 'lucide-react-native';
import { Image, Platform } from 'react-native';
import { Product } from 'react-native-iap';

import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { AIReflection } from '@/src/types/profile';

// AIアバター画像
const AI_AVATAR = require('@/assets/images/living-ai.png');

interface AIReflectionTabProps {
  loadingTicketInfo: boolean;
  freeQuotaRemaining: number;
  ticketCount: number;
  hasFreeQuota: boolean;
  generating: boolean;
  purchasing: boolean;
  loadingReflections: boolean;
  aiReflections: AIReflection[];
  onPurchaseTicket: () => void;
  onGenerateReflection: () => void;
}

export const AIReflectionTab = ({
  loadingTicketInfo,
  freeQuotaRemaining,
  ticketCount,
  hasFreeQuota,
  generating,
  purchasing,
  loadingReflections,
  aiReflections,
  onPurchaseTicket,
  onGenerateReflection,
}: AIReflectionTabProps) => {
  return (
    <Box className="p-4">
      <VStack space="sm">
        {/* 説明 */}
        <HStack space="md" className="items-start">
          <Card className="flex-1 bg-background-0">
            <HStack>
              <VStack className="items-center flex-shrink-0">
                <Image
                  source={AI_AVATAR}
                  className="w-12 h-12 rounded-full border-2 border-secondary-400"
                />
                <Text className="text-xs font-semibold text-typography-500 mt-1">AIのリビくん</Text>
              </VStack>
              <VStack space="sm" className="ml-3 flex-1 flex-shrink gap-1">
                <Text className="text-sm text-typography-600">
                  あなたのアプリ内のアクション(投稿/返信/チェックイン等)を元にAIが振り返りを生成します。
                </Text>
                <Text className="text-sm text-typography-600 font-semibold">
                  前回の生成から3日以上経過し、新しいデータが十分に溜まっている必要があります。
                </Text>
              </VStack>
            </HStack>
          </Card>
        </HStack>

        {/* チケット情報 */}
        {loadingTicketInfo ? (
          <Box className="p-4 items-center">
            <Spinner />
          </Box>
        ) : (
          <Card className="bg-background-10">
            <VStack space="sm">
              <HStack className="justify-between items-center">
                <Heading size="sm">今月の無料チケット</Heading>
                <Text className="text-base">
                  {freeQuotaRemaining} 枚
                </Text>
              </HStack>
              <HStack className="justify-between items-center">
                <Heading size="sm">有料チケット所持数</Heading>
                <Text className="text-base">
                  {ticketCount} 枚
                </Text>
              </HStack>
            </VStack>
          </Card>
        )}

        {/* 生成ボタン・購入ボタン */}
        {!loadingTicketInfo && (
          <VStack space="sm">
            <HStack space="sm">
              {/* チケット追加ボタン（iOSのみ） */}
              {Platform.OS === 'ios' && (
                <Button
                  onPress={onPurchaseTicket}
                  isDisabled={purchasing}
                  size="lg"
                  variant="outline"
                  className="flex-1"
                >
                  {purchasing ? (
                    <>
                      <ButtonSpinner />
                      <ButtonText>購入中...</ButtonText>
                    </>
                  ) : (
                    <>
                      <ButtonIcon as={TicketPlus} />
                      <ButtonText>チケットを購入</ButtonText>
                    </>
                  )}
                </Button>
              )}
              {/* AI振り返りを生成ボタン */}
              <Button
                onPress={onGenerateReflection}
                isDisabled={generating || (!hasFreeQuota && ticketCount === 0)}
                size="lg"
                className={Platform.OS === 'ios' ? 'flex-1' : 'w-full'}
              >
                {generating ? (
                  <>
                    <ButtonSpinner />
                    <ButtonText>生成中...</ButtonText>
                  </>
                ) : (
                  <>
                    <ButtonIcon as={Sparkles} />
                    <ButtonText>AI振り返りを生成</ButtonText>
                  </>
                )}
              </Button>
            </HStack>
            {!hasFreeQuota && (
              <Text className="text-center text-typography-400 text-sm">
                無料チケットは毎月月初に2枚追加されます
              </Text>
            )}
          </VStack>
        )}

        {/* 振り返り一覧のヘッダー（リストはFlatListで表示） */}
        {!loadingReflections && aiReflections.length > 0 && (
          <Heading size="md" className="mt-4">生成された振り返り</Heading>
        )}
      </VStack>
    </Box>
  );
};
