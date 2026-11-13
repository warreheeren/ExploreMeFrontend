// Reisadviesniveaus (FCDO via GOV.UK), zoals de API ze in CountryInfoDto.advisoryLevel teruggeeft.
// Kleuren als vaste Tailwind-klassen met een dark-variant (darkMode: 'class'), zodat de purge ze vindt.

/** Niveaus van licht naar streng. */
export const ADVISORY_LEVELS = ['normal', 'caution', 'avoidNonEssentialParts', 'avoidNonEssential', 'avoidAll']

const LEVEL_CLASSES = {
  normal: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900',
  caution: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900',
  avoidNonEssentialParts: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-900',
  avoidNonEssential: 'bg-orange-100 text-red-700 ring-orange-300 dark:bg-red-950 dark:text-orange-300 dark:ring-red-900',
  avoidAll: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900',
}

const DOT_CLASSES = {
  normal: 'bg-emerald-500',
  caution: 'bg-amber-400',
  avoidNonEssentialParts: 'bg-orange-500',
  avoidNonEssential: 'bg-orange-600',
  avoidAll: 'bg-red-600',
}

/** Is dit een niveau dat we kennen? Onbekende (toekomstige) waarden tonen we niet. */
export function isAdvisoryLevel(level) {
  return ADVISORY_LEVELS.includes(level)
}

/** Klassen voor het label (achtergrond, tekst, ring) van een niveau; leeg voor een onbekend niveau. */
export function advisoryLevelClass(level) {
  return LEVEL_CLASSES[level] || ''
}

/** Klasse voor het gekleurde bolletje in het label. */
export function advisoryDotClass(level) {
  return DOT_CLASSES[level] || ''
}
