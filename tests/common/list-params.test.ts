import { describe, test, expect } from 'vitest';
import { serializeListParams } from '../../src/common/list-params';

describe('serializeListParams', () => {
  test('returns undefined when no params given', () => {
    expect(serializeListParams()).toBeUndefined();
  });

  test('returns undefined for an empty object', () => {
    expect(serializeListParams({})).toBeUndefined();
  });

  test('returns undefined when page has no numeric fields', () => {
    expect(serializeListParams({ page: {} })).toBeUndefined();
  });

  test('serializes pagination fields', () => {
    expect(serializeListParams({ page: { number: 2, limit: 50 } })).toEqual({
      'page[number]': '2',
      'page[limit]': '50',
    });
  });

  test('serializes sort, q and include', () => {
    expect(serializeListParams({ sort: '-created_at', q: 'invoice', include: 'events' })).toEqual({
      sort: '-created_at',
      q: 'invoice',
      include: 'events',
    });
  });

  test('serializes sparse fieldsets per resource type', () => {
    expect(serializeListParams({ fields: { organisations: 'name,status', letters: 'status' } })).toEqual({
      'fields[organisations]': 'name,status',
      'fields[letters]': 'status',
    });
  });

  test('combines every supported parameter', () => {
    expect(
      serializeListParams({
        page: { number: 1, limit: 10 },
        sort: 'created_at',
        q: 'term',
        include: 'events',
        fields: { letters: 'status' },
      }),
    ).toEqual({
      'page[number]': '1',
      'page[limit]': '10',
      sort: 'created_at',
      q: 'term',
      include: 'events',
      'fields[letters]': 'status',
    });
  });
});
