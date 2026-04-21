export type LiveDailyTx = { day: string; amount: number; count: number };
export type LiveDailyMembers = { day: string; count: number };
export type LiveBalanceRow = {
  id: string;
  code: string;
  name: string;
  balance: number;
  currency: string;
  members: number;
};
