'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, TrendingUp, Truck, CheckCircle, Clock } from 'lucide-react'

type Frete = {
  id: string
  origem: string
  destino: string
  tipo: string
  status: string
  preco_estimado: number
  preco_final: number | null
  distancia_km: number
  created_at: string
}

const tipoEmoji: Record<string, string> = { frete: '📦', mudanca: '🏠', entrega: '🛵' }
const tipoLabel: Record<string, string> = { frete: 'Frete', mudanca: 'Mudança', entrega: 'Entrega' }

function groupByMonth(fretes: Frete[]): Record<string, Frete[]> {
  return fretes.reduce((acc, f) => {
    const key = new Date(f.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(f)
    return acc
  }, {} as Record<string, Frete[]>)
}

export default function MotoristaSalaryPage() {
  const router = useRouter()
  const [fretes, setFretes] = useState<Frete[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'tudo'>('mes')

  useEffect(() => {
    loadData()
  }, [periodo])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Date filter
    let query = supabase
      .from('pedidos')
      .select('*')
      .eq('motorista_id', user.id)
      .eq('status', 'concluido')
      .order('created_at', { ascending: false })

    if (periodo !== 'tudo') {
      const days = periodo === 'semana' ? 7 : 30
      const from = new Date()
      from.setDate(from.getDate() - days)
      query = query.gte('created_at', from.toISOString())
    }

    const { data } = await query.limit(100)
    setFretes(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  const totalGanho = fretes.reduce((sum, f) => sum + (f.preco_final ?? f.preco_estimado), 0)
  const totalKm = fretes.reduce((sum, f) => sum + f.distancia_km, 0)
  const ticketMedio = fretes.length > 0 ? totalGanho / fretes.length : 0
  const byMonth = groupByMonth(fretes)

  const periodoLabel = { semana: 'últimos 7 dias', mes: 'últimos 30 dias', tudo: 'todo o período' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cinza-bg)', paddingBottom: '5rem' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0D1B40, #162552)', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <Link href="/motorista/dashboard" style={{ color: 'white', display: 'flex' }}>
            <ArrowLeft size={22} />
          </Link>
          <h1 style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>💰 Meus Ganhos</h1>
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['semana', 'mes', 'tudo'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              style={{
                padding: '0.4rem 1rem', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                background: periodo === p ? '#FF6B00' : 'rgba(255,255,255,0.12)',
                color: periodo === p ? 'white' : 'rgba(255,255,255,0.65)',
                transition: 'all 0.2s'
              }}
            >
              {p === 'semana' ? '7 dias' : p === 'mes' ? '30 dias' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '1.25rem 1.5rem', maxWidth: 540, margin: '0 auto' }}>

        {/* Main earning card */}
        <div style={{
          background: 'linear-gradient(135deg, #FF6B00, #FF8C38)',
          borderRadius: 20, padding: '1.75rem',
          marginBottom: '1rem',
          boxShadow: '0 6px 24px rgba(255,107,0,0.35)'
        }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            Total ganho — {periodoLabel[periodo]}
          </p>
          <p style={{ color: 'white', fontSize: '2.8rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '0.5rem' }}>
            R$ {totalGanho.toFixed(2).replace('.', ',')}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
            {fretes.length} frete{fretes.length !== 1 ? 's' : ''} concluído{fretes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Km rodados', value: `${Math.round(totalKm)} km`, icon: <Truck size={18} color="#FF6B00" /> },
            { label: 'Ticket médio', value: `R$ ${ticketMedio.toFixed(0)}`, icon: <TrendingUp size={18} color="#10B981" /> },
            { label: 'Fretes', value: fretes.length, icon: <CheckCircle size={18} color="#3B82F6" /> },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>{s.icon}</div>
              <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{s.value}</p>
              <p style={{ color: 'var(--texto-muted)', fontSize: '0.7rem' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Freight list */}
        {fretes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Nenhum ganho neste período</p>
            <p style={{ color: 'var(--texto-muted)', fontSize: '0.875rem' }}>
              Complete fretes para visualizar seus ganhos aqui.
            </p>
            <Link href="/motorista/dashboard" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
              Ver pedidos disponíveis
            </Link>
          </div>
        ) : (
          Object.entries(byMonth).map(([month, items]) => (
            <div key={month} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'capitalize' }}>{month}</h3>
                <span style={{ color: '#10B981', fontWeight: 700, fontSize: '0.88rem' }}>
                  R$ {items.reduce((s, f) => s + (f.preco_final ?? f.preco_estimado), 0).toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {items.map(f => (
                  <Link key={f.id} href={`/pedidos/${f.id}`} style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem' }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: 'rgba(255,107,0,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', flexShrink: 0
                      }}>
                        {tipoEmoji[f.tipo] || '📦'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tipoLabel[f.tipo]} • {f.distancia_km} km
                        </p>
                        <p style={{ color: 'var(--texto-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.origem} → {f.destino}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontWeight: 800, color: '#10B981' }}>
                          R$ {(f.preco_final ?? f.preco_estimado).toFixed(2)}
                        </p>
                        <p style={{ color: 'var(--texto-muted)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end' }}>
                          <Clock size={10} />
                          {new Date(f.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <Link href="/motorista/dashboard" className="bottom-nav-item">
          <span style={{ fontSize: '1.2rem' }}>🏠</span><span>Início</span>
        </Link>
        <Link href="/motorista/ganhos" className="bottom-nav-item active">
          <span style={{ fontSize: '1.2rem' }}>💰</span><span>Ganhos</span>
        </Link>
        <Link href="/perfil" className="bottom-nav-item">
          <span style={{ fontSize: '1.2rem' }}>👤</span><span>Perfil</span>
        </Link>
      </nav>
    </div>
  )
}
