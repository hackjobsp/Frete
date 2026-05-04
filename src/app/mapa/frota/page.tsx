'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Importar componente do mapa
const FleetMap = dynamic(() => import('@/components/FleetMap'), {
  ssr: false,
  loading: () => <div className="spinner" style={{ margin: '100px auto' }} />
});

export default function FleetMapPage() {
  const [filtroStatus, setFiltroStatus] = useState(['disponivel', 'em_coleta', 'em_entrega']);

  const toggleStatus = (status: string) => {
    setFiltroStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', background: '#F3F4F6' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', background: '#F3F4F6', color: '#4B5563' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0 }}>🚚 Mapa de Frota</h1>
        </div>
        
        {/* Filtros */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { label: '✓ Disponível', status: 'disponivel', color: '#22C55E' },
            { label: '🚚 Em Entrega', status: 'em_entrega', color: '#3B82F6' },
          ].map(({ label, status, color }) => {
            const isActive = filtroStatus.includes(status);
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 16,
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: isActive ? `2px solid ${color}` : '2px solid transparent',
                  background: isActive ? `${color}15` : '#E5E7EB',
                  color: isActive ? color : '#6B7280'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mapa */}
      <div style={{ flex: 1, position: 'relative' }}>
        <FleetMap filtroStatus={filtroStatus} />
      </div>
    </div>
  );
}
