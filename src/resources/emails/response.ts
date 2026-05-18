import { RelationshipItem, RelationshipMany } from '../../common/relationships';
import { EmailMetaData } from './types';

export interface EmailAttributes {
  status?: string;
  file_original_name?: string;
  file_pages?: number;
  file_url?: string;
  file_url_signature?: string;
  auto_send?: boolean;
  meta_data?: EmailMetaData;
  recipient_identifier?: string;
  price_currency?: string;
  price_value?: number;
  source?: string;
  submitted_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmailRelationships {
  organisation?: RelationshipItem;
  events?: RelationshipMany;
  preset?: RelationshipItem;
}
