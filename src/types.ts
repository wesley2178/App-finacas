export interface EarningsEntry {
  id: string;
  date: string;
  uberEarnings: number;
  pop99Earnings: number;
  totalEarnings: number;
  costs: number;
}

export interface Bill {
  id: string;
  name: string;
  value: number;
  dueDate: string;
  isRecurring: boolean;
  isPaid: boolean;
  category: 'rent' | 'car' | 'insurance' | 'other';
}

export interface SavingsDeposit {
  id: string;
  billId: string;
  date: string;
  amount: number;
}

export interface DailyExpense {
  id: string;
  description: string;
  value: number;
  date: string;
  category: 'food' | 'delivery' | 'transport' | 'other';
}
