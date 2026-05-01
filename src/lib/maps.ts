/**
 * FreteJá — Serviço de Mapas Gratuito
 * Usa OpenStreetMap (Nominatim) + OSRM — sem API key, sem custo
 */

// Coordenadas centrais de Colatina-ES
export const COLATINA = { lat: -19.5339, lng: -40.6274 }

export interface Sugestao {
  nome: string
  enderecoCompleto: string
  lat: number
  lng: number
}

export interface ResultadoRota {
  distancia_km: number
  duracao_min: number
  via: 'osrm' | 'haversine'
}

// ─────────────────────────────────────────────────────────────────────────────
// Geocoding: endereço → coordenadas (Nominatim / OpenStreetMap)
// ─────────────────────────────────────────────────────────────────────────────
export async function buscarEnderecos(query: string): Promise<Sugestao[]> {
  if (!query || query.trim().length < 3) return []

  try {
    // Adiciona contexto de Colatina se não mencionado
    const q = query.toLowerCase().includes('colatina') ? query : `${query}, Colatina, ES`
    
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('q', q)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '6')
    url.searchParams.set('countrycodes', 'br')
    url.searchParams.set('addressdetails', '1')
    // Foca na região do ES para resultados mais relevantes
    url.searchParams.set('viewbox', '-41.5,-18.5,-39.5,-20.5')
    url.searchParams.set('bounded', '0')

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'FreteJa-Colatina/1.0 (freteja.com.br)' }
    })

    if (!res.ok) throw new Error('Nominatim error')

    const data: Array<{
      lat: string; lon: string; display_name: string
      address: { road?: string; suburb?: string; city?: string; town?: string; state?: string }
    }> = await res.json()

    return data.map((item) => {
      // Formata nome curto amigável
      const parts = [
        item.address.road,
        item.address.suburb,
        item.address.city || item.address.town || 'Colatina',
      ].filter(Boolean)

      return {
        nome: parts.join(', ') || item.display_name.split(',')[0],
        enderecoCompleto: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }
    })
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Routing: coordenadas → distância e tempo reais (OSRM)
// ─────────────────────────────────────────────────────────────────────────────
export async function calcularRota(
  origemLat: number, origemLng: number,
  destinoLat: number, destinoLng: number
): Promise<ResultadoRota> {
  try {
    // OSRM público — gratuito, sem chave
    const url = `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destinoLng},${destinoLat}?overview=false&steps=false`

    const res = await fetch(url)
    if (!res.ok) throw new Error('OSRM unavailable')

    const data = await res.json()

    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('Rota não encontrada')

    const rota = data.routes[0]
    return {
      distancia_km: Math.round(rota.distance / 100) / 10,  // metros → km (1 decimal)
      duracao_min: Math.round(rota.duration / 60),           // segundos → minutos
      via: 'osrm'
    }
  } catch {
    // Fallback Haversine — calcula distância em linha reta + fator de rota
    return calcularHaversine(origemLat, origemLng, destinoLat, destinoLng)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback: Haversine (linha reta × 1.35 para simular rota urbana)
// ─────────────────────────────────────────────────────────────────────────────
function calcularHaversine(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): ResultadoRota {
  const R = 6371 // Raio da Terra em km
  const toRad = (v: number) => v * Math.PI / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  const distanciaReta = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanciaRota = distanciaReta * 1.35  // fator de tortuosidade urbana
  const velocidadeMedia = 35  // km/h (média em cidade com trânsito)

  return {
    distancia_km: Math.round(distanciaRota * 10) / 10,
    duracao_min: Math.round((distanciaRota / velocidadeMedia) * 60),
    via: 'haversine'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Formata duração de forma legível
// ─────────────────────────────────────────────────────────────────────────────
export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}
