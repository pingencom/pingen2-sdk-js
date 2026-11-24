import { RelationshipMany } from '../../common/relationships';

export interface OrganisationAttributes {
  name?: string;
  status?: string;
  plan?: string;
  billing_mode?: string;
  billing_currency?: string;
  billing_balance?: number;
  missing_credits?: number;
  edition?: string;
  default_address_position?: string;
  data_retention_addresses?: number;
  data_retention_pdf?: number;
  color?: string;
  flags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface OrganisationRelationships {
  associations?: RelationshipMany;
}
