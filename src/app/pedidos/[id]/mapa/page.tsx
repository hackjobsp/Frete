'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TrackingMap from '@/components/TrackingMap'
import { ArrowLeft, CheckCircle, Navigation, Loader2 } from 'lucide-react'

type Pedido = {
  id: string
  cliente_id: string
  motorista_id: string | null
  origem: string
  destino: string
  origem_lat: number
  origem_lng: number
  destino_lat: number
  destino_lng: number
  status: string
}

export default function MapaPedidoPage() {
  const params = useParams()
  const router = useRouter()
  
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapConnected, setMapConnected] = useState(false)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      
      setUserId(user.id)

      const { data } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', params.id)
        .single()
        
      setPedido(data)
      setLoading(false)
    }
    loadData()
  }, [params.id, router])

  async function atualizarStatus(novoStatus: 'concluido') {
    if (!pedido || !userId) return
    
    await supabase
      .from('pedidos')
      .update({ status: novoStatus })
      .eq('id', pedido.id)
      
    router.push(`/pedidos/${pedido.id}`)
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <Loader2 size={40} className="animate-spin" color="#FF6B00" />
      </div>
    )
  }

  if (!pedido) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <h2>Pedido não encontrado</h2>
        <button onClick={() => router.back()} className="btn-primary" style={{ marginTop: '1rem' }}>Voltar</button>
      </div>
    )
  }

  const isMotorista = userId === pedido.motorista_id
  const isCliente = userId === pedido.cliente_id

  if (!isMotorista && !isCliente) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <h2>Acesso Negado</h2>
        <p style={{ color: 'var(--texto-muted)', marginTop: '0.5rem' }}>Você não tem permissão para visualizar este mapa.</p>
        <button onClick={() => router.push('/dashboard')} className="btn-primary" style={{ marginTop: '1rem' }}>Voltar ao Início</button>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      
      {/* Header Overlay */}
      <div style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, 
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)',
        padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem'
      }}>
        <button 
          onClick={() => router.back()}
          style={{ 
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
            border: 'none', borderRadius: '50%', width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'white'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {isMotorista ? 'Navegação' : 'Acompanhamento'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            {mapConnected ? 'Conexão ativa em tempo real' : 'Conectando ao satélite...'}
          </p>
        </div>
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <TrackingMap
          pedidoId={pedido.id}
          pedidoStatus={pedido.status}
          isMotorista={isMotorista}
          origem={{ lat: pedido.origem_lat, lng: pedido.origem_lng }}
          destino={{ lat: pedido.destino_lat, lng: pedido.destino_lng }}
          onConnectionChange={setMapConnected}
        />
      </div>

      {/* Bottom Panel */}
      <div style={{ 
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '1.5rem', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
      }}>
        
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ 
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: pedido.status === 'em_andamento' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: pedido.status === 'em_andamento' ? '#3B82F6' : '#10B981'
          }}>
            <Navigation size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.2rem' }}>
              {pedido.status === 'em_andamento' ? 'Viagem em Andamento' : 'Motorista a Caminho'}
            </h3>
            <p style={{ color: 'var(--texto-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>
              {isMotorista 
                ? 'Sua localização está sendo transmitida para o cliente em tempo real.'
                : 'Você está acompanhando a localização do motorista em tempo real.'
              }
            </p>
          </div>
        </div>

        {isMotorista && pedido.status === 'em_andamento' && (
          <button
            onClick={() => atualizarStatus('concluido')}
            className="btn-primary"
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, #10B981, #059669)', 
              boxShadow: '0 4px 15px rgba(16,185,129,0.35)',
              display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center'
            }}
          >
            <CheckCircle size={20} />
            Finalizar Frete (Cheguei)
          </button>
        )}
      </div>

    </div>
  )
}
