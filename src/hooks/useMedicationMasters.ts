import { useEffect, useState } from 'react';

import { useMasterData } from '@/src/contexts/MasterDataContext';

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
  const { data: masterData, loading: masterLoading } = useMasterData();
  const [medications, setMedications] = useState<MedicationMaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!masterLoading) {
      loadMedicationMasters();
    }
  }, [masterLoading, masterData]);

  const loadMedicationMasters = () => {
    setLoading(true);
    try {
      const medicationList: MedicationMaster[] = [];

      // 成分リスト（display_flag=falseを除外、name昇順）
      const filteredIngredients = masterData.ingredients
        .filter((i) => i.display_flag !== false)
        .sort((a, b) => a.name.localeCompare(b.name));

      filteredIngredients.forEach((i) => {
        medicationList.push({
          id: `ingredient-${i.id}`,
          name: i.name,
          ingredientId: i.id,
        });
      });

      // 製品リスト（name昇順）
      // display_flag=falseの成分に紐づく製品も除外
      const sortedProducts = [...masterData.products]
        .filter((p) => {
          const ingredient = masterData.ingredients.find((i) => i.id === p.ingredient_id);
          return ingredient && ingredient.display_flag !== false;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      sortedProducts.forEach((p) => {
        const ingredient = masterData.ingredients.find((i) => i.id === p.ingredient_id);
        if (ingredient) {
          medicationList.push({
            id: `product-${p.id}`,
            name: `${p.name}(${ingredient.name})`,
            ingredientId: p.ingredient_id,
          });
        }
      });

      setMedications(medicationList);
    } catch (error) {
      console.error('服薬マスター読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return { medications, loading, refetch: loadMedicationMasters };
}
