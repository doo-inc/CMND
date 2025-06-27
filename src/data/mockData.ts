
import { LifecycleStageProps } from "@/components/lifecycle/LifecycleStage";
import { 
  MessageSquare, Instagram, Globe, Mail, Smartphone, 
  FileCheck, Users, Briefcase, DollarSign, Calendar, 
  BookOpen, HeartHandshake, Medal, Zap, CheckSquare,
  Facebook, LucideIcon
} from "lucide-react";

// Mock customers
export const customers = [
  {
    id: "cust-001",
    name: "Al Jazeera Media",
    logo: "",
    segment: "Enterprise",
    country: "Qatar",
    stage: "Integration Setup",
    status: "in-progress" as const,
    contractSize: 75000,
    owner: {
      id: "user-001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  {
    id: "cust-002",
    name: "Aramex Logistics",
    logo: "",
    segment: "Enterprise",
    country: "UAE",
    stage: "Contract Signed",
    status: "done" as const,
    contractSize: 120000,
    owner: {
      id: "user-002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    }
  },
  {
    id: "cust-003",
    name: "Souq Marketplace",
    logo: "",
    segment: "Mid-Market",
    country: "UAE",
    stage: "Demo Completed",
    status: "not-started" as const,
    contractSize: 45000,
    owner: {
      id: "user-003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    }
  },
  {
    id: "cust-004",
    name: "Talabat Food Delivery",
    logo: "",
    segment: "Enterprise",
    country: "Kuwait",
    stage: "Go Live",
    status: "blocked" as const,
    contractSize: 85000,
    owner: {
      id: "user-004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    }
  },
  {
    id: "cust-005",
    name: "Careem Transportation",
    logo: "",
    segment: "Enterprise",
    country: "UAE",
    stage: "Proposal Sent",
    status: "in-progress" as const,
    contractSize: 95000,
    owner: {
      id: "user-001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  {
    id: "cust-006",
    name: "Emirates Airlines",
    logo: "",
    segment: "Enterprise",
    country: "UAE",
    stage: "Interest Captured",
    status: "not-started" as const,
    contractSize: 200000,
    owner: {
      id: "user-002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    }
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

// Define a type for the default lifecycle stage that includes iconName
export interface DefaultLifecycleStage {
  id: string;
  name: string;
  status: "not-started" | "in-progress" | "done" | "blocked" | "not-applicable";
  category: string;
  owner: {
    id: string;
    name: string;
    role: string;
  };
  deadline?: string;
  notes?: string;
  iconName: keyof typeof icons;
}

// Default lifecycle stages by category
export const defaultLifecycleStages: DefaultLifecycleStage[] = [
  {
    id: "stage-001",
    name: "Contract Approval",
    status: "not-started",
    category: "Sales",
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    },
    iconName: "FileCheck"
  },
  {
    id: "stage-002",
    name: "Invoice Generation",
    status: "not-started",
    category: "Finance",
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    },
    iconName: "DollarSign"
  },
  {
    id: "stage-003",
    name: "Payment Processing",
    status: "not-started",
    category: "Finance",
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    },
    iconName: "DollarSign"
  },
  {
    id: "stage-004",
    name: "Kick-off Meeting",
    status: "not-started",
    category: "Onboarding",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    iconName: "Calendar"
  },
  {
    id: "stage-005",
    name: "Requirements Gathering",
    status: "not-started",
    category: "Onboarding",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    iconName: "FileCheck"
  },
  {
    id: "stage-006",
    name: "Account Setup",
    status: "not-started",
    category: "Onboarding",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    iconName: "Users"
  },
  {
    id: "stage-007",
    name: "Data Migration",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    iconName: "FileCheck"
  },
  {
    id: "stage-008",
    name: "Mobile App Integration",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    iconName: "Smartphone"
  },
  {
    id: "stage-009",
    name: "Email Integration",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    iconName: "Mail"
  },
  {
    id: "stage-010",
    name: "WhatsApp Integration",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    iconName: "MessageSquare"
  },
  {
    id: "stage-011",
    name: "Instagram Integration",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    iconName: "Instagram"
  },
  {
    id: "stage-012",
    name: "Admin Training",
    status: "not-started",
    category: "Training",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    iconName: "BookOpen"
  },
  {
    id: "stage-013",
    name: "User Training",
    status: "not-started",
    category: "Training",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    iconName: "Users"
  },
  {
    id: "stage-014",
    name: "Go-Live",
    status: "not-started",
    category: "Success",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    iconName: "Zap"
  },
  {
    id: "stage-015",
    name: "Post-Launch Review",
    status: "not-started",
    category: "Success",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    iconName: "CheckSquare"
  },
  {
    id: "stage-016",
    name: "Pilot Program",
    status: "not-started",
    category: "Success",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Limited deployment with key users to validate solution",
    iconName: "Users"
  },
  {
    id: "stage-whatsapp",
    name: "WhatsApp Integration",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    iconName: "MessageSquare"
  },
  {
    id: "stage-instagram", 
    name: "Instagram Integration",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    iconName: "Instagram"
  },
  {
    id: "stage-facebook",
    name: "Facebook Integration",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    iconName: "Facebook"
  },
  {
    id: "stage-website",
    name: "Website Integration",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    iconName: "Globe"
  },
  {
    id: "stage-agent",
    name: "Agent Setup",
    status: "not-started",
    category: "Onboarding",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    iconName: "Users"
  },
  {
    id: "stage-account",
    name: "Account Setup",
    status: "not-started",
    category: "Onboarding",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    iconName: "Users"
  },
  {
    id: "stage-training",
    name: "Training Completed",
    status: "not-started",
    category: "Training",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    iconName: "CheckSquare"
  }
];

// Icon mapping for the lifecycle stages
export const icons = {
  MessageSquare,
  Instagram, 
  Globe, 
  Mail, 
  Smartphone,
  FileCheck, 
  Users, 
  Briefcase, 
  DollarSign, 
  Calendar,
  BookOpen, 
  HeartHandshake, 
  Medal, 
  Zap, 
  CheckSquare,
  Facebook
};

// Legacy lifecycle stages - keep for backward compatibility
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
