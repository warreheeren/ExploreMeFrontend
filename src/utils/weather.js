// WMO-weercodes (Open-Meteo) → icoon en vertaalsleutel (planning.weather.codes.<key>).

export function weatherInfo(code) {
  const c = Number(code)
  if (c === 0) return { icon: 'sun', key: 'clear' }
  if (c === 1 || c === 2) return { icon: 'cloud-sun', key: 'partly' }
  if (c === 3) return { icon: 'cloud', key: 'overcast' }
  if (c === 45 || c === 48) return { icon: 'fog', key: 'fog' }
  if (c >= 51 && c <= 57) return { icon: 'rain', key: 'drizzle' }
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return { icon: 'rain', key: 'rain' }
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { icon: 'snow', key: 'snow' }
  if (c >= 95) return { icon: 'storm', key: 'storm' }
  return { icon: 'cloud', key: 'unknown' }
}
