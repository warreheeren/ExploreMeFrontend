// Thema en taal vóór de eerste paint toepassen (geen witte flits in donkere modus).
// Apart bestand i.p.v. inline script, zodat de Content-Security-Policy geen 'unsafe-inline' voor scripts nodig heeft.
try {
  var t = localStorage.getItem('theme') || 'system'
  var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (dark) document.documentElement.classList.add('dark')
  var l = localStorage.getItem('locale')
  if (l === 'en' || l === 'nl') document.documentElement.lang = l
} catch (e) {}
