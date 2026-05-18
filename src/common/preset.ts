export class PresetRelationship {
  private readonly presetId: string;

  constructor(presetId: string) {
    this.presetId = presetId;
  }

  toValue(): { preset: { data: { id: string; type: string } } } {
    return {
      preset: {
        data: {
          id: this.presetId,
          type: 'presets',
        },
      },
    };
  }
}
