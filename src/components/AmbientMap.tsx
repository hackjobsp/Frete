'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'

// Custom Blue Truck Icon (matching user's request: blue cab, white/gray cargo)
const truckSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 128">
  <rect x="8" y="32" width="48" height="88" rx="4" fill="#E5E7EB" stroke="#D1D5DB" stroke-width="2"/>
  <rect x="12" y="8" width="40" height="28" rx="6" fill="#3B82F6" />
  <rect x="16" y="14" width="32" height="12" rx="2" fill="#93C5FD" />
</svg>
`)

const carIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;charset=utf-8,${truckSvg}`, 
  iconSize: [24, 48],
  iconAnchor: [12, 24],
})

// Centro de Colatina
const CENTER_LAT = -19.5339
const CENTER_LNG = -40.6274

type RealDriver = { id: string; lat: number; lng: number; last_updated: number }

export default function AmbientMap() {
  const [cars, setCars] = useState<RealDriver[]>([])
  const [mapCenter, setMapCenter] = useState<[number, number]>([CENTER_LAT, CENTER_LNG])
  
  useEffect(() => {
    // Tenta centralizar no usuário, senão usa Colatina
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMapCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {} // fallback to Colatina
      )
    }
  }, [])

  useEffect(() => {
    // Configura o canal de Presence do Supabase para motoristas online reais
    const channel = supabase.channel('motoristas_ativos')

    channel.on('presence', { event: 'sync' }, () => {
      const newState = channel.presenceState()
      const onlineDrivers: RealDriver[] = []
      
      for (const id in newState) {
        const presences = newState[id] as any[]
        // Pega a presença mais recente desse motorista
        if (presences.length > 0) {
          const latest = presences[presences.length - 1]
          onlineDrivers.push({
            id: id,
            lat: latest.lat,
            lng: latest.lng,
            last_updated: latest.timestamp
          })
        }
      }
      setCars(onlineDrivers)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Conectado ao canal de motoristas online')
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [mapCenter])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap & Carto'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {cars.map(c => (
          <Marker key={c.id} position={[c.lat, c.lng]} icon={carIcon} />
        ))}
      </MapContainer>
      
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, background: 'linear-gradient(to top, #F9FAFB, transparent)', zIndex: 1000, pointerEvents: 'none' }} />
    </div>
  )
}
