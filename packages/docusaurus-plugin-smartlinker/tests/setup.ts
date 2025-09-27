import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

vi.mock('../src/theme/runtime/Tooltip.js', () => ({
  __esModule: true,
  default: ({ content, children }: { content?: React.ReactNode; children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children, content ?? null),
}));

// Minimal ResizeObserver polyfill for Radix Tooltip in jsdom
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
globalThis.ResizeObserver = (globalThis as any).ResizeObserver || RO;
