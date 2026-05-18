import { RelationshipItem } from '../../common/relationships';

export interface EventAttributes {
  code?: string;
  name?: string;
  description?: string;
  producer?: string;
  location?: string;
  has_image?: boolean;
  data?: unknown[];
  emitted_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EventRelationships {
  letter?: RelationshipItem;
  batch?: RelationshipItem;
  ebill?: RelationshipItem;
  email?: RelationshipItem;
}
