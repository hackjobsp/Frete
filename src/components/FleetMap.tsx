'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';

const COLATINA_CENTER = { lat: -19.5378, lng: -40.6201 };
const COLATINA_RADIUS_KM = 15;

interface Driver {
  id: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  status: string;
  nome: string;
  veiculo_tipo: string;
  rating: number;
}

interface FleetMapProps {
  filtroStatus?: string[];
}

export default function FleetMap({ filtroStatus = [] }: FleetMapProps) {
  const mapRef = useRef<L.Map>(null);
  const [drivers, setDrivers] = useState<Map<string, Driver>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({ total: 0, disponivel: 0, em_entrega: 0 });

  // Cores por status
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'disponivel': '#22C55E',     // Verde
      'em_coleta': '#EAB308',      // Amarelo
      'em_entrega': '#3B82F6',     // Azul
      'descanso': '#A78BFA'        // Roxo
    };
    return colors[status] || '#6B7280';
  };

  // Ícone com rotação e cor
  const createDriverIcon = (status: string, heading: number | null) => {
    const color = getStatusColor(status);
    const rotation = heading || 0;
    
    // Truck SVG com cor dinâmica no teto
    const svg = `
      <div style="transform: rotate(${rotation}deg); width: 32px; height: 64px; transform-origin: center center; position: relative;">
        <!-- Base de sombra -->
        <div style="position: absolute; bottom: -5px; left: 4px; width: 24px; height: 10px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(3px);"></div>
        <!-- Truck -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 128" style="width: 100%; height: 100%; position: relative; z-index: 2;">
          <rect x="8" y="32" width="48" height="88" rx="4" fill="#E5E7EB" stroke="#D1D5DB" stroke-width="2"/>
          <rect x="12" y="8" width="40" height="28" rx="6" fill="${color}" />
          <rect x="16" y="14" width="32" height="12" rx="2" fill="#FFFFFF" opacity="0.6"/>
        </svg>
      </div>
    `;

    return new L.DivIcon({
      className: 'smooth-marker',
      html: svg,
      iconSize: [32, 64],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  };

  useEffect(() => {
    const channel = supabase.channel('motoristas_ativos');

    channel.on('presence', { event: 'sync' }, () => {
      const newState = channel.presenceState();
      const onlineDrivers = new Map<string, Driver>();
      
      for (const id in newState) {
        const presences = newState[id] as any[];
        if (presences.length > 0) {
          const latest = presences[presences.length - 1];
          const status = latest.status || 'disponivel';
          
          if (filtroStatus.length === 0 || filtroStatus.includes(status)) {
            onlineDrivers.set(id, {
              id: id,
              latitude: latest.lat,
              longitude: latest.lng,
              heading: latest.heading || null,
              status: status,
              nome: latest.nome || 'Motorista',
              veiculo_tipo: latest.veiculo_tipo || 'Desconhecido',
              rating: latest.rating || 5.0
            });
          }
        }
      }
      setDrivers(onlineDrivers);
    });

    channel.subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filtroStatus]);

  useEffect(() => {
    // Atualizar stats
    setStats({
      total: drivers.size,
      disponivel: Array.from(drivers.values()).filter(d => d.status === 'disponivel').length,
      em_entrega: Array.from(drivers.values()).filter(d => d.status === 'em_entrega').length
    });
  }, [drivers]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <style>{`
        .smooth-marker {
          transition: transform 2s linear;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
      `}</style>

      {/* Stats Panel */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'white', borderRadius: 16, padding: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', minWidth: 280 }}>
        <p style={{ fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#111827' }}>
          🚚 Frota Online
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
          <div style={{ background: '#EFF6FF', padding: '0.5rem', borderRadius: 8 }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563EB' }}>{stats.total}</p>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#3B82F6' }}>Total</p>
          </div>
          <div style={{ background: '#F0FDF4', padding: '0.5rem', borderRadius: 8 }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16A34A' }}>{stats.disponivel}</p>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#22C55E' }}>Livres</p>
          </div>
          <div style={{ background: '#EFF6FF', padding: '0.5rem', borderRadius: 8 }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563EB' }}>{stats.em_entrega}</p>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#3B82F6' }}>Em Rota</p>
          </div>
        </div>
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: 600, color: isConnected ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#10B981' : '#EF4444' }} />
          {isConnected ? 'Realtime Ativo' : 'Desconectado'}
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[COLATINA_CENTER.lat, COLATINA_CENTER.lng]}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        // @ts-ignore
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap'
        />

        {/* Círculo de Colatina */}
        <Circle
          center={[COLATINA_CENTER.lat, COLATINA_CENTER.lng]}
          radius={COLATINA_RADIUS_KM * 1000}
          pathOptions={{
            color: '#3B82F6',
            weight: 2,
            opacity: 0.3,
            fill: true,
            fillOpacity: 0.03
          }}
        />

        {/* Drivers */}
        {Array.from(drivers.values()).map(driver => (
          <Marker
            key={driver.id}
            position={[driver.latitude, driver.longitude]}
            icon={createDriverIcon(driver.status, driver.heading)}
          >
            <Popup>
              <div style={{ padding: '0.25rem', minWidth: 150, color: '#111827' }}>
                <p style={{ fontWeight: 800, fontSize: '1rem', margin: '0 0 0.25rem 0' }}>{driver.nome}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#F59E0B', fontSize: '0.8rem' }}>⭐ {driver.rating.toFixed(1)}</span>
                  <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>• {driver.veiculo_tipo}</span>
                </div>
                <div style={{ 
                  display: 'inline-block', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: 12, 
                  background: getStatusColor(driver.status) + '20',
                  color: getStatusColor(driver.status),
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {driver.status === 'disponivel' ? 'Livre' : 'Em Entrega'}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legenda */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1000, background: 'white', borderRadius: 16, padding: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <p style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.75rem', color: '#111827' }}>Legenda</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22C55E' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563' }}>Disponível</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3B82F6' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563' }}>Em Entrega</span>
          </div>
        </div>
      </div>
    </div>
  );
}
