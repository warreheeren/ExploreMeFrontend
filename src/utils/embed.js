import { escapeHtml } from './html'

export const EMBED_HEIGHTS = [320, 420, 560]
export const EMBED_THEMES = ['auto', 'light', 'dark']

/** URL van de insluitbare kaart; onbekende thema's vallen terug op 'auto'. */
export function embedUrl(origin, token, theme = 'auto') {
  const safeTheme = EMBED_THEMES.includes(theme) ? theme : 'auto'
  return `${origin}/embed/${encodeURIComponent(token)}?theme=${safeTheme}`
}

/** De <iframe>-code om te plakken; de titel wordt ge-escapet (ze komt van de gebruiker). */
export function embedCode({ origin, token, theme = 'auto', height = 420, title = '' }) {
  const h = Math.round(Number(height)) || 420
  return `<iframe src="${escapeHtml(embedUrl(origin, token, theme))}" width="100%" height="${h}" `
    + `style="border:0;border-radius:12px" loading="lazy" title="${escapeHtml(`${title} – ExploreMe`)}"></iframe>`
}
