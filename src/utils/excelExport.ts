import * as XLSX from 'xlsx';
import { CustomerData } from '@/types/customers';
import { defaultLifecycleStages } from '@/data/defaultLifecycleStages';
import { canonicalizeStageName, createStageNameMap, logUnmappedStageNames } from './stageNames';

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
  lastContactedAt: string;
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

const getStageStatus = (stageName: string, stageMap: Map<string, any>): string => {
  const canonical = canonicalizeStageName(stageName);
  const stage = stageMap.get(canonical);
  
  if (!stage || !stage.status) return 'Not Started';
  
  if (isCompletedLike(stage.status)) return 'Completed';
  if (isInProgressLike(stage.status)) return 'In Progress';
  if (isBlockedLike(stage.status)) return 'Blocked';
  return 'Not Started';
};

const getOperationalStatus = (stageMap: Map<string, any>): string => {
  if (!stageMap || stageMap.size === 0) return "not-started";

  // Check if customer has completed "Go Live" stage (using canonical name)
  const goLiveStage = stageMap.get('Go Live');
  const hasCompletedGoLive = goLiveStage && isCompletedLike(goLiveStage.status);

  if (hasCompletedGoLive) return "done";

  // Check if any stage is blocked
  const hasBlockedStages = Array.from(stageMap.values()).some(stage => isBlockedLike(stage.status));
  if (hasBlockedStages) return "blocked";

  // Check if any stage is in progress
  const hasInProgressStages = Array.from(stageMap.values()).some(stage => isInProgressLike(stage.status));
  if (hasInProgressStages) return "in-progress";

  // Check if any stage is completed (but not Go Live)
  const hasCompletedStages = Array.from(stageMap.values()).some(stage => isCompletedLike(stage.status));
  if (hasCompletedStages) return "in-progress";

  return "not-started";
};

export function exportCustomersToExcel(customers: CustomerData[], allLifecycleStages: any[] = []): void {
  try {
    // Log any unmapped stage names for debugging
    logUnmappedStageNames(allLifecycleStages);
    
    // Create export data structure
    const exportData: ExportCustomerData[] = customers.map(customer => {
      // Get lifecycle stages for this specific customer
      const customerLifecycleStages = allLifecycleStages.filter(stage => stage.customer_id === customer.id);
      
      // Create a stage map for fast canonical lookups
      const stageMap = createStageNameMap(customerLifecycleStages);
      
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
        operationalStatus: getOperationalStatus(stageMap),
        lastContactedAt: customer.last_contacted_at ? new Date(customer.last_contacted_at).toLocaleDateString() : '',
      };

      // Add lifecycle stage columns with proper status from database using canonical names
      defaultLifecycleStages.forEach(stage => {
        const stageKey = stage.name.replace(/\s+/g, '_');
        baseData[stageKey] = getStageStatus(stage.name, stageMap);
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
      'Last Contacted',
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
        customer.lastContactedAt,
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