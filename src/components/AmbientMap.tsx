'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'

// Centro de Colatina
const CENTER_LAT = -19.5339
const CENTER_LNG = -40.6274

type RealDriver = { id: string; lat: number; lng: number; heading: number | null; last_updated: number }

// Hook para focar no usuário
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      map.setView(center, 15)
      isFirstRender.current = false
    }
  }, [center, map])

  return null
}

export default function AmbientMap() {
  const [cars, setCars] = useState<RealDriver[]>([])
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([CENTER_LAT, CENTER_LNG])
  const mapRef = useRef<L.Map | null>(null)
  
  // Custom Blue Truck Icon that can rotate
  const createCarIcon = (heading: number | null) => {
    const rotation = heading || 0
    return new L.DivIcon({
      className: 'smooth-marker', // CSS class for transition
      html: `
        <div style="transform: rotate(${rotation}deg); width: 24px; height: 48px; transform-origin: center center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 128" style="width: 100%; height: 100%;">
            <rect x="8" y="32" width="48" height="88" rx="4" fill="#E5E7EB" stroke="#D1D5DB" stroke-width="2"/>
            <rect x="12" y="8" width="40" height="28" rx="6" fill="#3B82F6" />
            <rect x="16" y="14" width="32" height="12" rx="2" fill="#93C5FD" />
          </svg>
        </div>
      `,
      iconSize: [24, 48],
      iconAnchor: [12, 24],
    })
  }

  // User dot icon
  const userIcon = new L.DivIcon({
    className: '',
    html: `
      <div style="width: 20px; height: 20px; background: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);">
        <div style="width: 100%; height: 100%; background: #3B82F6; border-radius: 50%; animation: pulse 2s infinite;"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })

  useEffect(() => {
    // Monitora a localização do próprio passageiro
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude]
          setUserPos(newPos)
          if (!userPos) setMapCenter(newPos) // Inicializa o centro do mapa
        },
        () => {},
        { enableHighAccuracy: true }
      )
      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [userPos])

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
            heading: latest.heading || null,
            last_updated: latest.timestamp
          })
        }
      }
      setCars(onlineDrivers)
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleCenterOnMe = () => {
    if (userPos && mapRef.current) {
      mapRef.current.flyTo(userPos, 16, { duration: 1 })
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <style>{`
        .smooth-marker {
          transition: transform 2s linear;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          70% { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>

      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        ref={mapRef}
      >
        <RecenterMap center={mapCenter} />
        
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {/* Draw User */}
        {userPos && (
          <Marker position={userPos} icon={userIcon} zIndexOffset={1000} />
        )}

        {/* Draw Drivers */}
        {cars.map(c => (
          <Marker 
            key={c.id} 
            position={[c.lat, c.lng]} 
            icon={createCarIcon(c.heading)} 
          />
        ))}
      </MapContainer>
      
      {/* Botão de Centralizar */}
      {userPos && (
        <button 
          onClick={handleCenterOnMe}
          style={{ 
            position: 'absolute', bottom: 40, right: 16, zIndex: 1000,
            width: 44, height: 44, borderRadius: '50%', background: 'white',
            border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#3B82F6' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      )}

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, background: 'linear-gradient(to top, #F9FAFB, transparent)', zIndex: 900, pointerEvents: 'none' }} />
    </div>
  )
}
