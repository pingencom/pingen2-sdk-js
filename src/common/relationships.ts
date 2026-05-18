export interface RelationshipData {
  id: string;
  type: string;
}

export type RelationshipLinkSimple = string;

export interface RelationshipLinkRich {
  href: string;
  meta?: Record<string, unknown>;
}

export interface RelationshipLinks {
  related?: RelationshipLinkSimple | RelationshipLinkRich;
}

export interface RelationshipItem {
  links?: RelationshipLinks;
  data?: RelationshipData;
}

export interface RelationshipMany {
  links?: RelationshipLinks;
}
