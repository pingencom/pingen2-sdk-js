import { RelationshipItem, RelationshipMany } from '../../common/relationships';

export interface BatchAttributes {
  name?: string;
  /** `post` | `ebill` | `email` — see {@link ChannelType}. */
  channel_type?: string;
  icon?: string;
  status?: string;
  file_original_name?: string;
  /** @deprecated Superseded by {@link BatchAttributes.deliverable_count}. */
  letter_count?: number;
  deliverable_count?: number;
  address_position?: string;
  price_currency?: string;
  price_value?: number;
  print_mode?: string;
  print_spectrum?: string;
  source?: string;
  submitted_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BatchRelationships {
  organisation?: RelationshipItem;
  events?: RelationshipMany;
}

export interface BatchStatisticsAttributes {
  letter_validating?: number;
  letter_groups?: unknown[];
  letter_countries?: unknown[];
  letter_regions?: unknown[];
}
