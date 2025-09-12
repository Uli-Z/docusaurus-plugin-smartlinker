import { describe, it, expect } from 'vitest';
import plugin from '../src/index';

describe('plugin skeleton', () => {
  it('exports a default function', () => {
    expect(typeof plugin).toBe('function');
  });
});