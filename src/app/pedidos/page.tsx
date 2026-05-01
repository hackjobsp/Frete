'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Filter, Search, Plus } from 'lucide-react'

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

const statusConfig: Record<string, { label: string; cls: string }> = {
  pendente:     { label: 'Aguardando', cls: 'badge-pendente' },
  aceito:       { label: 'Aceito', cls: 'badge-aceito' },
  em_andamento: { label: 'Em andamento', cls: 'badge-em_andamento' },
  concluido:    { label: 'Concluído', cls: 'badge-concluido' },
  cancelado:    { label: 'Cancelado', cls: 'badge-cancelado' },
}

const tipoEmoji: Record<string, string> = { frete: '📦', mudanca: '🏠', entrega: '🛵' }

export default function PedidosListPage() {
  const router = useRouter()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    loadPedidos()
  }, [])

  async function loadPedidos() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('cliente_id', user.id)
      .order('created_at', { ascending: false })

    setPedidos(data || [])
    setLoading(false)
  }

  const filtrados = pedidos.filter(p => {
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus
    const matchBusca = !busca || p.origem.toLowerCase().includes(busca.toLowerCase()) || p.destino.toLowerCase().includes(busca.toLowerCase())
    return matchStatus && matchBusca
  })

  const total = pedidos.filter(p => p.status === 'concluido').reduce((sum, p) => sum + (p.preco_final || p.preco_estimado), 0)

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
      <div style={{ background: 'linear-gradient(135deg, #0D1B40, #162552)', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Link href="/dashboard" style={{ color: 'white', display: 'flex' }}>
            <ArrowLeft size={22} />
          </Link>
          <h1 style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>Meus Fretes</h1>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {[
            { label: 'Total', value: pedidos.length },
            { label: 'Concluídos', value: pedidos.filter(p => p.status === 'concluido').length },
            { label: 'Gasto total', value: `R$ ${total.toFixed(0)}` },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.6rem', textAlign: 'center' }}>
              <div style={{ color: i === 2 ? '#10B981' : 'white', fontWeight: 800, fontSize: '1.1rem' }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'white', padding: '1rem 1.5rem', borderBottom: '1px solid var(--borda)' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-muted)' }} />
          <input
            type="text"
            className="input"
            placeholder="Buscar por endereço..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ paddingLeft: '2.5rem', fontSize: '0.9rem' }}
          />
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {[
            { value: 'todos', label: 'Todos' },
            { value: 'pendente', label: 'Aguardando' },
            { value: 'aceito', label: 'Aceito' },
            { value: 'em_andamento', label: 'Em andamento' },
            { value: 'concluido', label: 'Concluídos' },
          ].map(f => (
            <button key={f.value} onClick={() => setFiltroStatus(f.value)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: 20, whiteSpace: 'nowrap',
                border: `1px solid ${filtroStatus === f.value ? 'var(--laranja)' : 'var(--borda)'}`,
                background: filtroStatus === f.value ? 'var(--laranja)' : 'white',
                color: filtroStatus === f.value ? 'white' : 'var(--texto-muted)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '1.25rem 1.5rem' }}>
        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
              {busca || filtroStatus !== 'todos' ? 'Nenhum resultado encontrado' : 'Nenhum frete ainda'}
            </p>
            <p style={{ color: 'var(--texto-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {pedidos.length === 0 ? 'Faça seu primeiro pedido de frete agora!' : 'Tente outros filtros'}
            </p>
            {pedidos.length === 0 && (
              <Link href="/pedidos/novo" className="btn-primary">
                <Plus size={16} /> Pedir primeiro frete
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filtrados.map(p => (
              <Link key={p.id} href={`/pedidos/${p.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'rgba(255,107,0,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.4rem', flexShrink: 0
                  }}>
                    {tipoEmoji[p.tipo] || '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <span className={`badge ${statusConfig[p.status]?.cls}`}>
                        {statusConfig[p.status]?.label}
                      </span>
                      {p.urgente && <span className="badge badge-urgente">⚡</span>}
                    </div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.origem}
                    </p>
                    <p style={{ color: 'var(--texto-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      → {p.destino}
                    </p>
                    <p style={{ color: 'var(--texto-muted)', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                      {new Date(p.created_at).toLocaleDateString('pt-BR')} • {p.distancia_km}km
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: p.status === 'concluido' ? '#10B981' : 'var(--laranja)', fontWeight: 800, fontSize: '0.95rem' }}>
                      R$ {(p.preco_final || p.preco_estimado).toFixed(2)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FAB - New freight */}
      <Link href="/pedidos/novo" style={{
        position: 'fixed', bottom: '5.5rem', right: '1.5rem',
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg, #FF6B00, #FF8C38)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(255,107,0,0.45)',
        textDecoration: 'none', zIndex: 50
      }} className="pulse-orange">
        <Plus size={24} color="white" />
      </Link>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {[
          { href: '/dashboard', icon: '🏠', label: 'Início' },
          { href: '/pedidos/novo', icon: '➕', label: 'Novo Frete' },
          { href: '/pedidos', icon: '📋', label: 'Meus Fretes', active: true },
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
