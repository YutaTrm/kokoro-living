import { useFocusEffect, useRouter } from 'expo-router';
import { Pencil, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, TouchableOpacity } from 'react-native';

import ConfirmModal from '@/components/ConfirmModal';
import LoginPrompt from '@/components/LoginPrompt';
import PostItem from '@/components/PostItem';
import DatePickerModal from '@/components/profile/DatePickerModal';
import MedicalSection from '@/components/profile/MedicalSection';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileTabBar, { TabType } from '@/components/profile/ProfileTabBar';
import TextEditModal from '@/components/profile/TextEditModal';
import MultiSelectModal from '@/components/search/MultiSelectModal';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
} from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { AIReflectionCard } from '@/components/profile/AIReflectionCard';
import { AIReflectionTab } from '@/components/profile/AIReflectionTab';
import { useAiReflection } from '@/src/hooks/useAiReflection';
import { useAvatar } from '@/src/hooks/useAvatar';
import { useFollow } from '@/src/hooks/useFollow';
import { useMedicalRecords } from '@/src/hooks/useMedicalRecords';
import { Post, usePostsData } from '@/src/hooks/usePostsData';
import { useProfileData } from '@/src/hooks/useProfileData';
import { usePurchase } from '@/src/hooks/usePurchase';
import { supabase } from '@/src/lib/supabase';
import { AIReflection } from '@/src/types/profile';

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const isMenuOpenRef = useRef(false);

  // Purchase modal states
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPurchaseConfirmModal, setShowPurchaseConfirmModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Profile data hook
  const {
    loading,
    profile,
    currentUserId,
    bio,
    showNameEditModal,
    setShowNameEditModal,
    showBioEditModal,
    setShowBioEditModal,
    initialLoadCompleteRef,
    loadInitialData,
    loadUserProfile,
    handleSaveDisplayName,
    handleSaveBio,
  } = useProfileData();

  // Follow counts
  const { counts: followCounts, refetch: refetchFollowCounts } = useFollow(currentUserId);

  // Medical records hook
  const medicalRecords = useMedicalRecords(currentUserId);

  // AI reflection hook
  const aiReflection = useAiReflection();

  // Purchase hook
  const { products, purchasing, handlePurchase } = usePurchase({
    onPurchaseComplete: () => {
      aiReflection.resetRefs();
      aiReflection.loadTicketInfo();
    },
  });

  // Avatar hook
  const { handleAvatarChange, handleAvatarDelete, handleAvatarReset } = useAvatar({
    profile,
    onSuccess: loadUserProfile,
  });

  // Posts data
  const {
    userPosts,
    userReplies,
    loadingPosts,
    loadingReplies,
    loadUserPosts,
    loadUserReplies,
  } = usePostsData();

  // Initial load
  useEffect(() => {
    medicalRecords.loadFromCache();
    loadInitialData().then((userId) => {
      if (userId) {
        medicalRecords.loadAllMedicalData(userId);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        loadInitialData().then((userId) => {
          if (userId) {
            medicalRecords.loadAllMedicalData(userId);
          }
        });
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab change effect
  useEffect(() => {
    if (activeTab === 'posts') {
      loadUserPosts();
    } else if (activeTab === 'replies') {
      loadUserReplies();
    } else if (activeTab === 'ai-reflection') {
      aiReflection.loadAiReflections(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Focus effect for follow counts
  useFocusEffect(
    useCallback(() => {
      if (!initialLoadCompleteRef.current) return;

      const timer = setTimeout(() => {
        if (currentUserId && !isMenuOpenRef.current) {
          refetchFollowCounts();
        }
      }, 500);
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUserId])
  );

  // Focus effect for AI reflection tab
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useFocusEffect(
    useCallback(() => {
      if (activeTabRef.current === 'ai-reflection') {
        aiReflection.loadAiReflections(true);
        aiReflection.loadTicketInfo();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Load ticket info when switching to AI reflection tab
  useEffect(() => {
    if (activeTab === 'ai-reflection') {
      aiReflection.loadTicketInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleMenuOpenChange = useCallback((isOpen: boolean) => {
    isMenuOpenRef.current = isOpen;
  }, []);

  // Purchase handlers
  const handlePurchaseTicket = () => {
    setShowPurchaseModal(true);
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    setShowPurchaseModal(false);
    setShowPurchaseConfirmModal(true);
  };

  const handleConfirmPurchase = () => {
    setShowPurchaseConfirmModal(false);
    if (selectedProductId) {
      handlePurchase(selectedProductId);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Navigation handlers
  const handleFollowingPress = () => {
    if (currentUserId) {
      router.push(`/(tabs)/(profile)/user/${currentUserId}/following`);
    }
  };

  const handleFollowersPress = () => {
    if (currentUserId) {
      router.push(`/(tabs)/(profile)/user/${currentUserId}/followers`);
    }
  };

  const renderHeader = () => (
    <>
      <ProfileHeader
        profile={profile!}
        onEditName={() => setShowNameEditModal(true)}
        onAvatarChange={handleAvatarChange}
        onAvatarDelete={handleAvatarDelete}
        onAvatarReset={handleAvatarReset}
        followCounts={followCounts}
        onFollowingPress={handleFollowingPress}
        onFollowersPress={handleFollowersPress}
        onMenuOpenChange={handleMenuOpenChange}
      />

      <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'profile' && (
        <>
          <MedicalSection
            title="診断名"
            records={medicalRecords.diagnoses}
            onAdd={() => medicalRecords.openMultiSelectModal('diagnosis')}
            onDelete={medicalRecords.deleteDiagnosis}
            onEdit={(id) => medicalRecords.openDateEditModal(id, 'diagnosis')}
            loading={medicalRecords.loadingDiagnoses}
          />
          <MedicalSection
            title="服薬"
            records={medicalRecords.medications}
            onAdd={() => medicalRecords.openMultiSelectModal('medication')}
            onDelete={medicalRecords.deleteMedication}
            onEdit={(id) => medicalRecords.openDateEditModal(id, 'medication')}
            loading={medicalRecords.loadingMedications}
          />
          <MedicalSection
            title="治療"
            records={medicalRecords.treatments}
            onAdd={() => medicalRecords.openMultiSelectModal('treatment')}
            onDelete={medicalRecords.deleteTreatment}
            onEdit={(id) => medicalRecords.openDateEditModal(id, 'treatment')}
            loading={medicalRecords.loadingTreatments}
          />
          <MedicalSection
            title="ステータス"
            records={medicalRecords.statuses}
            onAdd={() => medicalRecords.openMultiSelectModal('status')}
            onDelete={medicalRecords.deleteStatus}
            onEdit={(id) => medicalRecords.openDateEditModal(id, 'status')}
            loading={medicalRecords.loadingStatuses}
          />

          <Box className="p-4 border-t border-outline-200">
            <HStack className="justify-between items-center mb-2">
              <Heading size="lg">自由記述</Heading>
              <TouchableOpacity onPress={() => setShowBioEditModal(true)} className="p-1">
                <Icon as={Pencil} size="md" className="text-typography-500" />
              </TouchableOpacity>
            </HStack>
            {bio ? (
              <Text className="text-lg p-2 bg-background-50 rounded-lg">{bio}</Text>
            ) : (
              <Text className="text-lg text-typography-400 text-center py-2">まだ登録がありません</Text>
            )}
          </Box>

          <Box className="p-4 border-t border-outline-200">
            <Button
              onPress={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  router.push(`/(tabs)/(profile)/user/${user.id}`);
                }
              }}
              variant="outline"
              className="w-full"
            >
              <ButtonText>自分のプロフィール画面</ButtonText>
            </Button>
          </Box>
        </>
      )}

      {activeTab === 'ai-reflection' && (
        <AIReflectionTab
          loadingTicketInfo={aiReflection.loadingTicketInfo}
          freeQuotaRemaining={aiReflection.freeQuotaRemaining}
          ticketCount={aiReflection.ticketCount}
          hasFreeQuota={aiReflection.hasFreeQuota}
          generating={aiReflection.generating}
          purchasing={purchasing}
          loadingReflections={aiReflection.loadingReflections}
          aiReflections={aiReflection.aiReflections}
          onPurchaseTicket={handlePurchaseTicket}
          onGenerateReflection={aiReflection.handleGenerateReflection}
        />
      )}
    </>
  );

  const getCurrentData = () => {
    switch (activeTab) {
      case 'posts':
        return userPosts;
      case 'replies':
        return userReplies;
      case 'ai-reflection':
        return aiReflection.aiReflections;
      default:
        return [];
    }
  };

  const renderEmptyComponent = () => {
    if (activeTab === 'profile') return null;

    const isLoading =
      (activeTab === 'posts' && loadingPosts) ||
      (activeTab === 'replies' && loadingReplies) ||
      (activeTab === 'ai-reflection' && aiReflection.loadingReflections);

    if (isLoading) {
      return (
        <Box className="py-8 items-center">
          <Spinner size="large" />
        </Box>
      );
    }

    const messages = {
      posts: 'まだ投稿がありません',
      replies: 'まだ返信がありません',
      'ai-reflection': 'まだ振り返りがありません',
    };

    return (
      <Box className="px-5">
        <Text className="text-lg opacity-50 text-center py-8">
          {messages[activeTab as keyof typeof messages]}
        </Text>
      </Box>
    );
  };

  const renderLoadingHeader = () => (
    <>
      <Box className="p-4">
        <HStack className="mt-2" space="md">
          <Box className="w-16 h-16 bg-background-200 rounded-full" />
          <VStack className="flex-1 justify-center" space="xs">
            <Box className="h-6 w-32 bg-background-200 rounded" />
            <Box className="h-4 w-48 bg-background-200 rounded" />
          </VStack>
        </HStack>
      </Box>
      <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );

  const renderItem = useCallback(({ item }: { item: Post | AIReflection }) => {
    if (activeTab === 'ai-reflection') {
      return <AIReflectionCard reflection={item as AIReflection} />;
    }
    return <PostItem post={item as Post} />;
  }, [activeTab]);

  const handleLoadMore = () => {
    if (activeTab === 'ai-reflection') {
      aiReflection.handleLoadMoreReflections();
    }
  };

  const isLoadingMore = activeTab === 'ai-reflection' && aiReflection.loadingMoreReflections;

  return (
    <LoginPrompt>
      <Box className="flex-1">
        <FlatList
          data={getCurrentData()}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={!profile ? renderLoadingHeader : renderHeader}
          ListEmptyComponent={renderEmptyComponent}
          ListFooterComponent={
            isLoadingMore ? (
              <Box className="py-4 items-center">
                <Spinner size="small" />
              </Box>
            ) : null
          }
          onEndReached={activeTab === 'ai-reflection' ? handleLoadMore : undefined}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
        />
      </Box>

      <MultiSelectModal
        isOpen={medicalRecords.showMultiSelectModal}
        onClose={() => medicalRecords.setShowMultiSelectModal(false)}
        title={
          medicalRecords.selectModalType === 'diagnosis' ? '診断名を選択' :
          medicalRecords.selectModalType === 'medication' ? '服薬を選択' :
          medicalRecords.selectModalType === 'treatment' ? '治療を選択' :
          'ステータスを選択'
        }
        subtitle={medicalRecords.selectModalType === 'medication' ? '同じ成分の薬は同時に選択されます' : undefined}
        options={
          medicalRecords.selectModalType === 'diagnosis' ? medicalRecords.diagnosisMasters.map(d => ({ id: d.id, name: d.name })) :
          medicalRecords.selectModalType === 'medication' ? medicalRecords.medicationMasters.map(m => ({ id: m.id, name: m.name })) :
          medicalRecords.selectModalType === 'treatment' ? medicalRecords.treatmentMasters.map(t => ({ id: t.id, name: t.name })) :
          medicalRecords.statusMasters.map(s => ({ id: s.id, name: s.name }))
        }
        selectedIds={medicalRecords.currentSelectedIds}
        onSave={medicalRecords.handleMultiSelectSave}
        onToggle={medicalRecords.selectModalType === 'medication' ? medicalRecords.handleMedicationToggle : undefined}
      />

      <DatePickerModal
        isOpen={medicalRecords.showDateModal}
        onClose={medicalRecords.closeDateModal}
        onSave={medicalRecords.updateRecordDate}
        initialStartYear={medicalRecords.startYear}
        initialStartMonth={medicalRecords.startMonth}
        initialEndYear={medicalRecords.endYear}
        initialEndMonth={medicalRecords.endMonth}
      />

      <TextEditModal
        isOpen={showNameEditModal}
        onClose={() => setShowNameEditModal(false)}
        onSave={handleSaveDisplayName}
        title="名前を編集"
        placeholder="表示名を入力"
        initialValue={profile?.userName || ''}
        maxLength={50}
        multiline={false}
      />

      <TextEditModal
        isOpen={showBioEditModal}
        onClose={() => setShowBioEditModal(false)}
        onSave={handleSaveBio}
        title="自由記述を編集"
        placeholder="自己紹介など"
        initialValue={bio}
        maxLength={500}
        multiline
      />

      <ConfirmModal
        isOpen={aiReflection.showGenerateConfirmModal}
        onClose={() => aiReflection.setShowGenerateConfirmModal(false)}
        onConfirm={aiReflection.handleConfirmGenerate}
        title="AI振り返りを生成"
        message={aiReflection.generateConfirmMessage}
        confirmText="生成する"
        confirmAction="primary"
        note={aiReflection.generateConfirmNote}
      />

      <Modal isOpen={showPurchaseModal} onClose={() => setShowPurchaseModal(false)}>
        <ModalBackdrop />
        <ModalContent className="max-w-md">
          <ModalHeader>
            <Heading size="lg">チケットを購入</Heading>
            <ModalCloseButton>
              <Icon as={X} size="lg" className="text-typography-500" />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody className="mb-0">
            {products.length === 0 ? (
              <Text className="text-center text-typography-500 py-4">
                現在購入可能な商品はありません
              </Text>
            ) : (
              <VStack space="sm">
                {products.map((product) => (
                  <Button
                    key={product.id}
                    onPress={() => handleSelectProduct(product.id)}
                    isDisabled={purchasing}
                    variant="solid"
                    size="md"
                    action="positive"
                  >
                    <ButtonText>{product.title} {product.displayPrice}</ButtonText>
                  </Button>
                ))}
                <Button
                  onPress={() => setShowPurchaseModal(false)}
                  variant="outline"
                  size="md"
                  className="mt-4"
                >
                  <ButtonText>キャンセル</ButtonText>
                </Button>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <ConfirmModal
        isOpen={showPurchaseConfirmModal}
        onClose={() => setShowPurchaseConfirmModal(false)}
        onConfirm={handleConfirmPurchase}
        title="購入確認"
        message={selectedProduct ? `${selectedProduct.title}を${selectedProduct.displayPrice}で購入しますか？` : ''}
        confirmText="購入する"
        confirmAction="primary"
      />
    </LoginPrompt>
  );
}
