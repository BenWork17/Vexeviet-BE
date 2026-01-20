export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}
