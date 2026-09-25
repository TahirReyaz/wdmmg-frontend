export type Role = "USER" | "ADMIN";
export type PaymentMethod = "CASH" | "UPI" | "CARD" | "NET_BANKING" | "WALLET" | "OTHER";
export type SplitType = "EQUAL" | "EXACT" | "PERCENT" | "SHARES";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  /** Relative API path to the profile picture, or null for the initials placeholder. */
  avatarUrl: string | null;
  createdAt: string;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/** Sign-up doesn't sign in: the address is confirmed with an emailed code first. */
export interface RegisterResponse {
  email: string;
  verificationRequired: boolean;
  codeExpiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface ResendCodeResponse {
  codeExpiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  color: string;
  active: boolean;
  sortOrder: number;
}

export interface AdminCategory extends Category {
  usageCount: number;
}

export interface Expense {
  id: number;
  name: string;
  amount: number;
  date: string;
  category: Category;
  paymentMethod: PaymentMethod;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseInput {
  name: string;
  amount: number;
  date: string;
  categoryId: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ---------- groups ----------
export interface GroupSummary {
  id: number;
  name: string;
  description: string | null;
  createdBy: UserSummary;
  createdAt: string;
  memberCount: number;
  totalSpent: number;
  myBalance: number;
}

export interface OverallBalance {
  youOwe: number;
  youAreOwed: number;
  net: number;
  groups: GroupSummary[];
}

export interface MemberBalance {
  user: UserSummary;
  paid: number;
  share: number;
  settledOut: number;
  settledIn: number;
  net: number;
  /** false for former members that still have history in the group */
  member: boolean;
}

export interface Debt {
  from: UserSummary;
  to: UserSummary;
  amount: number;
}

export interface GroupDetail {
  id: number;
  name: string;
  description: string | null;
  createdBy: UserSummary;
  createdAt: string;
  totalSpent: number;
  myBalance: number;
  members: MemberBalance[];
  simplifiedDebts: Debt[];
}

export interface ShareResponse {
  user: UserSummary;
  amount: number;
}

export interface GroupExpense {
  id: number;
  groupId: number;
  name: string;
  amount: number;
  date: string;
  category: Category;
  paidBy: UserSummary;
  createdBy: UserSummary;
  splitType: SplitType;
  notes: string | null;
  shares: ShareResponse[];
  myShare: number;
  createdAt: string;
}

export interface ShareInput {
  userId: number;
  value?: number | null;
}

export interface GroupExpenseInput {
  name: string;
  amount: number;
  date: string;
  categoryId: number;
  paidById: number;
  splitType: SplitType;
  notes?: string;
  shares: ShareInput[];
}

export interface Settlement {
  id: number;
  from: UserSummary;
  to: UserSummary;
  amount: number;
  date: string;
  note: string | null;
  createdAt: string;
}

// ---------- analytics ----------
export interface CategoryStat {
  categoryId: number;
  name: string;
  color: string;
  total: number;
  personal: number;
  group: number;
  count: number;
  pct: number;
}

export interface MethodStat {
  method: PaymentMethod;
  total: number;
  count: number;
}

export interface SourceStat {
  label: string;
  groupId: number | null;
  total: number;
  count: number;
}

export interface DayPoint {
  date: string;
  personal: number;
  group: number;
  total: number;
}

export interface MonthPoint {
  month: string;
  personal: number;
  group: number;
  total: number;
}

export interface TopItem {
  name: string;
  amount: number;
  date: string;
  category: string;
  color: string;
  source: string;
  groupId: number | null;
}

export interface PersonalAnalytics {
  from: string;
  to: string;
  includeGroups: boolean;
  total: number;
  personalTotal: number;
  groupShareTotal: number;
  transactionCount: number;
  dailyAverage: number;
  previousTotal: number;
  changePct: number | null;
  byCategory: CategoryStat[];
  byPaymentMethod: MethodStat[];
  bySource: SourceStat[];
  daily: DayPoint[];
  monthly: MonthPoint[];
  topExpenses: TopItem[];
}

export interface GroupShareItem {
  groupExpenseId: number;
  groupId: number;
  groupName: string;
  name: string;
  date: string;
  category: string;
  color: string;
  totalAmount: number;
  myShare: number;
  paidBy: string;
  paidByMe: boolean;
}

export interface MemberStat {
  user: UserSummary;
  paid: number;
  share: number;
}

export interface GroupAnalytics {
  groupId: number;
  from: string | null;
  to: string | null;
  total: number;
  count: number;
  myShare: number;
  byCategory: CategoryStat[];
  byMember: MemberStat[];
  monthly: MonthPoint[];
}

// ---------- notifications ----------
export type NotificationType = "GROUP_ADDED" | "GROUP_EXPENSE" | "PAYMENT_RECEIVED" | "RECURRING_DUE" | "SALARY_DUE" | "EXPENSE_FROM_EMAIL";
export type OccurrenceStatus = "PENDING" | "CONFIRMED" | "SKIPPED";

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  link: string | null;
  amount: number | null;
  refId: number | null;
  read: boolean;
  /** For RECURRING_DUE: whether the due expense still needs a decision. */
  actionStatus: OccurrenceStatus | null;
  createdAt: string;
}

// ---------- recurring ----------
export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RecurringExpense {
  id: number;
  name: string;
  amount: number;
  category: Category;
  paymentMethod: PaymentMethod;
  notes: string | null;
  frequency: Frequency;
  intervalCount: number;
  startDate: string;
  endDate: string | null;
  nextDueDate: string | null;
  active: boolean;
  pendingCount: number;
}

export interface RecurringInput {
  name: string;
  amount: number;
  categoryId: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  frequency: Frequency;
  intervalCount: number;
  startDate: string;
  endDate?: string | null;
}

export interface Occurrence {
  id: number;
  recurringId: number;
  name: string;
  amount: number;
  dueDate: string;
  category: Category;
  paymentMethod: PaymentMethod;
  status: OccurrenceStatus;
  expenseId: number | null;
}

// ---------- money: balance, income, salary ----------
export type IncomeType = "SALARY" | "FREELANCE" | "BUSINESS" | "INTEREST" | "REFUND" | "GIFT" | "OTHER";

export interface Income {
  id: number;
  name: string;
  amount: number;
  date: string;
  type: IncomeType;
  notes: string | null;
  createdAt: string;
}

export interface IncomeInput {
  name: string;
  amount: number;
  date: string;
  type: IncomeType;
  notes?: string;
}

export interface MoneyBreakdown {
  income: number;
  expenses: number;
  groupBillsPaid: number;
  paymentsSent: number;
  paymentsReceived: number;
}

export interface MoneySummary {
  /** Whether the user has set a starting balance. */
  configured: boolean;
  openingBalance: number;
  openingDate: string | null;
  balance: number;
  /** Held in savings goals. */
  setAside: number;
  /** balance − setAside */
  available: number;
  monthIn: number;
  monthOut: number;
  sinceOpening: MoneyBreakdown;
  salaryReminder: boolean;
  salaryDay: number;
}

export type ActivityKind = "INCOME" | "EXPENSE" | "GROUP_BILL" | "PAYMENT_SENT" | "PAYMENT_RECEIVED";

export interface MoneyActivity {
  key: string;
  date: string;
  kind: ActivityKind;
  title: string;
  detail: string | null;
  /** Signed: positive is money in. */
  amount: number;
  balanceAfter: number;
  link: string | null;
}

export interface SalaryPrompt {
  due: boolean;
  /** YYYY-MM */
  month: string;
  suggestedAmount: number | null;
  salaryDay: number;
  reminder: boolean;
}

// ---------- savings goals ----------
export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  savedAmount: number;
  remaining: number;
  progressPct: number;
  reached: boolean;
  /** What to set aside per month to reach the target on time. */
  monthlyNeeded: number | null;
  createdAt: string;
}

export interface GoalInput {
  name: string;
  targetAmount: number;
  targetDate?: string | null;
}

export interface GoalContribution {
  id: number;
  /** Signed: positive added, negative taken back. */
  amount: number;
  note: string | null;
  createdAt: string;
}

// ---------- AI insights ----------
export type InsightsStatus = "READY" | "EMPTY" | "DISABLED";
export type InsightKind = "TREND" | "CATEGORY" | "HABIT" | "ANOMALY" | "GROUP";
export type InsightSentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface Insight {
  title: string;
  detail: string;
  kind: InsightKind;
  sentiment: InsightSentiment;
}

export interface SpendInsights {
  /** DISABLED: AI isn't configured on the server; EMPTY: nothing spent in the period. */
  status: InsightsStatus;
  from: string;
  to: string;
  headline: string | null;
  summary: string | null;
  insights: Insight[];
  suggestions: string[];
  generatedAt: string | null;
  model: string | null;
  /** Served from the server cache because the figures haven't changed. */
  cached: boolean;
}
