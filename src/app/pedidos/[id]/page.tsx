'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, MapPin, Clock, Truck, CheckCircle, Star, Send, DollarSign, Phone, MessageSquare, Navigation, MoreVertical } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic Map for the top section
const OrderMap = dynamic(() => import('@/components/TrackingMapClient'), { 
  ssr: false,
  loading: () => <div style={{ height: 250, background: '#eee' }} />
})

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
  tipo: string
  descricao: string
  status: string
  preco_estimado: number
  preco_final: number | null
  urgente: boolean
  distancia_km: number
  foto_url: string | null
  created_at: string
  agendado_para: string | null
  profiles?: { full_name: string; rating: number; phone: string }
}

type Proposta = {
  id: string
  motorista_id: string
  preco: number
  mensagem: string
  status: string
  created_at: string
  profiles?: { full_name: string; rating: number; total_fretes: number }
}

const statusConfig: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  pendente:     { label: 'Procurando motorista...', color: '#F59E0B', icon: '⏳', bg: '#FFFBEB' },
  aceito:       { label: 'Motorista a caminho', color: '#10B981', icon: '🏃', bg: '#F0FDF4' },
  em_andamento: { label: 'Frete em curso', color: '#3B82F6', icon: '🚚', bg: '#EFF6FF' },
  concluido:    { label: 'Chegou ao destino', color: '#10B981', icon: '✅', bg: '#F0FDF4' },
  cancelado:    { label: 'Cancelado', color: '#EF4444', icon: '❌', bg: '#FEF2F2' },
}

export default function PedidoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNovo = searchParams.get('novo') === 'true'

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [ratingDone, setRatingDone] = useState(false)

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel(`pedido_${params.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'propostas', filter: `pedido_id=eq.${params.id}` }, () => loadData())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${params.id}` }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [params.id])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    setUserRole(profile?.role || '')

    const { data: pedidoData } = await supabase
      .from('pedidos')
      .select('*, profiles:cliente_id(full_name, rating, phone)')
      .eq('id', params.id)
      .single()
    setPedido(pedidoData)

    const { data: propostasData } = await supabase
      .from('propostas')
      .select('*, profiles:motorista_id(full_name, rating, total_fretes)')
      .eq('pedido_id', params.id)
      .order('preco', { ascending: true })
    setPropostas(propostasData || [])
    setLoading(false)
  }

  async function aceitarProposta(proposta: Proposta) {
    await supabase.from('propostas').update({ status: 'aceita' }).eq('id', proposta.id)
    await supabase.from('propostas').update({ status: 'recusada' }).eq('pedido_id', params.id).neq('id', proposta.id)
    await supabase.from('pedidos').update({ motorista_id: proposta.motorista_id, status: 'aceito', preco_final: proposta.preco }).eq('id', params.id)
    loadData()
  }

  if (loading) return <div className="spinner" style={{ margin: '100px auto' }} />
  if (!pedido) return <div style={{ padding: '2rem', textAlign: 'center' }}>Pedido não encontrado.</div>

  const status = statusConfig[pedido.status] || statusConfig.pendente
  const isCliente = userId === pedido.cliente_id
  const isMotorista = userId === pedido.motorista_id

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      
      {/* Map Section (Top half) */}
      <div style={{ height: '40vh', position: 'relative' }}>
        <OrderMap 
          pedidoId={pedido.id} 
          pedidoStatus={pedido.status} 
          isMotorista={isMotorista}
          origem={{ lat: pedido.origem_lat, lng: pedido.origem_lng }}
          destino={{ lat: pedido.destino_lat, lng: pedido.destino_lng }}
        />
        
        {/* Back Button Overlay */}
        <button 
          onClick={() => router.back()}
          style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', zIndex: 100, background: 'white', border: 'none', borderRadius: '50%', width: 44, height: 44, boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={22} />
        </button>
      </div>

      {/* Details Section (Bottom half) */}
      <div style={{ 
        background: 'white', minHeight: '60vh', marginTop: '-20px', 
        borderRadius: '24px 24px 0 0', position: 'relative', zIndex: 10,
        boxShadow: '0 -10px 30px rgba(0,0,0,0.05)', padding: '1.5rem'
      }}>
        
        {/* Status Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: status.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            {status.icon}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.15rem', color: status.color }}>{status.label}</h2>
            <p style={{ color: 'var(--texto-muted)', fontSize: '0.85rem' }}>{new Date(pedido.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {pedido.distancia_km} km</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--texto)' }}>R$ {(pedido.preco_final || pedido.preco_estimado).toFixed(2)}</p>
          </div>
        </div>

        {/* Route Row */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: '#F9FAFB', padding: '1rem', borderRadius: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--texto-muted)', fontWeight: 700 }}>DE</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--texto)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pedido.origem}</p>
          </div>
          <div style={{ width: 1, background: '#E5E7EB' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--texto-muted)', fontWeight: 700 }}>PARA</p>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--texto)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pedido.destino}</p>
          </div>
        </div>

        {/* Driver Card / Proposals Section */}
        {pedido.status === 'pendente' && isCliente ? (
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1rem' }}>Ofertas disponíveis ({propostas.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {propostas.map(p => (
                <div key={p.id} className="card animate-fade-up" style={{ padding: '1rem', border: '1px solid #eee' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{p.profiles?.full_name?.charAt(0)}</div>
                      <div>
                        <p style={{ fontWeight: 700 }}>{p.profiles?.full_name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--texto-muted)' }}>⭐ {p.profiles?.rating?.toFixed(1)} • {p.profiles?.total_fretes} fretes</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 900, color: 'var(--laranja)', fontSize: '1.2rem' }}>R$ {p.preco.toFixed(2)}</p>
                      <button onClick={() => aceitarProposta(p)} style={{ background: 'var(--texto)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.3rem' }}>ACEITAR</button>
                    </div>
                  </div>
                </div>
              ))}
              {propostas.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', background: '#F9FAFB', borderRadius: 20 }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ fontWeight: 600 }}>Procurando motoristas...</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--texto-muted)' }}>Isso pode levar alguns minutos em Colatina.</p>
                </div>
              )}
            </div>
          </div>
        ) : (pedido.status !== 'pendente' && (isCliente || isMotorista)) ? (
           /* Driver Info */
           <div style={{ background: '#F3F4F6', borderRadius: 24, padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                   <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'white', border: '3px solid white', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${pedido.motorista_id}`} alt="Driver" />
                   </div>
                   <div>
                      <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{isCliente ? (propostas.find(p => p.motorista_id === pedido.motorista_id)?.profiles?.full_name || 'Seu Motorista') : pedido.profiles?.full_name}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--texto-muted)' }}>{isCliente ? 'Van Branca • ABC-1234' : 'Cliente Verificado'}</p>
                   </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <p style={{ fontWeight: 900, fontSize: '1.1rem' }}>⭐ 4.9</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <Link href={`/pedidos/${pedido.id}/chat`} style={{ flex: 1, textDecoration: 'none' }}>
                  <button style={{ width: '100%', height: '3.5rem', background: 'white', border: 'none', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 800, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <MessageSquare size={20} color="var(--laranja)" /> CHAT
                  </button>
                </Link>
                <a href={`tel:${isCliente ? (propostas.find(p => p.motorista_id === pedido.motorista_id)?.profiles?.phone || '') : pedido.profiles?.phone || ''}`} style={{ flex: 1, textDecoration: 'none' }}>
                  <button style={{ width: '100%', height: '3.5rem', background: 'white', border: 'none', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 800, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <Phone size={20} color="var(--sucesso)" /> LIGAR
                  </button>
                </a>
              </div>
           </div>
        ) : null}

        {/* Info Card */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.75rem' }}>Informações do Frete</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--texto-muted)', lineHeight: 1.6 }}>{pedido.descricao}</p>
          {pedido.foto_url && (
            <img src={pedido.foto_url} alt="Carga" style={{ width: '100%', borderRadius: 16, marginTop: '1rem' }} />
          )}
        </div>

        {/* Final Actions */}
        {pedido.status === 'pendente' && isCliente && (
          <button 
            onClick={() => {/* Cancel logic */}}
            style={{ width: '100%', marginTop: '2rem', padding: '1rem', background: 'white', color: 'var(--erro)', border: 'none', fontWeight: 700, fontSize: '0.9rem' }}
          >
            CANCELAR PEDIDO
          </button>
        )}
      </div>
    </div>
  )
}
