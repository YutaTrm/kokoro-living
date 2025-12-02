import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

interface Diagnosis {
  id: string;
  name: string;
  display_flag?: boolean;
  display_order?: number;
}

interface Ingredient {
  id: string;
  name: string;
  description?: string;
  display_flag?: boolean;
  display_order?: number;
}

interface Treatment {
  id: string;
  name: string;
  display_flag?: boolean;
  display_order?: number;
}

interface Status {
  id: string;
  name: string;
  display_flag?: boolean;
  display_order?: number;
}

interface Product {
  id: string;
  name: string;
  ingredient_id: string;
}

interface MasterData {
  diagnoses: Diagnosis[];
  ingredients: Ingredient[];
  treatments: Treatment[];
  statuses: Status[];
  products: Product[];
}

interface MasterDataContextType {
  data: MasterData;
  loading: boolean;
  refresh: () => Promise<void>;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

const CACHE_KEY = 'master_data_cache_v2'; // v2: display_flag, display_order, ingredient_id追加
const CACHE_TIMESTAMP_KEY = 'master_data_timestamp_v2';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間

export function MasterDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MasterData>({
    diagnoses: [],
    ingredients: [],
    treatments: [],
    statuses: [],
    products: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      // キャッシュをチェック
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();

        // キャッシュが有効期限内なら使用
        if (now - timestamp < CACHE_DURATION) {
          setData(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
      }

      // キャッシュがないか期限切れの場合、Supabaseから取得
      await fetchFromSupabase();
    } catch (error) {
      console.error('マスターデータ読み込みエラー:', error);
      // エラーでもキャッシュがあれば使用
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setData(JSON.parse(cachedData));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFromSupabase = async () => {
    try {
      // 並列で取得
      const [diagnosesRes, ingredientsRes, treatmentsRes, statusesRes, productsRes] = await Promise.all([
        supabase.from('diagnoses').select('id, name, display_flag, display_order').order('name'),
        supabase.from('ingredients').select('id, name, description, display_flag, display_order').order('name'),
        supabase.from('treatments').select('id, name, display_flag, display_order').order('name'),
        supabase.from('statuses').select('id, name, display_flag, display_order').order('name'),
        supabase.from('products').select('id, name, ingredient_id').order('name'),
      ]);

      const newData: MasterData = {
        diagnoses: diagnosesRes.data || [],
        ingredients: ingredientsRes.data || [],
        treatments: treatmentsRes.data || [],
        statuses: statusesRes.data || [],
        products: productsRes.data || [],
      };

      setData(newData);

      // キャッシュに保存
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newData));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('Supabaseからのマスターデータ取得エラー:', error);
      throw error;
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      await fetchFromSupabase();
    } finally {
      setLoading(false);
    }
  };

  return (
    <MasterDataContext.Provider value={{ data, loading, refresh }}>
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
}
