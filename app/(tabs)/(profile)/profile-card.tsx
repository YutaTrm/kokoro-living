import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';

import DefaultAvatar from '@/components/icons/DefaultAvatar';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { supabase } from '@/src/lib/supabase';

interface MedicalRecord {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

export default function ProfileCardScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
  } | null>(null);
  const [diagnoses, setDiagnoses] = useState<MedicalRecord[]>([]);
  const [treatments, setTreatments] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<MedicalRecord[]>([]);
  const [statuses, setStatuses] = useState<MedicalRecord[]>([]);

  useEffect(() => {
    loadProfileCard();
  }, []);

  const loadProfileCard = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      console.log('ユーザーID:', user.id);

      // ユーザー情報取得
      const { data: userData } = await supabase
        .from('users')
        .select('display_name, avatar_url, bio')
        .eq('user_id', user.id)
        .single();

      if (userData) {
        setProfile({
          displayName: userData.display_name,
          avatarUrl: userData.avatar_url,
          bio: userData.bio,
        });
      }

      // 診断名取得
      const { data: diagnosesData, error: diagnosesError } = await supabase
        .from('user_diagnoses')
        .select('id, start_date, end_date, diagnoses(name)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      console.log('診断名データ:', diagnosesData, 'エラー:', diagnosesError);

      if (diagnosesData) {
        setDiagnoses(
          diagnosesData.map((d: any) => ({
            id: d.id,
            name: d.diagnoses?.name || '',
            startDate: d.start_date,
            endDate: d.end_date,
          }))
        );
      }

      // 治療法取得
      const { data: treatmentsData, error: treatmentsError } = await supabase
        .from('user_treatments')
        .select('id, start_date, end_date, treatments(name)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      console.log('治療法データ:', treatmentsData, 'エラー:', treatmentsError);

      if (treatmentsData) {
        setTreatments(
          treatmentsData.map((t: any) => ({
            id: t.id,
            name: t.treatments?.name || '',
            startDate: t.start_date,
            endDate: t.end_date,
          }))
        );
      }

      // 服薬取得
      const { data: medicationsData, error: medicationsError } = await supabase
        .from('user_medications')
        .select('id, ingredient_id, ingredients(id, name), products(name), start_date, end_date')
        .eq('user_id', user.id);

      const { data: allProducts } = await supabase
        .from('products')
        .select('ingredient_id, name');

      console.log('服薬データ:', medicationsData, 'エラー:', medicationsError);

      if (medicationsData) {
        const productsByIngredient = new Map<string, string[]>();
        if (allProducts) {
          allProducts.forEach((p: { ingredient_id: string; name: string }) => {
            const existing = productsByIngredient.get(p.ingredient_id);
            if (existing) {
              existing.push(p.name);
            } else {
              productsByIngredient.set(p.ingredient_id, [p.name]);
            }
          });
        }

        const ingredientMap = new Map<string, {
          id: string;
          ingredientName: string;
          ingredientId: string;
          startDate: string | null;
          endDate: string | null;
        }>();

        medicationsData.forEach((m: any) => {
          const ingredientId = m.ingredient_id;
          const ingredientName = m.ingredients?.name || '';

          if (ingredientName && ingredientId && !ingredientMap.has(ingredientId)) {
            ingredientMap.set(ingredientId, {
              id: m.id,
              ingredientName,
              ingredientId,
              startDate: m.start_date,
              endDate: m.end_date,
            });
          }
        });

        const formatted: MedicalRecord[] = Array.from(ingredientMap.values()).map(item => {
          const productNames = productsByIngredient.get(item.ingredientId) || [];
          return {
            id: item.id,
            name: productNames.length > 0
              ? `${item.ingredientName}(${productNames.join('、')})`
              : item.ingredientName,
            startDate: item.startDate,
            endDate: item.endDate,
          };
        });

        setMedications(formatted);
      }

      // ステータス取得
      const { data: statusesData, error: statusesError } = await supabase
        .from('user_statuses')
        .select('id, statuses(name)')
        .eq('user_id', user.id);

      console.log('ステータスデータ:', statusesData, 'エラー:', statusesError);

      if (statusesData) {
        setStatuses(
          statusesData.map((s: any) => ({
            id: s.id,
            name: s.statuses?.name || '',
            startDate: null,
            endDate: null,
          }))
        );
      }
    } catch (error) {
      console.error('プロフィールカード読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box className="flex-1 items-center justify-center">
        <Spinner size="large" />
      </Box>
    );
  }

  const renderCompactSection = (title: string, records: MedicalRecord[]) => {
    if (records.length === 0) {
      return (
        <Box className="flex-1 bg-background-100 p-2">
          <Heading size="sm" className="mb-2">{title}</Heading>
          <Text className="text-sm text-typography-400">なし</Text>
        </Box>
      );
    }

    return (
      <Box className="flex-1 bg-background-100 p-2">
        <Heading size="sm" className="mb-2">{title}</Heading>
        <VStack space="xs">
          {records.map((record) => (
            <Text key={record.id} className="text-sm">
              ・{record.name}
            </Text>
          ))}
        </VStack>
      </Box>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'プロフィールカード' }} />
      <ScrollView className="flex-1 bg-background-0">
        {/* ユーザー情報ヘッダー */}
        <Box className="p-4 border-b border-outline-200">
          <HStack space="md" className="items-center">
            <Avatar size="xl">
              {profile?.avatarUrl ? (
                <AvatarImage source={{ uri: profile.avatarUrl }} />
              ) : (
                <DefaultAvatar size={80} />
              )}
            </Avatar>
            <VStack className="flex-1">
              <Heading size="xl">{profile?.displayName || 'ユーザー'}</Heading>
            </VStack>
          </HStack>
        </Box>

        {/* 医療情報セクション - 2カラムレイアウト */}
        <Box className="p-4 border-t border-outline-200">
          <HStack space="md" className="mb-4">
            {renderCompactSection('診断名', diagnoses)}
            {renderCompactSection('服薬', medications)}
          </HStack>
          <HStack space="md">
            {renderCompactSection('治療', treatments)}
            {renderCompactSection('ステータス', statuses)}
          </HStack>
        </Box>

        {/* Bio */}
        <Box className="p-4 border-t border-outline-200">
          <Heading size="md" className="mb-2">自由記述</Heading>
          {profile?.bio ? (
            <Text className="text-lg p-2 bg-background-50">{profile.bio}</Text>
          ) : (
            <Text className="text-lg text-typography-400 text-center py-2"> </Text>
          )}
        </Box>
      </ScrollView>
    </>
  );
}
