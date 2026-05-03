'use client'

import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export default function DashboardMap() {
  const colatinaCenter: [number, number] = [-19.5339, -40.6274]

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
      <MapContainer
        center={colatinaCenter}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        dragging={true}
        touchZoom={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" // Light theme map for Uber look
        />
        <ZoomControl position="bottomright" />
      </MapContainer>
      
      {/* Overlay gradient for better text readability */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        background: 'linear-gradient(to top, var(--cinza-bg) 0%, rgba(245,246,250,0) 100%)',
        zIndex: 1,
        pointerEvents: 'none'
      }} />
    </div>
  )
}
