'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Filter, Search, Plus, Home, FileText, MessageSquare, User } from 'lucide-react'

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
    <div style={{ minHeight: '100vh', background: '#F9FAFB', paddingBottom: '7rem' }}>

      {/* Premium Header */}
      <div style={{ 
        background: 'var(--laranja)', 
        padding: '2.5rem 1.5rem 3.5rem', 
        borderBottomLeftRadius: 32, 
        borderBottomRightRadius: 32,
        boxShadow: '0 4px 20px rgba(217, 119, 6, 0.15)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <Link href="/dashboard" style={{ color: 'white', display: 'flex' }}>
            <ArrowLeft size={24} />
          </Link>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: '1.4rem' }}>Meus pedidos</h1>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {[
            { label: 'Total', value: pedidos.length },
            { label: 'Concluídos', value: pedidos.filter(p => p.status === 'concluido').length },
            { label: 'Gasto total', value: `R$ ${total.toFixed(0)}` },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: '0.85rem', textAlign: 'center', backdropFilter: 'blur(5px)' }}>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '1.25rem' }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '0 1.5rem', marginTop: '-1.5rem', position: 'relative', zIndex: 10 }}>
        {/* Search */}
        <div style={{ 
          background: 'white', borderRadius: 16, padding: '0.5rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)', marginBottom: '1.5rem'
        }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por endereço..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ 
                width: '100%', padding: '0.85rem 1rem 0.85rem 3rem', 
                border: 'none', borderRadius: 12, fontSize: '0.95rem',
                background: '#F3F4F6', color: 'var(--texto)', outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', margin: '0 -1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }} className="hide-scrollbar">
          {[
            { value: 'todos', label: 'Todos' },
            { value: 'pendente', label: 'Aguardando' },
            { value: 'aceito', label: 'Aceito' },
            { value: 'em_andamento', label: 'Em andamento' },
            { value: 'concluido', label: 'Concluídos' },
          ].map(f => (
            <button key={f.value} onClick={() => setFiltroStatus(f.value)}
              style={{
                padding: '0.5rem 1rem', borderRadius: 24, whiteSpace: 'nowrap',
                border: 'none',
                background: filtroStatus === f.value ? 'var(--laranja)' : 'white',
                color: filtroStatus === f.value ? 'white' : 'var(--texto)',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: filtroStatus === f.value ? '0 4px 10px rgba(217, 119, 6, 0.3)' : '0 2px 8px rgba(0,0,0,0.04)'
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '1.25rem 1.5rem' }}>
        {filtrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ fontWeight: 800, marginBottom: '0.5rem', fontSize: '1.1rem', color: 'var(--texto)' }}>
              {busca || filtroStatus !== 'todos' ? 'Nenhum resultado encontrado' : 'Nenhum frete ainda'}
            </p>
            <p style={{ color: 'var(--texto-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              {pedidos.length === 0 ? 'Que tal pedir seu primeiro frete agora?' : 'Tente usar outros filtros.'}
            </p>
            {pedidos.length === 0 && (
              <Link href="/pedidos/novo" className="btn-primary" style={{ padding: '1rem', borderRadius: 16 }}>
                <Plus size={20} /> Pedir primeiro frete
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtrados.map(p => (
              <Link key={p.id} href={`/pedidos/${p.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ 
                  background: 'white', borderRadius: 20, padding: '1.25rem',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)',
                  display: 'flex', gap: '1rem', alignItems: 'flex-start'
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: 'rgba(255,193,7,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.6rem', flexShrink: 0
                  }}>
                    {tipoEmoji[p.tipo] || '📦'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${statusConfig[p.status]?.cls}`}>
                          {statusConfig[p.status]?.label}
                        </span>
                        {p.urgente && <span className="badge badge-urgente">⚡</span>}
                      </div>
                      <p style={{ color: p.status === 'concluido' ? '#10B981' : 'var(--texto)', fontWeight: 800, fontSize: '1rem' }}>
                        R$ {(p.preco_final || p.preco_estimado).toFixed(2)}
                      </p>
                    </div>
                    
                    <div style={{ marginBottom: '0.5rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--texto)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.origem.split(',')[0]}
                      </p>
                      <p style={{ color: 'var(--texto-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        → {p.destino.split(',')[0]}
                      </p>
                    </div>
                    
                    <p style={{ color: 'var(--texto-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {new Date(p.created_at).toLocaleDateString('pt-BR')} • {p.distancia_km}km
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FAB - New freight */}
      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <Link href="/dashboard" className="bottom-nav-item">
          <Home size={24} color="var(--texto-muted)" />
          <span>Início</span>
        </Link>
        <Link href="/pedidos" className="bottom-nav-item active">
          <FileText size={24} color="var(--laranja)" />
          <span>Pedidos</span>
        </Link>
        
        {/* Floating Action Button for New Request */}
        <div style={{ position: 'relative', top: '-20px', display: 'flex', justifyContent: 'center' }}>
          <Link href="/pedidos/tipo" style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--laranja)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(217, 119, 6, 0.4)', border: '4px solid white', textDecoration: 'none'
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
