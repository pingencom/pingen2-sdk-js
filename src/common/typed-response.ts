import { CollectionLinks, CollectionMeta, ItemLinks } from './json-api';

export interface ApiResource<A> {
  id: string;
  resourceType: string;
  attributes: A;
  relationships?: Record<string, unknown>;
  links?: ItemLinks;
  meta?: Record<string, unknown>;
  included: Record<string, unknown>[];
  statusCode: number;
  headers: Record<string, string>;
}

export interface ApiCollectionItem<A> {
  id: string;
  resourceType: string;
  attributes: A;
  relationships?: Record<string, unknown>;
  links?: ItemLinks;
  meta?: Record<string, unknown>;
}

export interface ApiCollection<A> {
  data: ApiCollectionItem<A>[];
  links?: CollectionLinks;
  meta?: CollectionMeta;
  included: Record<string, unknown>[];
  statusCode: number;
  headers: Record<string, string>;
}
