import { RelationshipItem, RelationshipMany } from '../../common/relationships';

export interface FontInfo {
  name: string;
  is_embedded: boolean;
}

export interface LetterAttributes {
  status?: string;
  file_original_name?: string;
  file_pages?: number;
  address?: string;
  address_position?: string;
  country?: string;
  delivery_product?: string;
  print_mode?: string;
  print_spectrum?: string;
  price_currency?: string;
  price_value?: number;
  paper_types?: string[];
  fonts?: FontInfo[];
  source?: string;
  tracking_number?: string;
  submitted_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LetterRelationships {
  organisation?: RelationshipItem;
  events?: RelationshipMany;
  batch?: RelationshipItem;
}

export interface LetterPriceAttributes {
  currency?: string;
  price?: number;
}
