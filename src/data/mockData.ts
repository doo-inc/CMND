import { LifecycleStageProps } from "@/components/lifecycle/LifecycleStage";
import { 
  MessageSquare, Instagram, Globe, Mail, Smartphone, 
  FileCheck, Users, Briefcase, DollarSign, Calendar, 
  BookOpen, HeartHandshake, Medal, Zap, CheckSquare,
  LucideIcon
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
export interface DefaultLifecycleStage extends Omit<LifecycleStageProps, "icon"> {
  iconName: keyof typeof icons;
}

// Default lifecycle stages by category
export const defaultLifecycleStages: DefaultLifecycleStage[] = [
  {
    id: "sales-stage-1",
    name: "Initial Contact",
    status: "not-started",
    category: "Sales",
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    },
    notes: "First connection with the potential customer.",
    iconName: "Briefcase"
  },
  {
    id: "sales-stage-2",
    name: "Demo Completed",
    status: "not-started",
    category: "Sales",
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    },
    notes: "Product demonstration for key stakeholders.",
    iconName: "Briefcase"
  },
  {
    id: "sales-stage-3",
    name: "Proposal Sent",
    status: "not-started",
    category: "Sales",
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    },
    notes: "Formal proposal shared with pricing and terms.",
    iconName: "FileCheck"
  },
  
  {
    id: "finance-stage-1",
    name: "Contract Signed",
    status: "not-started",
    category: "Finance",
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    },
    notes: "Completed contract with signatures from all parties.",
    iconName: "FileCheck"
  },
  {
    id: "finance-stage-2",
    name: "Invoice Generated",
    status: "not-started",
    category: "Finance",
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    },
    notes: "Initial invoice sent to customer.",
    iconName: "DollarSign"
  },
  {
    id: "finance-stage-3",
    name: "Payment Processed",
    status: "not-started",
    category: "Finance",
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    },
    notes: "First payment successfully received.",
    iconName: "DollarSign"
  },
  
  {
    id: "onboarding-stage-1",
    name: "Kickoff Meeting",
    status: "not-started",
    category: "Onboarding",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Initial project kickoff with key stakeholders.",
    iconName: "Calendar"
  },
  {
    id: "onboarding-stage-2",
    name: "Requirements Gathering",
    status: "not-started",
    category: "Onboarding",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Document detailed customer requirements and configuration needs.",
    iconName: "CheckSquare"
  },
  {
    id: "onboarding-stage-3",
    name: "Account Setup",
    status: "not-started",
    category: "Onboarding",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Set up customer account with initial configuration.",
    iconName: "Users"
  },
  
  {
    id: "integration-stage-1",
    name: "Chat Integration",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    notes: "Implement customer chat integration for real-time support.",
    iconName: "MessageSquare"
  },
  {
    id: "integration-stage-2",
    name: "Social Media Connect",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    notes: "Set up Instagram business account connection for the customer.",
    iconName: "Instagram"
  },
  {
    id: "integration-stage-3",
    name: "Website API Setup",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    notes: "Configure API endpoints for the customer's website integration.",
    iconName: "Globe"
  },
  {
    id: "integration-stage-4",
    name: "Email Campaign Integration",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Set up email marketing integration with customer's CRM.",
    iconName: "Mail"
  },
  {
    id: "integration-stage-5",
    name: "Mobile App Configuration",
    status: "not-started",
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    notes: "Configure mobile app settings and push notification services.",
    iconName: "Smartphone"
  },
  
  {
    id: "training-stage-1",
    name: "Admin Training",
    status: "not-started",
    category: "Training",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Train customer administrators on platform management.",
    iconName: "BookOpen"
  },
  {
    id: "training-stage-2",
    name: "End User Training",
    status: "not-started",
    category: "Training",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Train end users on daily operations and features.",
    iconName: "Users"
  },
  
  {
    id: "success-stage-1",
    name: "Go-Live",
    status: "not-started",
    category: "Success",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Official launch of the solution for customer use.",
    iconName: "Zap"
  },
  {
    id: "success-stage-2",
    name: "30-Day Review",
    status: "not-started",
    category: "Success",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Post-implementation review after 30 days of live usage.",
    iconName: "HeartHandshake"
  },
  {
    id: "success-stage-3",
    name: "Success Metrics Achieved",
    status: "not-started",
    category: "Success",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Key performance indicators and success metrics have been met.",
    iconName: "Medal"
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
  CheckSquare
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
