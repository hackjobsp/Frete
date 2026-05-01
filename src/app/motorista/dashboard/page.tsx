'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Truck, MapPin, Clock, DollarSign, CheckCircle, X, LogOut, Bell, Star } from 'lucide-react'

type Pedido = {
  id: string
  cliente_id: string
  origem: string
  destino: string
  tipo: string
  descricao: string
  status: string
  preco_estimado: number
  urgente: boolean
  distancia_km: number
  created_at: string
  profiles?: { full_name: string; rating: number }
}

type Profile = {
  full_name: string
  rating: number
  total_fretes: number
}

const tipoEmoji: Record<string, string> = { frete: '📦', mudanca: '🏠', entrega: '🛵' }
const tipoLabel: Record<string, string> = { frete: 'Frete', mudanca: 'Mudança', entrega: 'Entrega' }

export default function MotoristaDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pedidosDisponiveis, setPedidosDisponiveis] = useState<Pedido[]>([])
  const [meusFretes, setMeusFretes] = useState<Pedido[]>([])
  const [activeTab, setActiveTab] = useState<'disponivel' | 'meus'>('disponivel')
  const [loading, setLoading] = useState(true)
  const [aceitando, setAceitando] = useState<string | null>(null)

  useEffect(() => {
    loadData()

    // Real-time: listen for new pedidos
    const channel = supabase
      .channel('pedidos_novos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, (payload) => {
        setPedidosDisponiveis(prev => [payload.new as Pedido, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, rating, total_fretes')
      .eq('id', user.id)
      .single()

    setProfile(profileData)

    // Available orders (pendente, not owned by driver)
    const { data: available } = await supabase
      .from('pedidos')
      .select('*, profiles:cliente_id(full_name, rating)')
      .eq('status', 'pendente')
      .neq('cliente_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setPedidosDisponiveis(available || [])

    // Driver's own active fretes
    const { data: meus } = await supabase
      .from('pedidos')
      .select('*')
      .eq('motorista_id', user.id)
      .in('status', ['aceito', 'em_andamento', 'concluido'])
      .order('created_at', { ascending: false })
      .limit(10)

    setMeusFretes(meus || [])
    setLoading(false)
  }

  async function aceitarPedido(pedidoId: string) {
    setAceitando(pedidoId)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('pedidos')
      .update({ motorista_id: user!.id, status: 'aceito' })
      .eq('id', pedidoId)
      .eq('status', 'pendente')

    if (!error) {
      setPedidosDisponiveis(prev => prev.filter(p => p.id !== pedidoId))
      await loadData()
    }
    setAceitando(null)
  }

  async function atualizarStatus(pedidoId: string, novoStatus: 'em_andamento' | 'concluido') {
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', pedidoId)
    await loadData()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cinza-bg)', paddingBottom: '5rem' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0D1B40, #162552)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <Truck size={16} color="#FF6B00" />
              <span style={{ color: '#FF6B00', fontWeight: 800, fontSize: '0.9rem' }}>FreteJá — Motorista</span>
            </div>
            <h1 style={{ color: 'white', fontWeight: 700, fontSize: '1.3rem' }}>
              Olá, {profile?.full_name?.split(' ')[0]}! 🚛
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              <Star size={13} color="#FCD34D" fill="#FCD34D" />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
                {profile?.rating || '—'} • {profile?.total_fretes || 0} fretes
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: '0.6rem', cursor: 'pointer', color: 'white' }}>
              <Bell size={18} />
            </button>
            <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: '0.6rem', cursor: 'pointer', color: 'white' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1.25rem' }}>
          {[
            { label: 'Disponíveis', value: pedidosDisponiveis.length, color: '#FF8C38' },
            { label: 'Em andamento', value: meusFretes.filter(f => f.status === 'em_andamento').length, color: '#60A5FA' },
            { label: 'Concluídos', value: meusFretes.filter(f => f.status === 'concluido').length, color: '#10B981' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ color: s.color, fontWeight: 800, fontSize: '1.3rem' }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', padding: '0 1.5rem', borderBottom: '1px solid var(--borda)', display: 'flex', gap: '0' }}>
        {(['disponivel', 'meus'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '1rem 1.5rem', background: 'none', border: 'none',
              borderBottom: `3px solid ${activeTab === tab ? 'var(--laranja)' : 'transparent'}`,
              color: activeTab === tab ? 'var(--laranja)' : 'var(--texto-muted)',
              fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
            }}>
            {tab === 'disponivel' ? `🔍 Disponíveis (${pedidosDisponiveis.length})` : `📋 Meus Fretes (${meusFretes.length})`}
          </button>
        ))}
      </div>

      <div style={{ padding: '1.25rem 1.5rem' }}>

        {/* Available orders */}
        {activeTab === 'disponivel' && (
          <div>
            {pedidosDisponiveis.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Nenhum pedido disponível</p>
                <p style={{ color: 'var(--texto-muted)', fontSize: '0.875rem' }}>
                  Novos pedidos aparecem aqui em tempo real assim que clientes publicam.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {pedidosDisponiveis.map(p => (
                  <div key={p.id} className="card" style={{ borderLeft: p.urgente ? '4px solid #FF6B00' : '4px solid transparent' }}>
                    {/* Top */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.4rem' }}>{tipoEmoji[p.tipo]}</span>
                        <span style={{ fontWeight: 700 }}>{tipoLabel[p.tipo]}</span>
                        {p.urgente && <span className="badge badge-urgente">⚡ Urgente</span>}
                      </div>
                      <span style={{ color: '#FF6B00', fontWeight: 800, fontSize: '1.1rem' }}>
                        R$ {p.preco_estimado.toFixed(2)}
                      </span>
                    </div>

                    {/* Route */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', marginTop: 5, flexShrink: 0 }} />
                        <p style={{ fontSize: '0.85rem', color: 'var(--texto)' }}>{p.origem}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6B00', marginTop: 5, flexShrink: 0 }} />
                        <p style={{ fontSize: '0.85rem', color: 'var(--texto)' }}>{p.destino}</p>
                      </div>
                    </div>

                    {/* Meta */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--texto-muted)', fontSize: '0.8rem' }}>
                        <MapPin size={13} /> {p.distancia_km}km
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--texto-muted)', fontSize: '0.8rem' }}>
                        <Clock size={13} /> {new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--texto-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
                      {p.descricao}
                    </p>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => aceitarPedido(p.id)}
                        disabled={aceitando === p.id}
                        className="btn-primary"
                        style={{ flex: 1, fontSize: '0.9rem', padding: '0.7rem' }}
                      >
                        {aceitando === p.id ? <div className="spinner" style={{ width: 18, height: 18 }} /> : '✓ Aceitar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My freight */}
        {activeTab === 'meus' && (
          <div>
            {meusFretes.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚛</div>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Nenhum frete ainda</p>
                <p style={{ color: 'var(--texto-muted)', fontSize: '0.875rem' }}>
                  Aceite um pedido na aba "Disponíveis" para começar a ganhar.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {meusFretes.map(f => (
                  <div key={f.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span>{tipoEmoji[f.tipo]}</span>
                        <span style={{ fontWeight: 700 }}>{tipoLabel[f.tipo]}</span>
                      </div>
                      <span className={`badge ${f.status === 'concluido' ? 'badge-concluido' : f.status === 'em_andamento' ? 'badge-em_andamento' : 'badge-aceito'}`}>
                        {f.status === 'concluido' ? '✓ Concluído' : f.status === 'em_andamento' ? '🚛 Em andamento' : '✓ Aceito'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                      <strong>De:</strong> {f.origem}
                    </p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                      <strong>Para:</strong> {f.destino}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#FF6B00', fontWeight: 800 }}>R$ {f.preco_estimado.toFixed(2)}</span>
                      {f.status === 'aceito' && (
                        <button onClick={() => atualizarStatus(f.id, 'em_andamento')} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                          Iniciar frete
                        </button>
                      )}
                      {f.status === 'em_andamento' && (
                        <button onClick={() => atualizarStatus(f.id, 'concluido')} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                          Marcar concluído
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {[
          { href: '/motorista/dashboard', icon: '🏠', label: 'Início', active: true },
          { href: '/motorista/ganhos', icon: '💰', label: 'Ganhos' },
          { href: '/perfil', icon: '👤', label: 'Perfil' },
        ].map((item, i) => (
          <Link key={i} href={item.href} className={`bottom-nav-item ${item.active ? 'active' : ''}`}>
            <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
