export interface UserProfile {
  avatarUrl: string | null;
  userName: string | null;
  xUserName: string | null;
  accountName: string | null;
  createdAt: string | null;
  provider: string | null;
  bio: string | null;
}

export interface MedicalRecord {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

export interface DiagnosisData {
  diagnoses: { name: string } | null;
  start_date: string;
  end_date: string | null;
}

export interface MedicationData {
  ingredient_id: string;
  ingredients: { id: string; name: string } | null;
  products: { name: string } | null;
  start_date: string | null;
  end_date: string | null;
}

export interface TreatmentData {
  treatments: { name: string } | null;
  start_date: string;
  end_date: string | null;
}

export interface StatusData {
  statuses: { name: string } | null;
  start_date: string;
  end_date: string | null;
}

export interface MasterData {
  id: string;
  name: string;
  ingredientId?: string; // 服薬マスター用: 成分ID
}

export interface AIReflection {
  id: string;
  content: string;
  created_at: string;
}
