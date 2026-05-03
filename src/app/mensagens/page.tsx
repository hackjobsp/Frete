'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, MessageSquare, Home, FileText, Plus, User, ChevronRight } from 'lucide-react'

type Pedido = {
  id: string
  destino: string
  tipo: string
  status: string
  created_at: string
}

const tipoEmoji: Record<string, string> = { frete: '📦', mudanca: '🏠', entrega: '🛵' }

export default function MensagensPage() {
  const router = useRouter()
  const [pedidosAtivos, setPedidosAtivos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChats()
  }, [])

  async function loadChats() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Fetch active orders that might have chats (aceito, em_andamento)
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('id, destino, tipo, status, created_at')
      .eq('cliente_id', user.id)
      .in('status', ['aceito', 'em_andamento', 'concluido'])
      .order('created_at', { ascending: false })

    setPedidosAtivos(pedidos || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', paddingBottom: '7rem' }}>
      
      {/* Premium Header */}
      <div style={{ 
        background: 'var(--laranja)', 
        padding: '2.5rem 1.5rem 2rem', 
        borderBottomLeftRadius: 32, 
        borderBottomRightRadius: 32,
        boxShadow: '0 4px 20px rgba(217, 119, 6, 0.15)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: '1.4rem' }}>Mensagens</h1>
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>
        {pedidosAtivos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💬</div>
            <p style={{ fontWeight: 800, marginBottom: '0.5rem', fontSize: '1.1rem', color: 'var(--texto)' }}>
              Nenhuma conversa ativa
            </p>
            <p style={{ color: 'var(--texto-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Seus chats com motoristas aparecerão aqui assim que um frete for aceito.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pedidosAtivos.map(p => (
              <Link key={p.id} href={`/pedidos/${p.id}/chat`} style={{ textDecoration: 'none' }}>
                <div style={{ 
                  background: 'white', borderRadius: 20, padding: '1.25rem',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)',
                  display: 'flex', gap: '1rem', alignItems: 'center'
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--texto)' }}>
                        Chat do Motorista
                      </p>
                      <p style={{ color: 'var(--texto-muted)', fontSize: '0.7rem', fontWeight: 600 }}>
                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <p style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--texto-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Pedido: {p.destino.split(',')[0]}
                    </p>
                  </div>
                  <ChevronRight size={20} color="var(--texto-muted)" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ColaFrete Bottom Nav */}
      <nav className="bottom-nav">
        <Link href="/dashboard" className="bottom-nav-item">
          <Home size={24} color="var(--texto-muted)" />
          <span>Início</span>
        </Link>
        <Link href="/pedidos" className="bottom-nav-item">
          <FileText size={24} color="var(--texto-muted)" />
          <span>Pedidos</span>
        </Link>
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
        <Link href="/mensagens" className="bottom-nav-item active">
          <MessageSquare size={24} color="var(--laranja)" />
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
