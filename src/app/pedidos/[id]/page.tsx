'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, MapPin, Clock, Truck, CheckCircle, Star, Send, DollarSign } from 'lucide-react'

type Pedido = {
  id: string
  cliente_id: string
  motorista_id: string | null
  origem: string
  destino: string
  tipo: string
  descricao: string
  status: string
  preco_estimado: number
  preco_final: number | null
  urgente: boolean
  distancia_km: number
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

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pendente:     { label: 'Aguardando motoristas', color: '#F59E0B', icon: '⏳' },
  aceito:       { label: 'Motorista confirmado', color: '#10B981', icon: '✅' },
  em_andamento: { label: 'Frete em andamento', color: '#3B82F6', icon: '🚛' },
  concluido:    { label: 'Frete concluído!', color: '#10B981', icon: '🎉' },
  cancelado:    { label: 'Cancelado', color: '#EF4444', icon: '❌' },
}

const tipoEmoji: Record<string, string> = { frete: '📦', mudanca: '🏠', entrega: '🛵' }

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
  const [showRating, setShowRating] = useState(false)
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [ratingDone, setRatingDone] = useState(false)

  useEffect(() => {
    loadData()

    // Real-time subscription for new proposals
    const channel = supabase
      .channel(`pedido_${params.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'propostas',
        filter: `pedido_id=eq.${params.id}`
      }, () => loadData())
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pedidos',
        filter: `id=eq.${params.id}`
      }, () => loadData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [params.id])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
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
    // Accept proposal and update pedido
    await supabase
      .from('propostas')
      .update({ status: 'aceita' })
      .eq('id', proposta.id)

    // Reject all other proposals
    await supabase
      .from('propostas')
      .update({ status: 'recusada' })
      .eq('pedido_id', params.id)
      .neq('id', proposta.id)

    // Update pedido
    await supabase
      .from('pedidos')
      .update({
        motorista_id: proposta.motorista_id,
        status: 'aceito',
        preco_final: proposta.preco
      })
      .eq('id', params.id)

    loadData()
  }

  async function cancelarPedido() {
    await supabase
      .from('pedidos')
      .update({ status: 'cancelado' })
      .eq('id', params.id)
    loadData()
  }

  async function enviarAvaliacao() {
    if (!pedido || nota === 0) return
    const avaliado_id = userRole === 'cliente' ? pedido.motorista_id : pedido.cliente_id

    await supabase.from('avaliacoes').insert({
      pedido_id: pedido.id,
      avaliador_id: userId,
      avaliado_id,
      nota,
      comentario: comentario || null
    })

    // Update rating in profile
    const { data: avgData } = await supabase
      .from('avaliacoes')
      .select('nota')
      .eq('avaliado_id', avaliado_id)

    if (avgData && avgData.length > 0) {
      const avg = avgData.reduce((sum, a) => sum + a.nota, 0) / avgData.length
      await supabase
        .from('profiles')
        .update({ rating: Math.round(avg * 10) / 10 })
        .eq('id', avaliado_id)
    }

    setRatingDone(true)
    setShowRating(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  if (!pedido) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '3rem' }}>🚫</p>
        <p>Pedido não encontrado</p>
        <Link href="/dashboard" className="btn-primary">Voltar ao início</Link>
      </div>
    )
  }

  const status = statusConfig[pedido.status]
  const isCliente = userId === pedido.cliente_id
  const isMotorista = userId === pedido.motorista_id

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cinza-bg)', paddingBottom: '2rem' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0D1B40, #162552)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href={userRole === 'motorista' ? '/motorista/dashboard' : '/dashboard'} style={{ color: 'white', display: 'flex' }}>
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 style={{ color: 'white', fontWeight: 700, fontSize: '1.05rem' }}>
            {tipoEmoji[pedido.tipo]} {pedido.tipo === 'frete' ? 'Frete' : pedido.tipo === 'mudanca' ? 'Mudança' : 'Entrega'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>
            #{pedido.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      <div style={{ padding: '1.25rem 1.5rem', maxWidth: 540, margin: '0 auto' }}>

        {/* Success banner for new orders */}
        {isNovo && (
          <div className="animate-fade-up" style={{
            background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981',
            borderRadius: 12, padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center'
          }}>
            <CheckCircle size={24} color="#10B981" />
            <div>
              <p style={{ fontWeight: 700, color: '#065F46' }}>Pedido publicado com sucesso! 🎉</p>
              <p style={{ fontSize: '0.82rem', color: '#047857' }}>
                Motoristas próximos a Colatina já podem ver seu pedido e fazer propostas.
              </p>
            </div>
          </div>
        )}

        {/* Status card */}
        <div className="card" style={{ marginBottom: '1rem', borderLeft: `4px solid ${status.color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem' }}>{status.icon}</span>
            <div>
              <p style={{ fontWeight: 700, color: status.color }}>{status.label}</p>
              <p style={{ color: 'var(--texto-muted)', fontSize: '0.82rem' }}>
                {new Date(pedido.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Route info */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>📍 Rota</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', marginTop: 4, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--texto-muted)' }}>ORIGEM</p>
                <p style={{ fontWeight: 600 }}>{pedido.origem}</p>
              </div>
            </div>
            <div style={{ width: 2, height: 16, background: 'var(--borda)', marginLeft: 4 }} />
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B00', marginTop: 4, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--texto-muted)' }}>DESTINO</p>
                <p style={{ fontWeight: 600 }}>{pedido.destino}</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--borda)' }}>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--texto-muted)' }}>DISTÂNCIA</p>
              <p style={{ fontWeight: 700 }}>{pedido.distancia_km} km</p>
            </div>
            <div>
              <p style={{ fontSize: '0.72rem', color: 'var(--texto-muted)' }}>ESTIMATIVA</p>
              <p style={{ fontWeight: 700, color: '#FF6B00' }}>R$ {pedido.preco_estimado.toFixed(2)}</p>
            </div>
            {pedido.preco_final && (
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--texto-muted)' }}>PREÇO FINAL</p>
                <p style={{ fontWeight: 700, color: '#10B981' }}>R$ {pedido.preco_final.toFixed(2)}</p>
              </div>
            )}
            {pedido.urgente && <span className="badge badge-urgente">⚡ Urgente</span>}
          </div>
        </div>

        {/* Description */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>📝 Descrição da carga</h3>
          <p style={{ color: 'var(--texto-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{pedido.descricao}</p>
        </div>

        {/* Proposals (only for client when pending/accepted) */}
        {isCliente && pedido.status === 'pendente' && (
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>
              💬 Propostas recebidas ({propostas.length})
            </h3>

            {propostas.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Aguardando propostas</p>
                <p style={{ color: 'var(--texto-muted)', fontSize: '0.85rem' }}>
                  Motoristas próximos em Colatina serão notificados. Normalmente menos de 5 minutos.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {propostas.map((p, i) => (
                  <div key={p.id} className="card" style={{
                    border: i === 0 ? '2px solid #10B981' : '1px solid var(--borda)',
                    position: 'relative'
                  }}>
                    {i === 0 && (
                      <div style={{
                        position: 'absolute', top: -10, left: '1rem',
                        background: '#10B981', color: 'white',
                        fontSize: '0.7rem', fontWeight: 700,
                        padding: '0.1rem 0.6rem', borderRadius: 10
                      }}>
                        MELHOR PREÇO
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div>
                        <p style={{ fontWeight: 700 }}>{p.profiles?.full_name}</p>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <span style={{ color: '#FCD34D' }}>{'★'.repeat(Math.round(p.profiles?.rating || 0))}</span>
                          <span style={{ color: 'var(--texto-muted)', fontSize: '0.78rem' }}>
                            {p.profiles?.rating?.toFixed(1) || '—'} • {p.profiles?.total_fretes || 0} fretes
                          </span>
                        </div>
                      </div>
                      <p style={{ color: '#FF6B00', fontWeight: 900, fontSize: '1.3rem' }}>
                        R$ {p.preco.toFixed(2)}
                      </p>
                    </div>
                    {p.mensagem && (
                      <p style={{ color: 'var(--texto-muted)', fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                        "{p.mensagem}"
                      </p>
                    )}
                    <button
                      onClick={() => aceitarProposta(p)}
                      className="btn-primary"
                      style={{ width: '100%', fontSize: '0.9rem', padding: '0.7rem' }}
                    >
                      ✓ Aceitar esta proposta — R$ {p.preco.toFixed(2)}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rating section */}
        {pedido.status === 'concluido' && !ratingDone && (isCliente || isMotorista) && (
          <div className="card" style={{ marginBottom: '1rem', border: '2px solid #FCD34D' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>⭐ Avalie o serviço</h3>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setNota(n)}
                  style={{
                    fontSize: '2rem', background: 'none', border: 'none', cursor: 'pointer',
                    filter: n <= nota ? 'brightness(1)' : 'brightness(0.4)',
                    transition: 'filter 0.2s'
                  }}>
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="input"
              placeholder="Deixe um comentário (opcional)"
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              rows={2}
              style={{ marginBottom: '0.75rem', fontFamily: 'inherit', resize: 'none' }}
            />
            <button
              onClick={enviarAvaliacao}
              className="btn-primary"
              style={{ width: '100%' }}
              disabled={nota === 0}
            >
              Enviar avaliação
            </button>
          </div>
        )}

        {ratingDone && (
          <div className="card" style={{ marginBottom: '1rem', textAlign: 'center', background: 'rgba(16,185,129,0.05)', border: '1px solid #10B981' }}>
            <CheckCircle size={32} color="#10B981" style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontWeight: 700, color: '#065F46' }}>Avaliação enviada! Obrigado 🎉</p>
          </div>
        )}

        {/* Cancel button for client */}
        {isCliente && pedido.status === 'pendente' && (
          <button
            onClick={cancelarPedido}
            style={{
              width: '100%', padding: '0.85rem', borderRadius: 12,
              border: '2px solid var(--erro)', background: 'rgba(239,68,68,0.05)',
              color: 'var(--erro)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
            }}
          >
            Cancelar pedido
          </button>
        )}

        {/* Back button */}
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Link
            href={userRole === 'motorista' ? '/motorista/dashboard' : '/dashboard'}
            style={{ color: 'var(--texto-muted)', fontSize: '0.85rem', textDecoration: 'none' }}
          >
            ← Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  )
}
