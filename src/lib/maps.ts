/**
 * FreteJá — Serviço de Mapas
 *
 * Usa Geoapify (OSM-powered) quando API key disponível → melhor qualidade
 * Fallback automático para Nominatim puro (sem chave) se não configurado
 *
 * Geoapify free tier: 3.000 req/dia — suficiente para MVP
 * Obtenha sua chave em: https://www.geoapify.com/ (Get Started Free)
 */

const GEOAPIFY_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_KEY || ''

// Colatina-ES — usado para bias de proximidade no autocomplete
const COLATINA_LAT = -19.5339
const COLATINA_LNG = -40.6274

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
export interface Sugestao {
  nome: string
  enderecoCompleto: string
  lat: number
  lng: number
}

export interface ResultadoRota {
  distancia_km: number
  duracao_min: number
  via: 'geoapify' | 'osrm' | 'haversine'
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOCODING — Autocomplete de endereços
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Geoapify Autocomplete — mais preciso, bias para Colatina-ES
 * Docs: https://apidocs.geoapify.com/docs/geocoding/autocomplete/
 */
async function buscarGeoapify(query: string): Promise<Sugestao[]> {
  const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
  url.searchParams.set('text', query.includes('Colatina') ? query : `${query}, Colatina, ES`)
  url.searchParams.set('apiKey', GEOAPIFY_KEY)
  url.searchParams.set('filter', 'countrycode:br')
  url.searchParams.set('bias', `proximity:${COLATINA_LNG},${COLATINA_LAT}`)
  url.searchParams.set('limit', '6')
  url.searchParams.set('lang', 'pt')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Geoapify error')

  const data = await res.json()

  return (data.features || []).map((f: {
    properties: {
      formatted: string
      street?: string
      suburb?: string
      city?: string
      name?: string
      lon: number
      lat: number
    }
    geometry: { coordinates: [number, number] }
  }) => {
    const p = f.properties
    const parts = [p.name || p.street, p.suburb, p.city || 'Colatina'].filter(Boolean)
    return {
      nome: parts.join(', ') || p.formatted.split(',')[0],
      enderecoCompleto: p.formatted,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }
  })
}

/**
 * Nominatim Fallback — gratuito sem chave, rate limit 1 req/s
 */
async function buscarNominatim(query: string): Promise<Sugestao[]> {
  const q = query.toLowerCase().includes('colatina') ? query : `${query}, Colatina, ES`
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '6')
  url.searchParams.set('countrycodes', 'br')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('viewbox', '-41.5,-18.5,-39.5,-20.5')

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'FreteJa-Colatina/1.0 (freteja.com.br)' }
  })
  if (!res.ok) throw new Error('Nominatim error')

  const data: Array<{
    lat: string; lon: string; display_name: string
    address: { road?: string; suburb?: string; city?: string; town?: string }
  }> = await res.json()

  return data.map(item => {
    const parts = [item.address.road, item.address.suburb, item.address.city || item.address.town || 'Colatina'].filter(Boolean)
    return {
      nome: parts.join(', ') || item.display_name.split(',')[0],
      enderecoCompleto: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }
  })
}

/** API unificada — usa Geoapify se tiver chave, senão Nominatim */
export async function buscarEnderecos(query: string): Promise<Sugestao[]> {
  if (!query || query.trim().length < 3) return []
  try {
    if (GEOAPIFY_KEY) return await buscarGeoapify(query)
    return await buscarNominatim(query)
  } catch {
    try { return await buscarNominatim(query) } catch { return [] }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING — Distância e tempo reais
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Geoapify Routing — modo carro, retorna distância e duração reais
 * Docs: https://apidocs.geoapify.com/docs/routing/
 */
async function rotaGeoapify(
  origemLat: number, origemLng: number,
  destinoLat: number, destinoLng: number
): Promise<ResultadoRota> {
  const url = new URL('https://api.geoapify.com/v1/routing')
  url.searchParams.set('waypoints', `${origemLat},${origemLng}|${destinoLat},${destinoLng}`)
  url.searchParams.set('mode', 'drive')
  url.searchParams.set('apiKey', GEOAPIFY_KEY)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Geoapify routing error')

  const data = await res.json()
  const leg = data.features?.[0]?.properties?.legs?.[0]
  if (!leg) throw new Error('No route found')

  return {
    distancia_km: Math.round(leg.distance / 100) / 10,
    duracao_min: Math.round(leg.time / 60),
    via: 'geoapify'
  }
}

/**
 * OSRM Fallback — gratuito, sem chave
 */
async function rotaOSRM(
  origemLat: number, origemLng: number,
  destinoLat: number, destinoLng: number
): Promise<ResultadoRota> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destinoLng},${destinoLat}?overview=false`
  const res = await fetch(url)
  if (!res.ok) throw new Error('OSRM error')

  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route')

  return {
    distancia_km: Math.round(data.routes[0].distance / 100) / 10,
    duracao_min: Math.round(data.routes[0].duration / 60),
    via: 'osrm'
  }
}

/**
 * Haversine Fallback local — offline, instantâneo
 */
function rotaHaversine(
  lat1: number, lng1: number, lat2: number, lng2: number
): ResultadoRota {
  const R = 6371
  const toRad = (v: number) => v * Math.PI / 180
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.35
  return {
    distancia_km: Math.round(dist * 10) / 10,
    duracao_min: Math.round((dist / 35) * 60),
    via: 'haversine'
  }
}

/** API unificada — Geoapify → OSRM → Haversine */
export async function calcularRota(
  origemLat: number, origemLng: number,
  destinoLat: number, destinoLng: number
): Promise<ResultadoRota> {
  try {
    if (GEOAPIFY_KEY) return await rotaGeoapify(origemLat, origemLng, destinoLat, destinoLng)
    return await rotaOSRM(origemLat, origemLng, destinoLat, destinoLng)
  } catch {
    try {
      return await rotaOSRM(origemLat, origemLng, destinoLat, destinoLng)
    } catch {
      return rotaHaversine(origemLat, origemLng, destinoLat, destinoLng)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────────────────────
export function formatarDuracao(minutos: number): string {
  if (minutos < 1) return '< 1 min'
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/** Label para exibição do provedor de rota */
export function labelVia(via: ResultadoRota['via']): string {
  switch (via) {
    case 'geoapify': return '🛣️ Rota real (Geoapify)'
    case 'osrm': return '🛣️ Rota real (OpenStreetMap)'
    case 'haversine': return '📐 Estimativa de distância'
  }
}
