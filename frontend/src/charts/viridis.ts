/**
 * Viridis perceptual colormap for continuous "fill by metric" encoding
 * (host-map / heatmap style). Kept separate from the green/amber/red status
 * semantics, which are reserved for discrete SLA/alert state.
 */

const VIRIDIS_STOPS = [
  [68, 1, 84],
  [70, 50, 126],
  [54, 92, 141],
  [39, 127, 142],
  [31, 161, 135],
  [74, 193, 109],
  [160, 218, 57],
  [253, 231, 37]
] as const

/** CSS gradient string for legend bars. */
export const VIRIDIS_GRADIENT =
  'linear-gradient(90deg,#440154,#46327e,#365c8d,#277f8e,#1fa187,#4ac16d,#a0da39,#fde725)'

/** Map a 0..1 value to a viridis `rgb(...)` string (clamped). */
export function viridisColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0))
  const scaled = clamped * (VIRIDIS_STOPS.length - 1)
  const index = Math.floor(scaled)
  if (index >= VIRIDIS_STOPS.length - 1) {
    const [r, g, b] = VIRIDIS_STOPS[VIRIDIS_STOPS.length - 1]
    return `rgb(${r}, ${g}, ${b})`
  }
  const frac = scaled - index
  const a = VIRIDIS_STOPS[index]
  const b = VIRIDIS_STOPS[index + 1]
  const mix = (i: number) => Math.round(a[i] + (b[i] - a[i]) * frac)
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`
}
