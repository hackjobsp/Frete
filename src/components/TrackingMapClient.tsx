'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'

// Custom icons
const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function haversineFast(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Auto-zoom component
function MapBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [positions, map])
  
  return null
}

export type TrackingMapProps = {
  pedidoId: string
  pedidoStatus: string
  isMotorista: boolean
  origem: { lat: number; lng: number }
  destino: { lat: number; lng: number }
  onConnectionChange?: (connected: boolean) => void
}

export default function TrackingMapClient({ pedidoId, pedidoStatus, isMotorista, origem, destino, onConnectionChange }: TrackingMapProps) {
  const [motoristaPos, setMotoristaPos] = useState<[number, number] | null>(null)
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const [connected, setConnected] = useState(false)
  
  const watchIdRef = useRef<number | null>(null)
  const motoristaPosRef = useRef<[number, number] | null>(null)
  const channelRef = useRef<any>(null)

  // Atualiza a ref sempre que o estado muda para o heartbeat usar o valor mais recente
  useEffect(() => {
    if (motoristaPos) motoristaPosRef.current = motoristaPos
  }, [motoristaPos])

  // Fetch route geometry using OSRM
  useEffect(() => {
    async function fetchRoute() {
      try {
        let routeStart = origem
        let routeEnd = destino

        // Se o pedido acabou de ser aceito, o motorista está indo para a ORIGEM
        if (pedidoStatus === 'aceito') {
          if (motoristaPos) routeStart = { lat: motoristaPos[0], lng: motoristaPos[1] }
          routeEnd = origem
        } 
        // Se está em andamento, o motorista já está com a carga indo para o DESTINO
        else if (pedidoStatus === 'em_andamento') {
          if (motoristaPos) routeStart = { lat: motoristaPos[0], lng: motoristaPos[1] }
          routeEnd = destino
        }

        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${routeStart.lng},${routeStart.lat};${routeEnd.lng},${routeEnd.lat}?geometries=geojson`)
        const data = await res.json()
        if (data.routes && data.routes[0] && data.routes[0].geometry) {
          const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number])
          setRouteCoords(coords)
        }
      } catch (err) {
        console.error('Erro ao buscar rota OSRM', err)
      }
    }
    // Só busca a rota se tivermos as coordenadas necessárias
    fetchRoute()
  }, [origem, destino, pedidoStatus, motoristaPos])

  const startTracking = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      console.error('Geolocalização não suportada')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        
        // Update local state so driver sees themselves
        setMotoristaPos([latitude, longitude])
        motoristaPosRef.current = [latitude, longitude]
        
        // Envia imediatamente quando o GPS atualiza
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'location_update',
            payload: { lat: latitude, lng: longitude, timestamp: Date.now() }
          })
        }
      },
      (error) => {
        console.error('Erro no GPS', error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000
      }
    )
  }

  // Setup Supabase Realtime
  useEffect(() => {
    const channel = supabase.channel(`tracking_pedido_${pedidoId}`, {
      config: {
        broadcast: { ack: false }
      }
    })

    channelRef.current = channel

    // Handle incoming locations (mostly for the client)
    channel.on('broadcast', { event: 'location_update' }, (payload: any) => {
      if (!isMotorista) {
        setMotoristaPos([payload.payload.lat, payload.payload.lng])
      }
    })

    channel.subscribe((status) => {
      const isConnected = status === 'SUBSCRIBED'
      setConnected(isConnected)
      if (onConnectionChange) onConnectionChange(isConnected)
      
      if (isConnected && isMotorista) {
        startTracking()
      }
    })

    // Heartbeat mechanism to keep channel alive e enviar posição periodicamente para clientes que conectarem atrasados
    const heartbeatInterval = setInterval(() => {
      if (channel && motoristaPosRef.current) {
        channel.send({
          type: 'broadcast',
          event: 'location_update', // Mandamos como location_update no heartbeat também!
          payload: { 
            lat: motoristaPosRef.current[0], 
            lng: motoristaPosRef.current[1], 
            timestamp: Date.now() 
          }
        })
      }
    }, 4000) // A cada 4 segundos

    return () => {
      clearInterval(heartbeatInterval)
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [pedidoId, isMotorista, onConnectionChange])

  // Calculate positions for Auto-zoom
  const allPositions: [number, number][] = [
    [origem.lat, origem.lng],
    [destino.lat, destino.lng]
  ]
  if (motoristaPos) allPositions.push(motoristaPos)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!connected && (
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: '#EF4444', color: 'white', padding: '8px 16px',
          borderRadius: 20, fontSize: '0.85rem', fontWeight: 600, boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
        }}>
          Reconectando...
        </div>
      )}
      <MapContainer
        center={[origem.lat, origem.lng]}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBounds positions={allPositions} />

        {routeCoords.length > 0 && (
          <Polyline positions={routeCoords} color="#3B82F6" weight={4} opacity={0.7} dashArray="5, 10" />
        )}

        {/* Mostra a origem se estiver aceito ou se não for o motorista para manter referência */}
        {(pedidoStatus === 'aceito' || !motoristaPos) && (
          <Marker position={[origem.lat, origem.lng]} icon={originIcon}>
            <Popup>Origem</Popup>
          </Marker>
        )}

        {/* Só mostra o destino se estiver em andamento */}
        {pedidoStatus === 'em_andamento' && (
          <Marker position={[destino.lat, destino.lng]} icon={destIcon}>
            <Popup>Destino</Popup>
          </Marker>
        )}

        {motoristaPos && (
          <Marker position={motoristaPos} icon={driverIcon}>
            <Popup>Motorista</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
