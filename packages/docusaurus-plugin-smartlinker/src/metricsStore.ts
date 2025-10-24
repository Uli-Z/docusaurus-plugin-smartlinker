let termProcessingMs = 0;
let indexBuildMs = 0;

function normalizeDuration(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Number(value.toFixed(2));
}

export function recordTermProcessingMs(durationMs: number): void {
  const normalized = normalizeDuration(durationMs);
  if (normalized <= 0) {
    return;
  }
  termProcessingMs += normalized;
}

export function getTermProcessingMs(): number {
  return Number(termProcessingMs.toFixed(2));
}

export function consumeTermProcessingMs(): number {
  const total = getTermProcessingMs();
  termProcessingMs = 0;
  return total;
}

export function resetTermProcessingMs(): void {
  termProcessingMs = 0;
}

export function recordIndexBuildMs(durationMs: number): void {
  const normalized = normalizeDuration(durationMs);
  if (normalized <= 0) {
    return;
  }
  indexBuildMs += normalized;
}

export function getIndexBuildMs(): number {
  return Number(indexBuildMs.toFixed(2));
}

export function consumeIndexBuildMs(): number {
  const total = getIndexBuildMs();
  indexBuildMs = 0;
  return total;
}

export function resetIndexBuildMs(): void {
  indexBuildMs = 0;
}

export function resetMetrics(): void {
  resetTermProcessingMs();
  resetIndexBuildMs();
}
