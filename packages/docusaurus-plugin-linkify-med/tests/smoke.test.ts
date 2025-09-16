import { describe, it, expect } from 'vitest';
import plugin from '../src/index.js';

describe('plugin skeleton', () => {
  it('exports a default function', () => {
    expect(typeof plugin).toBe('function');
  });
});