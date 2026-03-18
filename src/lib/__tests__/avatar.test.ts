/**
 * Unit tests for lib/avatar.ts — avatar config from seed and JSON.
 */
import { avatarConfigFromSeed, jsonToConfig } from '../avatar';

describe('avatarConfigFromSeed', () => {
  it('returns same config for same seed', () => {
    const a = avatarConfigFromSeed('user-1');
    const b = avatarConfigFromSeed('user-1');
    expect(a).toEqual(b);
  });

  it('returns different config for different seeds', () => {
    const a = avatarConfigFromSeed('user-1');
    const b = avatarConfigFromSeed('user-2');
    expect(a).not.toEqual(b);
  });

  it('returns valid eyeExpression and accessory', () => {
    const config = avatarConfigFromSeed('any');
    expect(['happy', 'sleepy', 'excited', 'neutral']).toContain(config.eyeExpression);
    expect(['none', 'glasses', 'hat']).toContain(config.accessory);
  });
});

describe('jsonToConfig', () => {
  it('parses valid object to AvatarConfig', () => {
    const json = {
      skinTone: '#abc',
      hairStyle: 2,
      hairColor: '#111',
      topStyle: 1,
      topColor: '#2a4fd6',
      eyeExpression: 'happy',
      accessory: 'glasses',
    };
    const config = jsonToConfig(json);
    expect(config.skinTone).toBe('#abc');
    expect(config.eyeExpression).toBe('happy');
    expect(config.accessory).toBe('glasses');
  });

  it('uses defaults for missing or invalid fields', () => {
    const config = jsonToConfig({});
    expect(config.skinTone).toBe('#f5c5a0');
    expect(config.hairStyle).toBe(1);
    expect(config.eyeExpression).toBe('neutral');
    expect(config.accessory).toBe('none');
  });

  it('rejects invalid eyeExpression and falls back to neutral', () => {
    const config = jsonToConfig({ eyeExpression: 'invalid' });
    expect(config.eyeExpression).toBe('neutral');
  });

  it('returns default config for non-object input', () => {
    const config = jsonToConfig(null);
    expect(config).toBeDefined();
    expect(config.skinTone).toBeDefined();
  });
});
