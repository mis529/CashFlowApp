
export type TransactionType = 'GIVE' | 'TAKE';

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  type: TransactionType;
  date: string;
  note: string;
}

export interface Party {
  id: string;
  name: string;
}

export interface InsightReport {
  summary: string;
  advice: string;
  totalVolume: number;
}
