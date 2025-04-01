
import { LifecycleStageProps } from "@/components/lifecycle/LifecycleStage";

// Mock customers
export const customers = [
  {
    id: "cust-001",
    name: "Al Jazeera Media",
    logo: "",
    segment: "Enterprise",
    region: "Middle East",
    stage: "Integration Setup",
    status: "in-progress" as const,
  },
  {
    id: "cust-002",
    name: "Aramex Logistics",
    logo: "",
    segment: "Enterprise",
    region: "MENA",
    stage: "Contract Signed",
    status: "done" as const,
  },
  {
    id: "cust-003",
    name: "Souq Marketplace",
    logo: "",
    segment: "Mid-Market",
    region: "GCC",
    stage: "Demo Completed",
    status: "not-started" as const,
  },
  {
    id: "cust-004",
    name: "Talabat Food Delivery",
    logo: "",
    segment: "Enterprise",
    region: "MENA",
    stage: "Go Live",
    status: "blocked" as const,
  },
  {
    id: "cust-005",
    name: "Careem Transportation",
    logo: "",
    segment: "Enterprise",
    region: "MENA",
    stage: "Proposal Sent",
    status: "in-progress" as const,
  },
  {
    id: "cust-006",
    name: "Emirates Airlines",
    logo: "",
    segment: "Enterprise",
    region: "UAE",
    stage: "Interest Captured",
    status: "not-started" as const,
  },
];

// Mock dashboard stats
export const dashboardStats = [
  {
    title: "Total Customers",
    value: "24",
    change: {
      value: 12,
      type: "increase" as const,
    },
  },
  {
    title: "Avg. Go-Live Time",
    value: "32 days",
    change: {
      value: 8,
      type: "decrease" as const,
    },
  },
  {
    title: "MRR",
    value: "$48,500",
    change: {
      value: 23,
      type: "increase" as const,
    },
  },
  {
    title: "Churn Rate",
    value: "1.2%",
    change: {
      value: 0.5,
      type: "decrease" as const,
    },
  },
];

// Mock lifecycle stages
export const lifecycleStages: LifecycleStageProps[] = [
  {
    id: "stage-001",
    name: "Interest Captured",
    status: "done",
    owner: {
      id: "user-001",
      name: "Ahmed Abdullah",
      role: "Account Executive",
    },
    deadline: "March 15, 2025",
    notes: "Initial interest through LinkedIn outreach campaign.",
  },
  {
    id: "stage-002",
    name: "Demo Booked & Done",
    status: "done",
    owner: {
      id: "user-001",
      name: "Ahmed Abdullah",
      role: "Account Executive",
    },
    deadline: "March 22, 2025",
    notes: "Successful demo with positive feedback on WhatsApp integration.",
  },
  {
    id: "stage-003",
    name: "Proposal Sent",
    status: "done",
    owner: {
      id: "user-001",
      name: "Ahmed Abdullah",
      role: "Account Executive",
    },
    deadline: "March 30, 2025",
  },
  {
    id: "stage-004",
    name: "Pilot Running",
    status: "in-progress",
    owner: {
      id: "user-002",
      name: "Fatima Hassan",
      role: "Customer Success Manager",
    },
    deadline: "April 15, 2025",
    notes: "Pilot launched with 5 test users. Monitoring usage patterns.",
  },
  {
    id: "stage-005",
    name: "Service Agreement Signed",
    status: "not-started",
    owner: {
      id: "user-001",
      name: "Ahmed Abdullah",
      role: "Account Executive",
    },
    deadline: "April 20, 2025",
  },
  {
    id: "stage-006",
    name: "Invoice Issued",
    status: "not-started",
    owner: {
      id: "user-003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager",
    },
  },
  {
    id: "stage-007",
    name: "Payment Confirmed",
    status: "not-started",
    owner: {
      id: "user-003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager",
    },
  },
  {
    id: "stage-008",
    name: "Kickoff/Briefing Meeting",
    status: "not-started",
    owner: {
      id: "user-002",
      name: "Fatima Hassan",
      role: "Customer Success Manager",
    },
  },
  {
    id: "stage-009",
    name: "WhatsApp Integration",
    status: "not-started",
    owner: {
      id: "user-004",
      name: "Mohammed Rahman",
      role: "Integration Engineer",
    },
  },
];
