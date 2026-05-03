'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Truck, Search, MapPin, Clock, Package, Star, LogOut, ChevronRight, Bell, Plus, MessageSquare, PlusCircle, User, Home, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const AmbientMap = dynamic(() => import('@/components/AmbientMap'), { 
  ssr: false, 
  loading: () => <div style={{height: '100%', background: '#F3F4F6'}}/> 
})

type Pedido = {
  id: string
  origem: string
  destino: string
  tipo: string
  status: string
  preco_estimado: number
  preco_final: number | null
  urgente: boolean
  distancia_km: number
  created_at: string
}

type Profile = {
  full_name: string
  role: string
  rating: number
  total_fretes: number
  onboarding_completo: boolean
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

const tipoLabel: Record<string, string> = {
  frete: 'Frete', mudanca: 'Mudança', entrega: 'Entrega'
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('cliente_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        loadData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, role, rating, total_fretes, onboarding_completo')
      .eq('id', user.id)
      .single()

    if (profileData && !profileData.onboarding_completo) {
      router.push('/onboarding')
      return
    }

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
      .limit(5)

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

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', paddingBottom: '7rem' }}>
      
      {/* Premium Header */}
      <div style={{ 
        background: 'var(--laranja)', 
        padding: '2.5rem 1.5rem 2rem', 
        borderBottomLeftRadius: 32, 
        borderBottomRightRadius: 32,
        boxShadow: '0 4px 20px rgba(217, 119, 6, 0.15)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.3)', overflow: 'hidden' }}>
            <User size={24} color="var(--laranja)" />
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: 600 }}>Boa viagem,</p>
            <h1 style={{ fontWeight: 800, fontSize: '1.4rem', color: 'white', lineHeight: 1.1 }}>
              {profile?.full_name?.split(' ')[0]}!
            </h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(5px)' }}>
            <Bell size={20} color="white" />
          </button>
        </div>
      </div>

      <div style={{ padding: '0 1.5rem', marginTop: '-1.5rem' }}>
        
        {/* Active Order Banner (If any) */}
        {pedidosAtivos.length > 0 && (
          <Link href={`/pedidos/${pedidosAtivos[0].id}`} style={{ textDecoration: 'none' }}>
            <div className="animate-fade-up" style={{ 
              padding: '1rem', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: 20,
              background: 'linear-gradient(to right, #FFFBEB, #FEF3C7)',
              display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem',
              boxShadow: '0 4px 15px rgba(217, 119, 6, 0.08)'
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--laranja)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', boxShadow: '0 4px 10px rgba(217,119,6,0.3)' }}>
                {tipoIcon[pedidosAtivos[0].tipo]}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, color: '#B45309', fontSize: '0.75rem', letterSpacing: '0.5px' }}>EM ANDAMENTO</p>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--texto)' }}>Acompanhar frete</p>
              </div>
              <ChevronRight size={24} color="#D97706" />
            </div>
          </Link>
        )}

        {/* Ambient Map - Moving Cars */}
        <div className="animate-fade-up" style={{ 
          height: 180, marginBottom: '1.5rem', borderRadius: 24, 
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.02)', marginTop: pedidosAtivos.length > 0 ? '0' : '2rem'
        }}>
           <AmbientMap />
           <div style={{ 
             position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.9)', 
             padding: '6px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, 
             color: 'var(--texto)', zIndex: 1000, backdropFilter: 'blur(4px)', 
             display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
           }}>
             <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
             Veículos na região
           </div>
        </div>

        {/* Services - Premium Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
          <Link href="/pedidos/novo?tipo=frete" style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: 'white', borderRadius: 24, 
              padding: '1.5rem 1rem', textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.02)',
              transition: 'transform 0.2s ease', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ width: 64, height: 64, background: 'rgba(255, 193, 7, 0.1)', borderRadius: '50%', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                📦
              </div>
              <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--texto)' }}>Frete</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--texto-muted)', marginTop: '0.3rem', lineHeight: 1.4, fontWeight: 500 }}>Enviar objetos e encomendas rápidas</p>
            </div>
          </Link>
          
          <Link href="/pedidos/novo?tipo=mudanca" style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: 'white', borderRadius: 24, 
              padding: '1.5rem 1rem', textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.02)',
              transition: 'transform 0.2s ease'
            }}>
              <div style={{ width: 64, height: 64, background: 'rgba(255, 193, 7, 0.1)', borderRadius: '50%', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                🏠
              </div>
              <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--texto)' }}>Mudança</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--texto-muted)', marginTop: '0.3rem', lineHeight: 1.4, fontWeight: 500 }}>Transportar móveis e grandes volumes</p>
            </div>
          </Link>
        </div>

        {/* Recent Trips Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--texto)' }}>Viagens recentes</h3>
          <Link href="/pedidos" style={{ fontSize: '0.85rem', color: 'var(--texto-muted)', fontWeight: 600, textDecoration: 'none' }}>Ver todas</Link>
        </div>

        {/* Recent Trips List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {pedidos.slice(0, 3).map((p) => (
            <div key={p.id} onClick={() => router.push(`/pedidos/${p.id}`)} style={{ 
              background: 'white', border: '1px solid var(--borda)', borderRadius: 16, 
              padding: '1rem', cursor: 'pointer',
              display: 'flex', gap: '1rem', alignItems: 'center'
            }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={20} color="var(--texto-muted)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--texto)' }}>{tipoLabel[p.tipo] || 'Frete'}</p>
                  <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--texto)' }}>
                    {p.preco_final ? `R$ ${p.preco_final.toFixed(2)}` : p.preco_estimado ? `R$ ${p.preco_estimado.toFixed(2)}` : '--'}
                  </p>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--texto-muted)' }}>
                  {new Date(p.created_at).toLocaleDateString('pt-BR')} • {p.destino.split(',')[0]}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <span className={statusLabel[p.status]?.cls} style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem' }}>
                    {statusLabel[p.status]?.label}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {pedidos.length === 0 && (
            <div style={{ background: 'white', border: '1px dashed var(--borda)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--texto-muted)', fontSize: '0.9rem' }}>Nenhuma viagem recente.</p>
            </div>
          )}
        </div>

      </div>

      {/* ColaFrete Bottom Nav */}
      <nav className="bottom-nav">
        <Link href="/dashboard" className="bottom-nav-item active">
          <Home size={24} color="var(--laranja)" />
          <span>Início</span>
        </Link>
        
        <Link href="/pedidos" className="bottom-nav-item">
          <FileText size={24} color="var(--texto-muted)" />
          <span>Pedidos</span>
        </Link>

        {/* Central Plus Button */}
        <div style={{ position: 'relative', top: '-20px', display: 'flex', justifyContent: 'center' }}>
          <Link href="/pedidos/tipo" style={{ 
            width: 56, height: 56, borderRadius: '50%', background: 'var(--laranja)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(217, 119, 6, 0.4)', textDecoration: 'none',
            border: '4px solid white'
          }}>
            <Plus size={28} color="white" />
          </Link>
        </div>

        <Link href="/mensagens" className="bottom-nav-item">
          <MessageSquare size={24} color="var(--texto-muted)" />
          <span>Mensagens</span>
        </Link>
        
        <Link href="/perfil" className="bottom-nav-item">
          <User size={24} color="var(--texto-muted)" />
          <span>Perfil</span>
        </Link>
      </nav>
    </div>
  )
}

