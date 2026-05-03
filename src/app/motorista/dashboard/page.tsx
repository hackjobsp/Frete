'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Truck, MapPin, Bell, LogOut, Home, DollarSign, FileText, User, Navigation, Power, CheckCircle2 } from 'lucide-react'
import { RealtimeChannel } from '@supabase/supabase-js'

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
  onboarding_completo: boolean
}

const tipoLabel: Record<string, string> = { frete: 'Frete', mudanca: 'Mudança', entrega: 'Entrega' }

export default function MotoristaDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pedidosDisponiveis, setPedidosDisponiveis] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  
  // Online / Offline State
  const [isOnline, setIsOnline] = useState(false)
  const [aceitando, setAceitando] = useState<string | null>(null)
  const [localizacaoPermitida, setLocalizacaoPermitida] = useState(true)

  const userIdRef = useRef<string | null>(null)
  const channelsRef = useRef<{ ativos?: RealtimeChannel; pedidos?: RealtimeChannel }>({})
  const watchIdRef = useRef<number | null>(null)
  const wakeLockRef = useRef<any>(null)

  useEffect(() => {
    loadData()
    return () => turnOffline() // cleanup ao desmontar
  }, [])

  // Efeito que roda sempre que `isOnline` muda
  useEffect(() => {
    if (isOnline) {
      turnOnline()
    } else {
      turnOffline()
    }
  }, [isOnline])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    userIdRef.current = user.id

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, rating, total_fretes, onboarding_completo')
      .eq('id', user.id)
      .single()

    if (profileData && !profileData.onboarding_completo) {
      router.push('/onboarding')
      return
    }

    setProfile(profileData)
    setLoading(false)
  }

  async function turnOnline() {
    if (!navigator.geolocation) {
      alert('Seu navegador não suporta GPS.')
      setIsOnline(false)
      return
    }

    // 1. Pedir permissão e observar GPS
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocalizacaoPermitida(true)
        transmitirLocalizacao(pos.coords.latitude, pos.coords.longitude, pos.coords.heading, pos.coords.speed)
      },
      (err) => {
        console.error('Erro de GPS:', err)
        if (err.code === err.PERMISSION_DENIED) {
          setLocalizacaoPermitida(false)
          alert('Você precisa permitir o acesso à localização para ficar online.')
          setIsOnline(false)
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    )

    // 2. Canal de presença
    const ativosChannel = supabase.channel('motoristas_ativos')
    ativosChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Inicializa presença
      }
    })
    channelsRef.current.ativos = ativosChannel

    // 2.5 Request Wake Lock to keep screen awake
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        console.log('Screen Wake Lock active')
      } catch (err) {
        console.error('Wake Lock error:', err)
      }
    }

    // 3. Carregar pedidos pendentes e ouvir novos
    const { data: available } = await supabase
      .from('pedidos')
      .select('*, profiles:cliente_id(full_name, rating)')
      .eq('status', 'pendente')
      .neq('cliente_id', userIdRef.current)
      .order('created_at', { ascending: false })
      .limit(10)
    
    setPedidosDisponiveis(available || [])

    const pedidosChannel = supabase
      .channel('pedidos_novos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, (payload) => {
        const novoPedido = payload.new as Pedido
        if (userIdRef.current && novoPedido.cliente_id === userIdRef.current) return
        if (novoPedido.status === 'pendente') {
          setPedidosDisponiveis(prev => [novoPedido, ...prev])
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, (payload) => {
        const modPedido = payload.new as Pedido
        if (modPedido.status !== 'pendente') {
           setPedidosDisponiveis(prev => prev.filter(p => p.id !== modPedido.id))
        }
      })
      .subscribe()
      
    channelsRef.current.pedidos = pedidosChannel
  }

  function turnOffline() {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null
      }).catch(console.error)
    }
    if (channelsRef.current.ativos) {
      channelsRef.current.ativos.untrack()
      supabase.removeChannel(channelsRef.current.ativos)
    }
    if (channelsRef.current.pedidos) {
      supabase.removeChannel(channelsRef.current.pedidos)
    }
    channelsRef.current = {}
    setPedidosDisponiveis([])
  }

  async function transmitirLocalizacao(lat: number, lng: number, heading: number | null = null, speed: number | null = null) {
    if (!channelsRef.current.ativos) return
    // Usa a funcionalidade Presence do Supabase
    await channelsRef.current.ativos.track({
      lat,
      lng,
      heading,
      speed,
      timestamp: Date.now()
    })
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
      router.push('/motorista/solicitacoes') // Redireciona para aba de viagens
    } else {
      alert('Não foi possível aceitar o frete. Outro motorista já pode ter aceito.')
    }
    setAceitando(null)
  }

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
        background: 'white', 
        padding: '2.5rem 1.5rem 1.5rem',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            {isOnline ? (
              <span style={{ background: '#D1FAE5', color: '#059669', padding: '0.3rem 0.8rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800 }}>
                Online
              </span>
            ) : (
              <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '0.3rem 0.8rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800 }}>
                Offline
              </span>
            )}
          </div>
          <h1 style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--texto)', lineHeight: 1.1 }}>
            Olá, {profile?.full_name?.split(' ')[0]}!
          </h1>
          <p style={{ color: 'var(--texto-muted)', fontSize: '0.9rem', marginTop: '0.3rem', fontWeight: 500 }}>
            {isOnline ? 'Você está online e visível no mapa' : 'Fique online para receber solicitações'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isOnline && (
            <div 
              onClick={() => setIsOnline(false)}
              style={{ width: 48, height: 28, background: '#10B981', borderRadius: 20, position: 'relative', cursor: 'pointer', transition: '0.3s' }}
            >
              <div style={{ width: 24, height: 24, background: 'white', borderRadius: '50%', position: 'absolute', top: 2, right: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
            </div>
          )}
          <button style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Bell size={20} color="var(--texto)" />
          </button>
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>

        {/* MODO OFFLINE */}
        {!isOnline && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '2rem' }}>
            <div style={{ width: 140, height: 140, background: '#FFFBEB', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
              <Navigation size={64} color="var(--laranja)" opacity={0.5} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--texto)', marginBottom: '0.5rem' }}>Pronto para rodar?</h2>
            <p style={{ color: 'var(--texto-muted)', textAlign: 'center', fontSize: '0.9rem', maxWidth: 250, marginBottom: '2rem' }}>
              Fique online para que os clientes da sua região encontrem o seu veículo.
            </p>
          </div>
        )}

        {/* MODO ONLINE */}
        {isOnline && (
          <div className="animate-fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--texto-muted)', fontWeight: 600 }}>Taxa de aceitação</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--texto)' }}>100%</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--texto-muted)', fontWeight: 600 }}>Ganhos do dia</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981' }}>R$ 0,00</p>
              </div>
            </div>

            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--texto)', marginBottom: '1rem' }}>Próxima corrida</h3>

            {pedidosDisponiveis.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 24, padding: '2rem', textAlign: 'center', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ width: 48, height: 48, background: '#F3F4F6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <Navigation size={20} color="var(--texto-muted)" />
                </div>
                <p style={{ color: 'var(--texto-muted)', fontSize: '0.95rem', fontWeight: 500 }}>
                  Aguardando solicitações na sua área...
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pedidosDisponiveis.map(p => (
                  <div key={p.id} className="animate-fade-up" style={{ 
                    background: 'white', borderRadius: 24, padding: '1.5rem',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.02)'
                  }}>
                    {/* Header: Tipo e Distância */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>{p.tipo === 'mudanca' ? '🏠' : '📦'}</span>
                          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--texto)' }}>Nova {tipoLabel[p.tipo]}</span>
                        </div>
                        <span style={{ color: 'var(--texto-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                          {p.distancia_km} km de distância
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ color: 'var(--texto-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Valor estimado</span>
                        <div style={{ color: 'var(--laranja)', fontWeight: 900, fontSize: '1.4rem' }}>
                          R$ {p.preco_estimado.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div style={{ width: '100%', height: 1, background: '#F3F4F6', margin: '1rem 0' }} />

                    {/* Origem / Destino */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', marginTop: 4 }} />
                        <div>
                          <p style={{ fontSize: '0.7rem', color: 'var(--texto-muted)', fontWeight: 700, marginBottom: '0.1rem' }}>COLETA</p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--texto)', fontWeight: 500, lineHeight: 1.3 }}>{p.origem}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--laranja)', marginTop: 4 }} />
                        <div>
                          <p style={{ fontSize: '0.7rem', color: 'var(--texto-muted)', fontWeight: 700, marginBottom: '0.1rem' }}>ENTREGA</p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--texto)', fontWeight: 500, lineHeight: 1.3 }}>{p.destino}</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: 16, marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--texto-muted)', fontWeight: 700, marginBottom: '0.3rem' }}>DESCRIÇÃO</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--texto)', lineHeight: 1.4 }}>{p.descricao}</p>
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        onClick={() => setPedidosDisponiveis(prev => prev.filter(ped => ped.id !== p.id))}
                        style={{ flex: 1, padding: '1rem', background: 'white', border: '2px solid #E5E7EB', borderRadius: 16, fontWeight: 800, color: 'var(--texto)', cursor: 'pointer' }}
                      >
                        Recusar
                      </button>
                      <button 
                        onClick={() => aceitarPedido(p.id)}
                        disabled={aceitando === p.id}
                        className="btn-primary"
                        style={{ flex: 1, padding: '1rem', borderRadius: 16, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      >
                        {aceitando === p.id ? <div className="spinner" style={{ width: 20, height: 20, borderColor: 'white', borderTopColor: 'transparent' }} /> : 'Aceitar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Button for Ficar Online (Only when Offline) */}
      {!isOnline && (
        <div style={{ position: 'fixed', bottom: '90px', left: 0, right: 0, padding: '0 1.5rem', zIndex: 100 }}>
          <button 
            onClick={() => setIsOnline(true)}
            style={{ 
              width: '100%', padding: '1.2rem', background: 'var(--laranja)', 
              color: 'white', fontWeight: 800, fontSize: '1.1rem', borderRadius: 20, 
              border: 'none', cursor: 'pointer', boxShadow: '0 8px 30px rgba(217,119,6,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            <Power size={22} />
            Ficar online
          </button>
        </div>
      )}

      {/* ColaFrete Bottom Nav - Motorista */}
      <nav className="bottom-nav">
        <Link href="/motorista/dashboard" className="bottom-nav-item active">
          <Home size={24} color="var(--laranja)" />
          <span>Início</span>
        </Link>
        <Link href="/motorista/ganhos" className="bottom-nav-item">
          <DollarSign size={24} color="var(--texto-muted)" />
          <span>Ganhos</span>
        </Link>
        <Link href="/motorista/solicitacoes" className="bottom-nav-item">
          <FileText size={24} color="var(--texto-muted)" />
          <span>Solicitações</span>
        </Link>
        <Link href="/perfil" className="bottom-nav-item">
          <User size={24} color="var(--texto-muted)" />
          <span>Perfil</span>
        </Link>
      </nav>

    </div>
  )
}
