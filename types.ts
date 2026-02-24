
export type TransactionType = 'CREDIT' | 'DEBIT';
export type PaymentMethod = 'CASH' | 'BANK' | 'GENERAL';

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
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
