// Tekst uit een PDF halen, volledig in de browser (pdf.js). Library en worker worden pas geladen bij het eerste gebruik.

let pdfjsPromise = null

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
      .then(([pdfjs, worker]) => {
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default
        return pdfjs
      })
      .catch((e) => {
        pdfjsPromise = null
        throw e
      })
  }
  return pdfjsPromise
}

/** Zet de tekstitems van één pagina om naar regels (pdf.js markeert regeleinden met hasEOL). */
export function itemsToText(items) {
  let text = ''
  for (const item of items || []) {
    if (typeof item?.str !== 'string') continue
    text += item.str
    text += item.hasEOL ? '\n' : item.str && !item.str.endsWith(' ') ? ' ' : ''
  }
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

/**
 * Tekst van de eerste `maxPages` pagina's van een PDF-bestand.
 * Gooit een fout bij een ongeldige/beveiligde PDF; een gescande PDF zonder tekstlaag geeft een lege string.
 */
export async function extractPdfText(file, maxPages = 5) {
  const pdfjs = await loadPdfjs()
  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise
  try {
    const pages = []
    const count = Math.min(doc.numPages, Math.max(1, maxPages))
    for (let i = 1; i <= count; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      pages.push(itemsToText(content.items))
      page.cleanup()
    }
    return pages.filter(Boolean).join('\n\n')
  } finally {
    doc.destroy()
  }
}
