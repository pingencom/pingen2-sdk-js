import { buildJsonApi } from '../../src/utils/payload';

describe('buildJsonApi', () => {
  test('serialises a minimal envelope with type only', () => {
    expect(buildJsonApi({ type: 'foo' })).toBe('{"data":{"type":"foo"}}');
  });

  test('omits attributes when not provided (some endpoints reject empty attributes)', () => {
    const json = JSON.parse(buildJsonApi({ type: 'foo', id: 'abc' }));
    expect(json.data).toEqual({ type: 'foo', id: 'abc' });
    expect('attributes' in json.data).toBe(false);
  });

  test('includes id, attributes, relationships when provided', () => {
    const json = JSON.parse(
      buildJsonApi({
        type: 'letters',
        id: 'xx',
        attributes: { auto_send: true },
        relationships: { preset: { data: { id: 'p', type: 'presets' } } },
      }),
    );
    expect(json.data.id).toBe('xx');
    expect(json.data.attributes).toEqual({ auto_send: true });
    expect(json.data.relationships).toEqual({ preset: { data: { id: 'p', type: 'presets' } } });
  });
});
