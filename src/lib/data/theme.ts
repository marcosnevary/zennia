export type ThemePreference = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

export const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

const THEME_CACHE_KEY = 'zennia:theme'

/**
 * The theme is kept in the database, but `src/app.html` has to know it before the first paint,
 * so the last known choice is also cached in localStorage.
 */
export function readThemeCache(): ThemePreference {
  try {
    const saved = JSON.parse(localStorage.getItem(THEME_CACHE_KEY) ?? 'null')
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

export function writeThemeCache(theme: ThemePreference): void {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(theme))
  } catch {
    // storage full or blocked: the theme only flashes on the next load
  }
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): Theme {
  if (preference === 'system') return systemDark ? 'dark' : 'light'
  return preference
}
