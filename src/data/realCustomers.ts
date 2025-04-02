
import { LifecycleStageProps } from "@/components/lifecycle/LifecycleStage";
import { 
  FileCheck, 
  DollarSign, 
  Calendar, 
  Users, 
  Smartphone, 
  Mail, 
  MessageSquare, 
  Zap,
  CheckSquare,
  Building
} from "lucide-react";

export interface Customer {
  id: string;
  name: string;
  logo?: string;
  segment?: string;
  region?: string;
  stage: string;
  status: "not-started" | "in-progress" | "done" | "blocked";
  contractSize: number;
  owner: {
    id: string;
    name: string;
    role: string;
  };
}

export const customers: Customer[] = [
  // Went Live
  {
    id: "cust-jahez",
    name: "Jahez",
    segment: "Enterprise",
    region: "MENA",
    stage: "Went Live",
    status: "done",
    contractSize: 57000,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  {
    id: "cust-aubh",
    name: "AUBH",
    segment: "Education",
    region: "Bahrain",
    stage: "Went Live",
    status: "done",
    contractSize: 8000,
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    }
  },
  {
    id: "cust-icabinets",
    name: "iCabinets",
    segment: "SMB",
    region: "Bahrain",
    stage: "Went Live",
    status: "done",
    contractSize: 4400,
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    }
  },
  {
    id: "cust-doobi",
    name: "Doobi (MVP)",
    segment: "SMB",
    region: "MENA",
    stage: "Went Live",
    status: "done",
    contractSize: 2400,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  {
    id: "cust-eatco",
    name: "Eatco",
    segment: "SMB",
    region: "Bahrain",
    stage: "Went Live",
    status: "done",
    contractSize: 2300,
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    }
  },
  
  // Agreement Signed / Invoice Sent
  {
    id: "cust-click-insurance",
    name: "Click Insurance",
    segment: "Finance",
    region: "Bahrain",
    stage: "Agreement Signed",
    status: "in-progress",
    contractSize: 2300,
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    }
  },
  {
    id: "cust-tasheelat",
    name: "Tasheelat",
    segment: "Finance",
    region: "Bahrain",
    stage: "Invoice Sent",
    status: "in-progress",
    contractSize: 15000,
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    }
  },
  {
    id: "cust-polytechnic",
    name: "Polytechnic University",
    segment: "Education",
    region: "Bahrain",
    stage: "Invoice Sent",
    status: "in-progress",
    contractSize: 25000,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  
  // Proposal Sent
  {
    id: "cust-hqbyhope",
    name: "HQ by Hope",
    segment: "SMB",
    region: "Bahrain",
    stage: "Proposal Sent",
    status: "in-progress",
    contractSize: 2388,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  {
    id: "cust-parcel",
    name: "Parcel",
    segment: "Logistics",
    region: "MENA",
    stage: "Proposal Sent",
    status: "in-progress",
    contractSize: 15000,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  {
    id: "cust-benefit",
    name: "Benefit",
    segment: "Finance",
    region: "Bahrain",
    stage: "Proposal Sent",
    status: "in-progress",
    contractSize: 92000,
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    }
  },
  
  // Pilot Stage
  {
    id: "cust-tamkeen",
    name: "Tamkeen",
    segment: "Government",
    region: "Bahrain",
    stage: "Pilot Stage",
    status: "in-progress",
    contractSize: 25000,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  {
    id: "cust-gulf-air",
    name: "Gulf Air Group",
    segment: "Travel",
    region: "MENA",
    stage: "Pilot Stage",
    status: "in-progress",
    contractSize: 120000,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  {
    id: "cust-malaeb",
    name: "Malaeb",
    segment: "Sports",
    region: "MENA",
    stage: "Pilot Stage",
    status: "in-progress",
    contractSize: 15000,
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    }
  },
  
  // Demo Stage
  {
    id: "cust-foodics",
    name: "Foodics",
    segment: "Enterprise",
    region: "MENA",
    stage: "Demo Stage",
    status: "in-progress",
    contractSize: 150000,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  {
    id: "cust-qic",
    name: "Qatar Insurance Company",
    segment: "Finance",
    region: "Qatar",
    stage: "Demo Stage",
    status: "in-progress",
    contractSize: 50000,
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    }
  },
  
  // Interest Captured
  {
    id: "cust-alsalam",
    name: "Alsalam Bank",
    segment: "Finance",
    region: "Bahrain",
    stage: "Interest Captured",
    status: "not-started",
    contractSize: 120000,
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    }
  },
  {
    id: "cust-qnb",
    name: "Qatar National Bank",
    segment: "Finance",
    region: "Qatar",
    stage: "Interest Captured",
    status: "not-started",
    contractSize: 300000,
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    }
  },
  {
    id: "cust-noon",
    name: "Noon",
    segment: "Enterprise",
    region: "MENA",
    stage: "Interest Captured",
    status: "not-started",
    contractSize: 500000,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  
  // High Potential
  {
    id: "cust-talabat",
    name: "Talabat",
    segment: "Enterprise",
    region: "MENA",
    stage: "High Potential",
    status: "not-started",
    contractSize: 400000,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  {
    id: "cust-virgin",
    name: "Virgin",
    segment: "Enterprise",
    region: "MENA",
    stage: "High Potential",
    status: "not-started",
    contractSize: 300000,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  
  // Potential
  {
    id: "cust-monshaat",
    name: "MonshaatSA",
    segment: "Government",
    region: "Saudi Arabia",
    stage: "Potential",
    status: "not-started",
    contractSize: 300000,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  },
  {
    id: "cust-alula",
    name: "The Royal Commission for AlUla",
    segment: "Government",
    region: "Saudi Arabia",
    stage: "Potential",
    status: "not-started",
    contractSize: 150000,
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    }
  }
];

// Default lifecycle stages for the real customers
export const defaultCustomerLifecycleStages = [
  // Sales stages
  {
    id: "stage-initial-contact",
    name: "Initial Contact",
    status: "not-started" as const,
    category: "Sales",
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    },
    notes: "First connection with the potential customer.",
    iconName: "Users"
  },
  {
    id: "stage-demo-completed",
    name: "Demo Completed",
    status: "not-started" as const,
    category: "Sales",
    owner: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Ahmed Abdullah",
      role: "Account Executive"
    },
    notes: "Product demonstration for key stakeholders.",
    iconName: "Smartphone"
  },
  {
    id: "stage-proposal-sent",
    name: "Proposal Sent",
    status: "not-started" as const,
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
    id: "stage-contract-signed",
    name: "Agreement Signed",
    status: "not-started" as const,
    category: "Finance",
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    },
    notes: "Completed contract with signatures from all parties.",
    iconName: "FileCheck"
  },
  
  // Finance stages
  {
    id: "stage-invoice-sent",
    name: "Invoice Sent",
    status: "not-started" as const,
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
    id: "stage-payment-received",
    name: "Payment Received",
    status: "not-started" as const,
    category: "Finance",
    owner: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Khalid Al-Farsi",
      role: "Finance Manager"
    },
    notes: "Payment successfully processed.",
    iconName: "DollarSign"
  },
  
  // Onboarding stages
  {
    id: "stage-kickoff",
    name: "Kickoff Meeting",
    status: "not-started" as const,
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
    id: "stage-requirements",
    name: "Requirements Gathering",
    status: "not-started" as const,
    category: "Onboarding",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Document detailed customer requirements.",
    iconName: "FileCheck"
  },
  {
    id: "stage-account-setup",
    name: "Account Setup",
    status: "not-started" as const,
    category: "Onboarding",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Set up customer account with initial configuration.",
    iconName: "Users"
  },
  
  // Integration stages
  {
    id: "stage-chat-integration",
    name: "Chat Integration",
    status: "not-started" as const,
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    notes: "Implement customer chat integration.",
    iconName: "MessageSquare"
  },
  {
    id: "stage-email-integration",
    name: "Email Integration",
    status: "not-started" as const,
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    notes: "Configure email integration.",
    iconName: "Mail"
  },
  {
    id: "stage-mobile-integration",
    name: "Mobile App Integration",
    status: "not-started" as const,
    category: "Integration",
    owner: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Mohammed Rahman",
      role: "Integration Engineer"
    },
    notes: "Configure mobile app settings.",
    iconName: "Smartphone"
  },
  
  // Success stages
  {
    id: "stage-pilot",
    name: "Pilot Program",
    status: "not-started" as const,
    category: "Success",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Limited deployment with key users.",
    iconName: "Users"
  },
  {
    id: "stage-go-live",
    name: "Go Live",
    status: "not-started" as const,
    category: "Success",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Official launch of the solution.",
    iconName: "Zap"
  },
  {
    id: "stage-review",
    name: "Post-Launch Review",
    status: "not-started" as const,
    category: "Success",
    owner: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Fatima Hassan",
      role: "Customer Success Manager"
    },
    notes: "Review after 30 days of live usage.",
    iconName: "CheckSquare"
  }
];

export const icons = {
  Building,
  FileCheck, 
  DollarSign, 
  Calendar, 
  Users, 
  Smartphone, 
  Mail, 
  MessageSquare, 
  Zap,
  CheckSquare
};
