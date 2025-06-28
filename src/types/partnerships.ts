
export type PartnershipType = 'reseller' | 'consultant' | 'platform_partner' | 'education_partner' | 'mou_partner';

export type PartnershipStatus = 'in_discussion' | 'signed' | 'active' | 'inactive' | 'expired';

export interface Partnership {
  id: string;
  name: string;
  partnership_type: PartnershipType;
  country?: string;
  region?: string;
  start_date?: string;
  renewal_date?: string;
  expiry_date?: string;
  status: PartnershipStatus;
  expected_value?: number;
  owner_id?: string;
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnershipContact {
  id: string;
  partnership_id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  is_primary?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnershipDocument {
  id: string;
  partnership_id: string;
  name: string;
  document_type: string;
  file_path: string;
  file_size?: number;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnershipTimeline {
  id: string;
  partnership_id: string;
  event_type: string;
  event_description: string;
  created_by?: string;
  created_by_name?: string;
  created_by_avatar?: string;
  related_type?: string;
  related_id?: string;
  created_at: string;
  updated_at: string;
}

export const PARTNERSHIP_TYPE_LABELS: Record<PartnershipType, string> = {
  reseller: 'Reseller',
  consultant: 'Consultant',
  platform_partner: 'Platform Partner',
  education_partner: 'Education Partner',
  mou_partner: 'MoU Partner'
};

export const PARTNERSHIP_STATUS_LABELS: Record<PartnershipStatus, string> = {
  in_discussion: 'In Discussion',
  signed: 'Signed',
  active: 'Active',
  inactive: 'Inactive',
  expired: 'Expired'
};
