'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Send } from 'lucide-react'

type Mensagem = {
  id: string
  pedido_id: string
  remetente_id: string
  texto: string
  created_at: string
  profiles?: { full_name: string }
}

type Pedido = {
  id: string
  cliente_id: string
  motorista_id: string | null
  status: string
  tipo: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()

  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [canAccess, setCanAccess] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    init()
  }, [params.id])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    setUserName(profile?.full_name || 'Você')

    const { data: pedidoData } = await supabase
      .from('pedidos')
      .select('id, cliente_id, motorista_id, status, tipo')
      .eq('id', params.id)
      .single()

    if (!pedidoData) { router.push('/dashboard'); return }
    setPedido(pedidoData)

    // Only client and assigned motorist can access
    const hasAccess = user.id === pedidoData.cliente_id || user.id === pedidoData.motorista_id
    const statusOk = ['aceito', 'em_andamento', 'concluido'].includes(pedidoData.status)
    if (!hasAccess || !statusOk) { router.push(`/pedidos/${params.id}`); return }
    setCanAccess(true)

    await loadMensagens()
    setLoading(false)

    // Subscribe to real-time messages
    // Usamos um id aleatório no canal para evitar erro de concorrência no React Strict Mode
    const channel = supabase
      .channel(`chat_${params.id}_${Math.random()}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensagens',
        filter: `pedido_id=eq.${params.id}`
      }, () => loadMensagens())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }

  async function loadMensagens() {
    const { data } = await supabase
      .from('mensagens')
      .select('*, profiles:remetente_id(full_name)')
      .eq('pedido_id', params.id)
      .order('created_at', { ascending: true })

    setMensagens(data || [])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function enviar() {
    if (!texto.trim() || !userId || enviando) return
    setEnviando(true)

    const msg = texto.trim()
    setTexto('')

    await supabase.from('mensagens').insert({
      pedido_id: params.id,
      remetente_id: userId,
      texto: msg,
    })

    setEnviando(false)
    inputRef.current?.focus()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  const tipoEmoji: Record<string, string> = { frete: '📦', mudanca: '🏠', entrega: '🛵' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cinza-bg)' }}>

      {/* Premium Header */}
      <div style={{
        background: 'var(--laranja)',
        padding: '1.25rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: '1rem',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 4px 15px rgba(217, 119, 6, 0.15)'
      }}>
        <Link href={`/pedidos/${params.id}`} style={{ color: 'white', display: 'flex', flexShrink: 0 }}>
          <ArrowLeft size={22} />
        </Link>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>
            {tipoEmoji[pedido?.tipo || 'frete']} Chat
          </p>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: 600 }}>
            Pedido #{(params.id as string).slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#10B981',
          boxShadow: '0 0 0 3px rgba(16,185,129,0.3)'
        }} />
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingBottom: '5rem' }}>

        {/* System message */}
        <div style={{ textAlign: 'center', margin: '0.5rem 0 1.5rem' }}>
          <span style={{
            background: 'white', borderRadius: 20, border: '1px solid var(--borda)',
            padding: '0.4rem 1rem', fontSize: '0.75rem', color: 'var(--texto-muted)', fontWeight: 600,
            boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
          }}>
            🔒 Mensagens confidenciais com o {userId === pedido?.cliente_id ? 'motorista' : 'cliente'}
          </span>
        </div>

        {mensagens.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💬</div>
            <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Nenhuma mensagem ainda</p>
            <p style={{ color: 'var(--texto-muted)', fontSize: '0.875rem' }}>
              Inicie a conversa para combinar os detalhes do frete.
            </p>
          </div>
        )}

        {mensagens.map((m, i) => {
          const isMine = m.remetente_id === userId
          const prevSame = i > 0 && mensagens[i - 1].remetente_id === m.remetente_id
          const hora = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

          return (
            <div key={m.id} style={{
              display: 'flex',
              justifyContent: isMine ? 'flex-end' : 'flex-start',
              marginTop: prevSame ? 0 : '0.4rem'
            }}>
              <div style={{ maxWidth: '78%' }}>
                {!isMine && !prevSame && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--texto-muted)', marginBottom: '0.2rem', paddingLeft: '0.25rem' }}>
                    {m.profiles?.full_name || 'Usuário'}
                  </p>
                )}
                <div style={{
                  background: isMine ? 'var(--laranja)' : 'white',
                  color: isMine ? 'white' : 'var(--texto)',
                  borderRadius: isMine
                    ? (prevSame ? '16px 4px 16px 16px' : '16px 16px 4px 16px')
                    : (prevSame ? '4px 16px 16px 16px' : '16px 16px 16px 4px'),
                  padding: '0.75rem 1rem',
                  boxShadow: isMine ? '0 4px 10px rgba(217,119,6,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
                  border: isMine ? 'none' : '1px solid rgba(0,0,0,0.02)',
                  fontSize: '0.95rem',
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                  fontWeight: 500
                }}>
                  {m.texto}
                </div>
                <p style={{
                  fontSize: '0.65rem',
                  color: 'var(--texto-muted)',
                  marginTop: '0.15rem',
                  textAlign: isMine ? 'right' : 'left',
                  paddingLeft: isMine ? 0 : '0.25rem',
                  paddingRight: isMine ? '0.25rem' : 0,
                }}>
                  {hora}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid var(--borda)',
        padding: '0.75rem 1rem',
        display: 'flex', gap: '0.6rem', alignItems: 'center'
      }}>
        <input
          ref={inputRef}
          className="input"
          placeholder="Digite sua mensagem..."
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={handleKey}
          style={{ 
            flex: 1, fontSize: '0.95rem', margin: 0, borderRadius: 24, 
            padding: '0.85rem 1.25rem', border: '1px solid var(--borda)',
            background: '#F3F4F6', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
          }}
          disabled={enviando}
        />
        <button
          onClick={enviar}
          disabled={!texto.trim() || enviando}
          style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none',
            background: texto.trim() ? 'var(--laranja)' : '#E5E7EB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: texto.trim() ? 'pointer' : 'default',
            transition: 'all 0.2s', flexShrink: 0,
            boxShadow: texto.trim() ? '0 4px 12px rgba(217, 119, 6, 0.4)' : 'none'
          }}
        >
          <Send size={18} color={texto.trim() ? 'white' : '#94A3B8'} />
        </button>
      </div>
    </div>
  )
}
