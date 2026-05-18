export interface JsonApiEnvelope {
  type: string;
  id?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
}

// Serialise a JSON:API document. Keeping this in one helper avoids drift between resources
// and ensures optional keys (id, attributes, relationships) stay omitted when absent —
// some Pingen endpoints reject unexpected null fields.
export function buildJsonApi(env: JsonApiEnvelope): string {
  const data: Record<string, unknown> = { type: env.type };
  if (env.id !== undefined) {
    data.id = env.id;
  }
  if (env.attributes !== undefined) {
    data.attributes = env.attributes;
  }
  if (env.relationships !== undefined) {
    data.relationships = env.relationships;
  }
  return JSON.stringify({ data });
}
