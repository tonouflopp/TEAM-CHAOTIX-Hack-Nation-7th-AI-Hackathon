// Datos de ejemplo mientras no hay backend de usuarios, organización ni workflows.

export type User = { id: string; name: string; initials: string; org: string };

export const MOCK_USER: User = { id: "u-1", name: "Alex Rivera", initials: "AR", org: "Northwind Finance" };

export type Workflow = {
  id: string;
  name: string;
  description: string;
  status: "mapped" | "in-review" | "draft" | "needs-recording";
  steps: number;
  sessions: number;
};

export type Stats = { sessions: number; steps: number; guardrails: number; hires: number };

export const MOCK_STATS: Stats = { sessions: 24, steps: 186, guardrails: 41, hires: 9 };

export const MOCK_WORKFLOWS: Workflow[] = [
  { id: "invoices", name: "Invoice processing", description: "Match, check and approve supplier invoices.", status: "mapped", steps: 14, sessions: 6 },
  { id: "claims", name: "Insurance claims", description: "Triage a new claim and decide the payout path.", status: "in-review", steps: 11, sessions: 4 },
  { id: "kyc", name: "KYC check", description: "Verify a new business customer before onboarding.", status: "draft", steps: 7, sessions: 2 },
  { id: "suppliers", name: "Supplier onboarding", description: "Set up a supplier and their payment details.", status: "needs-recording", steps: 0, sessions: 0 },
];
