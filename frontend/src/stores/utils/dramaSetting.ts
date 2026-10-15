import { DEFAULT_DRAMA_INTENSITY, DRAMA_INTENSITIES, type DramaIntensity } from '../config/pressure'

const KEY = 'clockwork.dramaIntensity'

export function loadDramaIntensity(): DramaIntensity {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored && (DRAMA_INTENSITIES as string[]).includes(stored)) return stored as DramaIntensity
  } catch {
    // storage unavailable: use the default
  }
  return DEFAULT_DRAMA_INTENSITY
}

export function saveDramaIntensity(value: DramaIntensity): void {
  try {
    localStorage.setItem(KEY, value)
  } catch {
    // storage unavailable: the setting just lasts for this session
  }
}
