const SIMULATION_DEBUG = false

export function debugLog(...args: unknown[]): void {
  if (SIMULATION_DEBUG) {
    console.log(...args)
  }
}
