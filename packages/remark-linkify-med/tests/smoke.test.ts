import { describe, it, expect } from 'vitest';
import plugin from '../src/index.js';

describe('remark plugin skeleton', () => {
  it('exports a function', () => {
    expect(typeof plugin).toBe('function');
  });
});