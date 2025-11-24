import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase';

export interface MedicationMaster {
  id: string;
  name: string;
  ingredientId: string;
}

/**
 * 服薬マスターデータを取得するフック
 * 成分リスト（name昇順）+ 製品リスト（name昇順）の順で返す
 */
export function useMedicationMasters() {
  const [medications, setMedications] = useState<MedicationMaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedicationMasters();
  }, []);

  const loadMedicationMasters = async () => {
    setLoading(true);
    try {
      const medicationList: MedicationMaster[] = [];

      // 成分リスト（display_flag=true、name昇順）
      const { data: ingredientData } = await supabase
        .from('ingredients')
        .select('id, name')
        .eq('display_flag', true)
        .order('name', { ascending: true });

      if (ingredientData) {
        ingredientData.forEach((i: { id: string; name: string }) => {
          medicationList.push({
            id: `ingredient-${i.id}`,
            name: i.name,
            ingredientId: i.id,
          });
        });
      }

      // 製品リスト（name昇順）
      const { data: prodData } = await supabase
        .from('products')
        .select('id, name, ingredient_id, ingredients(id, name)')
        .order('name', { ascending: true });

      if (prodData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prodData.forEach((p: any) => {
          if (p.ingredients) {
            medicationList.push({
              id: `product-${p.id}`,
              name: `${p.name}(${p.ingredients.name})`,
              ingredientId: p.ingredient_id,
            });
          }
        });
      }

      setMedications(medicationList);
    } catch (error) {
      console.error('服薬マスター読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return { medications, loading, refetch: loadMedicationMasters };
}
