import type { Session, SessionSummary } from "./api";

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

const MIN = 60_000;

export const MOCK_ORG_SESSIONS: (SessionSummary & { session: Session })[] = [
  {
    id: "org-invoice-1",
    createdAt: Date.UTC(2026, 8, 29, 9, 15),
    title: "Approving a supplier invoice over budget",
    workflowId: "invoices",
    status: "saved",
    durationMs: 9 * MIN,
    stepCount: 4,
    questionCount: 3,
    hasThumbnail: false,
    owner: "Priya N.",
    tags: ["invoices", "approvals", "accounts payable"],
    session: {
      id: "org-invoice-1",
      createdAt: Date.UTC(2026, 8, 29, 9, 15),
      items: [
        { kind: "screen", t: 20_000, type: "open", entity: "Invoice", field: null, from: null, to: null, summary: "Opens invoice 1042 from [PERSONA]" },
        { kind: "screen", t: 75_000, type: "search", entity: "Purchase order", field: null, from: null, to: null, summary: "Looks up the matching purchase order" },
        { kind: "transcript", t: 90_000, role: "agent", text: "Why check the purchase order before the amount?", isQuestion: true, aboutEvent: "Looks up the matching purchase order", redactedBy: "presidio" },
        { kind: "transcript", t: 96_000, role: "expert", text: "If there's no PO the invoice can't be paid, so I don't waste time on the rest.", redactedBy: "presidio" },
        { kind: "screen", t: 180_000, type: "edit", entity: "Invoice", field: "Cost centre", from: "—", to: "CC-210", summary: "Sets the cost centre to CC-210" },
        { kind: "gap", t: 240_000, until: 300_000 },
        { kind: "screen", t: 330_000, type: "approve", entity: "Invoice", field: "Status", from: "Pending", to: "Approved", summary: "Approves invoice 1042" },
        { kind: "transcript", t: 345_000, role: "agent", text: "Is there an amount where you'd stop and ask someone?", isQuestion: true, aboutEvent: "Approves invoice 1042", redactedBy: "presidio" },
        { kind: "transcript", t: 352_000, role: "expert", text: "Anything over 5,000 euros or 10% over the PO needs the finance lead's sign-off first.", redactedBy: "presidio" },
        { kind: "transcript", t: 400_000, role: "agent", text: "Why approve even though it's slightly over budget?", isQuestion: true, aboutEvent: "Approves invoice 1042", redactedBy: "presidio" },
        { kind: "transcript", t: 406_000, role: "expert", text: "It's within the 10% tolerance and the delivery note matches.", redactedBy: "presidio" },
      ],
    },
  },
  {
    id: "org-claims-1",
    createdAt: Date.UTC(2026, 8, 24, 14, 40),
    title: "Water damage claim triage",
    workflowId: "claims",
    status: "saved",
    durationMs: 12 * MIN,
    stepCount: 3,
    questionCount: 2,
    hasThumbnail: false,
    owner: "Marco D.",
    tags: ["insurance", "claims", "triage"],
    session: {
      id: "org-claims-1",
      createdAt: Date.UTC(2026, 8, 24, 14, 40),
      items: [
        { kind: "screen", t: 15_000, type: "open", entity: "Claim", field: null, from: null, to: null, summary: "Opens claim CL-88213" },
        { kind: "screen", t: 120_000, type: "select", entity: "Claim", field: "Category", from: "Unassigned", to: "Water damage", summary: "Classifies the claim as water damage" },
        { kind: "transcript", t: 135_000, role: "agent", text: "What made you rule out a plumbing claim?", isQuestion: true, aboutEvent: "Classifies the claim as water damage", redactedBy: "presidio" },
        { kind: "transcript", t: 142_000, role: "expert", text: "The photos show rain ingress through the roof, not a burst pipe.", redactedBy: "presidio" },
        { kind: "screen", t: 400_000, type: "submit", entity: "Claim", field: "Route", from: "—", to: "Field adjuster", summary: "Routes the claim to a field adjuster" },
        { kind: "transcript", t: 420_000, role: "agent", text: "When would you never send an adjuster?", isQuestion: true, aboutEvent: "Routes the claim to a field adjuster", redactedBy: "presidio" },
        { kind: "transcript", t: 428_000, role: "expert", text: "Never for claims under 800 euros; those go to fast-track payout.", redactedBy: "presidio" },
      ],
    },
  },
  {
    id: "org-kyc-1",
    createdAt: Date.UTC(2026, 8, 18, 11, 5),
    title: "KYC for a new limited company",
    workflowId: "kyc",
    status: "saved",
    durationMs: 7 * MIN,
    stepCount: 2,
    questionCount: 1,
    hasThumbnail: false,
    owner: "Priya N.",
    tags: ["kyc", "compliance", "onboarding"],
    session: {
      id: "org-kyc-1",
      createdAt: Date.UTC(2026, 8, 18, 11, 5),
      items: [
        { kind: "screen", t: 30_000, type: "search", entity: "Company registry", field: null, from: null, to: null, summary: "Checks the company in the public registry" },
        { kind: "screen", t: 210_000, type: "reject", entity: "Application", field: "Status", from: "In review", to: "On hold", summary: "Puts the application on hold" },
        { kind: "transcript", t: 225_000, role: "agent", text: "Why put it on hold instead of rejecting it?", isQuestion: true, aboutEvent: "Puts the application on hold", redactedBy: "presidio" },
        { kind: "transcript", t: 233_000, role: "expert", text: "The director's ID expired last month; only if they can't send a new one within 14 days do we reject.", redactedBy: "presidio" },
      ],
    },
  },
];
