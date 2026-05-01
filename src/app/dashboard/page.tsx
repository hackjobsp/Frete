'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Truck, Plus, MapPin, Clock, Package, Star, LogOut, ChevronRight, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Pedido = {
  id: string
  origem: string
  destino: string
  tipo: string
  status: string
  preco_estimado: number
  urgente: boolean
  distancia_km: number
  created_at: string
}

type Profile = {
  full_name: string
  role: string
  rating: number
  total_fretes: number
}

const statusLabel: Record<string, { label: string; cls: string }> = {
  pendente:     { label: 'Aguardando', cls: 'badge-pendente' },
  aceito:       { label: 'Aceito', cls: 'badge-aceito' },
  em_andamento: { label: 'Em andamento', cls: 'badge-em_andamento' },
  concluido:    { label: 'Concluído', cls: 'badge-concluido' },
  cancelado:    { label: 'Cancelado', cls: 'badge-cancelado' },
}

const tipoIcon: Record<string, string> = {
  frete: '📦', mudanca: '🏠', entrega: '🛵'
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, role, rating, total_fretes')
      .eq('id', user.id)
      .single()

    if (profileData?.role === 'motorista') {
      router.push('/motorista/dashboard')
      return
    }

    setProfile(profileData)

    const { data: pedidosData } = await supabase
      .from('pedidos')
      .select('*')
      .eq('cliente_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    setPedidos(pedidosData || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cinza-bg)' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  const pedidosAtivos = pedidos.filter(p => ['pendente', 'aceito', 'em_andamento'].includes(p.status))
  const pedidosConcluidos = pedidos.filter(p => p.status === 'concluido')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cinza-bg)', paddingBottom: '5rem' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0D1B40, #162552)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Truck size={18} color="#FF6B00" />
              <span style={{ color: '#FF6B00', fontWeight: 800, fontSize: '1rem' }}>FreteJá</span>
            </div>
            <h1 style={{ color: 'white', fontWeight: 700, fontSize: '1.4rem' }}>
              Olá, {profile?.full_name?.split(' ')[0]}! 👋
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Colatina-ES
            </p>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '1.5rem' }}>
          {[
            { label: 'Fretes feitos', value: profile?.total_fretes || 0 },
            { label: 'Em andamento', value: pedidosAtivos.length },
            { label: 'Avaliação', value: profile?.rating ? `${profile.rating}⭐` : 'Nova' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.08)', borderRadius: 12,
              padding: '0.75rem', textAlign: 'center'
            }}>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem' }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem' }}>

        {/* New freight CTA */}
        <Link href="/pedidos/novo" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, #FF6B00, #FF8C38)',
            borderRadius: 16, padding: '1.25rem 1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 20px rgba(255,107,0,0.35)'
          }}>
            <div>
              <p style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>
                Pedir novo frete
              </p>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem' }}>
                Motoristas disponíveis agora em Colatina
              </p>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Plus size={24} color="white" />
            </div>
          </div>
        </Link>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { icon: '📦', label: 'Frete', href: '/pedidos/novo?tipo=frete' },
            { icon: '🏠', label: 'Mudança', href: '/pedidos/novo?tipo=mudanca' },
            { icon: '🛵', label: 'Entrega', href: '/pedidos/novo?tipo=entrega' },
          ].map((a, i) => (
            <Link key={i} href={a.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.3rem' }}>{a.icon}</div>
                <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--texto)' }}>{a.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Active orders */}
        {pedidosAtivos.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.75rem' }}>
              🔔 Pedidos ativos ({pedidosAtivos.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pedidosAtivos.map(p => (
                <Link key={p.id} href={`/pedidos/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: 'rgba(255,107,0,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', flexShrink: 0
                    }}>
                      {tipoIcon[p.tipo] || '📦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span className={`badge ${statusLabel[p.status]?.cls}`}>
                          {statusLabel[p.status]?.label}
                        </span>
                        {p.urgente && <span className="badge badge-urgente">⚡ Urgente</span>}
                      </div>
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.origem}
                      </p>
                      <p style={{ color: 'var(--texto-muted)', fontSize: '0.8rem' }}>
                        → {p.destino}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ color: '#FF6B00', fontWeight: 800 }}>R$ {p.preco_estimado.toFixed(2)}</p>
                      <p style={{ color: 'var(--texto-muted)', fontSize: '0.75rem' }}>{p.distancia_km}km</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Histórico</h2>
            <Link href="/pedidos" style={{ color: 'var(--laranja)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
              Ver todos
            </Link>
          </div>

          {pedidosConcluidos.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚛</div>
              <p style={{ color: 'var(--texto-muted)', fontSize: '0.9rem' }}>
                Seu histórico aparecerá aqui depois do primeiro frete.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {pedidosConcluidos.slice(0, 3).map(p => (
                <div key={p.id} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', opacity: 0.8 }}>
                  <span style={{ fontSize: '1.4rem' }}>{tipoIcon[p.tipo]}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.origem} → {p.destino}</p>
                    <p style={{ color: 'var(--texto-muted)', fontSize: '0.78rem' }}>
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#10B981', fontWeight: 700, fontSize: '0.9rem' }}>R$ {(p.preco_final || p.preco_estimado).toFixed(2)}</p>
                    <span className="badge badge-concluido">✓ Concluído</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {[
          { href: '/dashboard', icon: '🏠', label: 'Início', active: true },
          { href: '/pedidos/novo', icon: '➕', label: 'Novo Frete' },
          { href: '/pedidos', icon: '📋', label: 'Meus Fretes' },
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
