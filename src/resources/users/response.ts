import { RelationshipItem } from '../../common/relationships';

export interface UserAttributes {
  first_name?: string;
  last_name?: string;
  email?: string;
  language?: string;
  status?: string;
  edition?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserAssociationAttributes {
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserAssociationRelationships {
  organisation?: RelationshipItem;
  user?: RelationshipItem;
}
