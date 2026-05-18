import { RelationshipItem, RelationshipMany } from '../../common/relationships';

export interface EbillAttributes {
  status?: string;
  file_original_name?: string;
  file_pages?: number;
  recipient_identifier?: string;
  recipient_address?: string;
  invoice_number?: string;
  invoice_date?: string;
  invoice_due_date?: string;
  invoice_value?: number;
  invoice_currency?: string;
  invoice_iban?: string;
  invoice_address?: string;
  invoice_reference?: string;
  price_currency?: string;
  price_value?: number;
  source?: string;
  submitted_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EbillRelationships {
  organisation?: RelationshipItem;
  events?: RelationshipMany;
}
