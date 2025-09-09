import * as XLSX from 'xlsx';
import { CustomerData } from '@/types/customers';
import { defaultLifecycleStages } from '@/data/defaultLifecycleStages';

export interface ExportCustomerData {
  name: string;
  country: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contractSize: number;
  status: string;
  segment: string;
  createdAt: string;
  goLiveDate: string;
  pipelineStage: string;
  operationalStatus: string;
  [key: string]: string | number; // For dynamic lifecycle stage columns
}

// Normalize and interpret stage statuses (same logic as Customers.tsx)
const normalizeStatus = (s?: string) => (s ?? "").toString().trim().toLowerCase().replace(/[_\s]+/g, "-");
const isCompletedLike = (s?: string) => {
  const n = normalizeStatus(s);
  return n === "done" || n === "completed" || n === "complete" || n === "finished";
};
const isInProgressLike = (s?: string) => {
  const n = normalizeStatus(s);
  return n === "in-progress" || n === "inprogress" || n === "ongoing";
};
const isBlockedLike = (s?: string) => normalizeStatus(s) === "blocked";

const getStageStatus = (stageName: string, customerLifecycleStages: any[]): string => {
  const stage = customerLifecycleStages.find(s => s.name === stageName);
  if (!stage || !stage.status) return 'Not Started';
  
  if (isCompletedLike(stage.status)) return 'Completed';
  if (isInProgressLike(stage.status)) return 'In Progress';
  if (isBlockedLike(stage.status)) return 'Blocked';
  return 'Not Started';
};

const getOperationalStatus = (customerLifecycleStages: any[]): string => {
  if (!customerLifecycleStages || customerLifecycleStages.length === 0) return "not-started";

  // Check if customer has completed "Go Live" stage
  const hasCompletedGoLive = customerLifecycleStages.some(stage => 
    stage.name === "Go Live" && isCompletedLike(stage.status)
  );

  if (hasCompletedGoLive) return "done";

  // Check if any stage is blocked
  const hasBlockedStages = customerLifecycleStages.some(stage => isBlockedLike(stage.status));
  if (hasBlockedStages) return "blocked";

  // Check if any stage is in progress
  const hasInProgressStages = customerLifecycleStages.some(stage => isInProgressLike(stage.status));
  if (hasInProgressStages) return "in-progress";

  // Check if any stage is completed (but not Go Live)
  const hasCompletedStages = customerLifecycleStages.some(stage => isCompletedLike(stage.status));
  if (hasCompletedStages) return "in-progress";

  return "not-started";
};

export function exportCustomersToExcel(customers: CustomerData[], allLifecycleStages: any[] = []): void {
  try {
    // Create export data structure
    const exportData: ExportCustomerData[] = customers.map(customer => {
      // Get lifecycle stages for this specific customer
      const customerLifecycleStages = allLifecycleStages.filter(stage => stage.customer_id === customer.id);
      
      const baseData: ExportCustomerData = {
        name: customer.name,
        country: customer.country || '',
        industry: customer.industry || '',
        contactName: customer.contact_name || '',
        contactEmail: customer.contact_email || '',
        contactPhone: customer.contact_phone || '',
        contractSize: customer.contractSize || 0,
        status: customer.status || '',
        segment: customer.segment || '',
        createdAt: '', // CustomerData doesn't have created_at, will be empty for now
        goLiveDate: customer.go_live_date ? new Date(customer.go_live_date).toLocaleDateString() : '',
        pipelineStage: customer.stage || 'Lead',
        operationalStatus: getOperationalStatus(customerLifecycleStages),
      };

      // Add lifecycle stage columns with proper status from database
      defaultLifecycleStages.forEach(stage => {
        const stageKey = stage.name.replace(/\s+/g, '_');
        baseData[stageKey] = getStageStatus(stage.name, customerLifecycleStages);
      });

      return baseData;
    });

    // Create worksheet headers
    const headers = [
      'Name',
      'Country', 
      'Industry',
      'Contact Name',
      'Contact Email',
      'Contact Phone',
      'Contract Size',
      'Status',
      'Segment',
      'Created Date',
      'Go Live Date',
      'Pipeline Stage',
      'Operational Status',
      ...defaultLifecycleStages.map(stage => stage.name)
    ];

    // Create worksheet data
    const worksheetData = [
      headers,
      ...exportData.map(customer => [
        customer.name,
        customer.country,
        customer.industry,
        customer.contactName,
        customer.contactEmail,
        customer.contactPhone,
        customer.contractSize,
        customer.status,
        customer.segment,
        customer.createdAt,
        customer.goLiveDate,
        customer.pipelineStage,
        customer.operationalStatus,
        ...defaultLifecycleStages.map(stage => {
          const stageKey = stage.name.replace(/\s+/g, '_');
          return customer[stageKey];
        })
      ])
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-size columns
    const colWidths = headers.map(header => ({
      wch: Math.max(header.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers & Lifecycle');

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `customers-lifecycle-export-${currentDate}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export customers to Excel');
  }
}