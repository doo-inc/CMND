
import { 
  MessageSquare, Instagram, Globe, Mail, Smartphone, 
  FileCheck, Users, Briefcase, DollarSign, Calendar, 
  BookOpen, HeartHandshake, Medal, Zap, CheckSquare,
  Facebook
} from "lucide-react";

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
    contractSize: 75000,
    industry: "Media & Broadcasting",
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
    region: "MENA",
    stage: "Contract Signed",
    status: "done" as const,
    contractSize: 120000,
    industry: "Logistics & Shipping",
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
    region: "GCC",
    stage: "Demo Completed",
    status: "not-started" as const,
    contractSize: 45000,
    industry: "E-commerce",
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
    region: "MENA",
    stage: "Go Live",
    status: "blocked" as const,
    contractSize: 85000,
    industry: "Food & Delivery",
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
    region: "MENA",
    stage: "Proposal Sent",
    status: "in-progress" as const,
    contractSize: 95000,
    industry: "Transportation",
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
    region: "UAE",
    stage: "Interest Captured",
    status: "not-started" as const,
    contractSize: 200000,
    industry: "Aviation",
    owner: {
      id: "user-002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    }
  },
];

// Add the missing icons to our icon mapping
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

// Update the default lifecycle stages with the requested new stages
export const defaultCustomerLifecycleStages: DefaultLifecycleStage[] = [
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
    id: "stage-013",
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
    id: "stage-014",
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
    id: "stage-015",
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
    id: "stage-016",
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
    id: "stage-017",
    name: "Training Completed",
    status: "not-started",
    category: "Training",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    iconName: "CheckSquare"
  },
  {
    id: "stage-018",
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
    id: "stage-019",
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
    id: "stage-020",
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
  }
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
