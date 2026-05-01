'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, MapPin, Camera, ChevronRight, Zap, Calendar, Package } from 'lucide-react'

const TIPOS = [
  { value: 'frete', label: 'Frete de Objetos', emoji: '📦', desc: 'Móveis, caixas, eletros' },
  { value: 'mudanca', label: 'Mudança Residencial', emoji: '🏠', desc: 'Casa completa ou parcial' },
  { value: 'entrega', label: 'Entrega Rápida', emoji: '🛵', desc: 'Encomendas pequenas' },
]

const VEICULOS = [
  { value: 'carro', label: 'Carro', desc: 'Até 300kg', emoji: '🚗' },
  { value: 'van', label: 'Van / Kombi', desc: 'Até 800kg', emoji: '🚐' },
  { value: 'caminhao_pequeno', label: 'Caminhão Pequeno', desc: 'Até 3 toneladas', emoji: '🚛' },
  { value: 'caminhao_grande', label: 'Caminhão Grande', desc: 'Acima de 3 toneladas', emoji: '🚚' },
]

function calcularPreco(distanciaKm: number, tipoVeiculo: string, urgente: boolean): number {
  let base = 0
  switch (tipoVeiculo) {
    case 'carro': base = distanciaKm * 2.5 + 15; break
    case 'van': base = distanciaKm * 3.5 + 25; break
    case 'caminhao_pequeno': base = distanciaKm * 5 + 50; break
    case 'caminhao_grande': base = distanciaKm * 7 + 80; break
    default: base = distanciaKm * 3 + 20
  }
  return Math.round(base * (urgente ? 1.3 : 1))
}

function NovoPedidoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tipoParam = searchParams.get('tipo') as string | null

  const [step, setStep] = useState(1)
  const [tipo, setTipo] = useState(tipoParam || '')
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [descricao, setDescricao] = useState('')
  const [veiculo, setVeiculo] = useState('')
  const [urgente, setUrgente] = useState(false)
  const [agendado, setAgendado] = useState(false)
  const [agendadoPara, setAgendadoPara] = useState('')
  const [distancia, setDistancia] = useState(5) // km estimado
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const precoEstimado = veiculo ? calcularPreco(distancia, veiculo, urgente) : 0

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data, error } = await supabase.from('pedidos').insert({
      cliente_id: user.id,
      tipo: tipo as 'frete' | 'mudanca' | 'entrega',
      origem,
      destino,
      origem_lat: -19.5339,  // Colatina center lat (placeholder)
      origem_lng: -40.6274,  // Colatina center lng (placeholder)
      destino_lat: -19.5339,
      destino_lng: -40.6274,
      descricao,
      preco_estimado: precoEstimado,
      urgente,
      distancia_km: distancia,
      agendado_para: agendado && agendadoPara ? agendadoPara : null,
    }).select().single()

    if (error) {
      setError('Erro ao criar pedido. Verifique seus dados e tente novamente.')
      setLoading(false)
      return
    }

    router.push(`/pedidos/${data.id}?novo=true`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cinza-bg)' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0D1B40, #162552)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/dashboard" style={{ color: 'white', display: 'flex' }}>
          <ArrowLeft size={22} />
        </Link>
        <h1 style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>Novo Pedido de Frete</h1>
      </div>

      {/* Progress */}
      <div style={{ background: 'white', padding: '1rem 1.5rem', borderBottom: '1px solid var(--borda)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: s < 3 ? 1 : 'none' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: step >= s ? 'var(--laranja)' : 'var(--borda)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.78rem', fontWeight: 700,
                color: step >= s ? 'white' : 'var(--texto-muted)',
                transition: 'all 0.2s', flexShrink: 0
              }}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && (
                <div style={{ flex: 1, height: 2, background: step > s ? 'var(--laranja)' : 'var(--borda)', borderRadius: 2 }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          {['Tipo', 'Detalhes', 'Confirmar'].map((l, i) => (
            <span key={i} style={{ fontSize: '0.72rem', color: step >= i + 1 ? 'var(--laranja)' : 'var(--texto-muted)', fontWeight: 600 }}>
              {l}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: '1.5rem', maxWidth: 540, margin: '0 auto' }}>

        {/* STEP 1: Tipo */}
        {step === 1 && (
          <div className="animate-fade-up">
            <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.5rem' }}>
              Qual tipo de serviço você precisa?
            </h2>
            <p style={{ color: 'var(--texto-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Selecione uma opção para continuar
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {TIPOS.map(t => (
                <button key={t.value} onClick={() => { setTipo(t.value); setStep(2) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1.1rem 1.25rem', borderRadius: 14,
                    background: 'white', border: `2px solid ${tipo === t.value ? 'var(--laranja)' : 'var(--borda)'}`,
                    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%'
                  }}>
                  <span style={{ fontSize: '2rem' }}>{t.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--texto)' }}>{t.label}</p>
                    <p style={{ color: 'var(--texto-muted)', fontSize: '0.8rem' }}>{t.desc}</p>
                  </div>
                  <ChevronRight size={18} color="var(--texto-muted)" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Details */}
        {step === 2 && (
          <div className="animate-fade-up">
            <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '1.5rem' }}>
              Onde e o quê?
            </h2>

            {/* Origem / Destino */}
            <div style={{ background: 'white', borderRadius: 14, padding: '1rem', marginBottom: '1rem', border: '1px solid var(--borda)' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--borda)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <label className="label" style={{ marginBottom: '0.2rem' }}>Origem</label>
                  <input type="text" className="input" placeholder="Ex: Av. Getúlio Vargas, 123 - Centro, Colatina"
                    value={origem} onChange={e => setOrigem(e.target.value)}
                    style={{ border: 'none', padding: '0', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', paddingTop: '0.75rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B00', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <label className="label" style={{ marginBottom: '0.2rem' }}>Destino</label>
                  <input type="text" className="input" placeholder="Ex: Rua das Flores, 456 - São Silvano, Colatina"
                    value={destino} onChange={e => setDestino(e.target.value)}
                    style={{ border: 'none', padding: '0', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Distância manual */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <label className="label">Distância estimada (km)</label>
              <p style={{ color: 'var(--texto-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                Não sabe? Use o Google Maps para estimar.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input type="range" min={1} max={100} value={distancia}
                  onChange={e => setDistancia(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#FF6B00' }}
                />
                <span style={{ fontWeight: 700, minWidth: 50, color: 'var(--laranja)' }}>{distancia} km</span>
              </div>
            </div>

            {/* Veículo */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="label">Tipo de veículo necessário</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {VEICULOS.map(v => (
                  <button key={v.value} onClick={() => setVeiculo(v.value)}
                    style={{
                      padding: '0.75rem', borderRadius: 10, border: `2px solid ${veiculo === v.value ? 'var(--laranja)' : 'var(--borda)'}`,
                      background: veiculo === v.value ? 'rgba(255,107,0,0.08)' : 'white',
                      cursor: 'pointer', textAlign: 'center'
                    }}>
                    <div style={{ fontSize: '1.5rem' }}>{v.emoji}</div>
                    <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--texto)' }}>{v.label}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--texto-muted)' }}>{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="label">Descreva a carga</label>
              <textarea className="input" placeholder="Ex: 2 sofás grandes, 1 geladeira, 10 caixas de roupa..."
                value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {/* Urgente / Agendado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button onClick={() => setUrgente(!urgente)}
                style={{
                  padding: '0.85rem', borderRadius: 10, border: `2px solid ${urgente ? '#FF6B00' : 'var(--borda)'}`,
                  background: urgente ? 'rgba(255,107,0,0.1)' : 'white', cursor: 'pointer'
                }}>
                <Zap size={18} color={urgente ? '#FF6B00' : 'var(--texto-muted)'} />
                <p style={{ fontWeight: 700, fontSize: '0.8rem', marginTop: '0.3rem', color: urgente ? 'var(--laranja)' : 'var(--texto)' }}>
                  Urgente +30%
                </p>
              </button>
              <button onClick={() => setAgendado(!agendado)}
                style={{
                  padding: '0.85rem', borderRadius: 10, border: `2px solid ${agendado ? '#0D1B40' : 'var(--borda)'}`,
                  background: agendado ? 'rgba(13,27,64,0.08)' : 'white', cursor: 'pointer'
                }}>
                <Calendar size={18} color={agendado ? '#0D1B40' : 'var(--texto-muted)'} />
                <p style={{ fontWeight: 700, fontSize: '0.8rem', marginTop: '0.3rem', color: agendado ? '#0D1B40' : 'var(--texto)' }}>
                  Agendar
                </p>
              </button>
            </div>

            {agendado && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">Data e hora do frete</label>
                <input type="datetime-local" className="input" value={agendadoPara}
                  onChange={e => setAgendadoPara(e.target.value)} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setStep(1)} className="btn-outline" style={{ flex: 1 }}>Voltar</button>
              <button onClick={() => {
                if (!origem || !destino || !veiculo || !descricao) {
                  setError('Preencha todos os campos obrigatórios.')
                  return
                }
                setError('')
                setStep(3)
              }} className="btn-primary" style={{ flex: 2 }}>
                Continuar <ChevronRight size={16} />
              </button>
            </div>
            {error && <p style={{ color: 'var(--erro)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{error}</p>}
          </div>
        )}

        {/* STEP 3: Confirm */}
        {step === 3 && (
          <div className="animate-fade-up">
            <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '1.5rem' }}>
              Confirme seu pedido
            </h2>

            <div className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'rgba(255,107,0,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
                }}>
                  {TIPOS.find(t => t.value === tipo)?.emoji}
                </div>
                <div>
                  <p style={{ fontWeight: 700 }}>{TIPOS.find(t => t.value === tipo)?.label}</p>
                  <p style={{ color: 'var(--texto-muted)', fontSize: '0.82rem' }}>
                    {VEICULOS.find(v => v.value === veiculo)?.emoji} {VEICULOS.find(v => v.value === veiculo)?.label}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--texto-muted)' }}>Origem</p>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{origem}</p>
                  </div>
                </div>
                <div style={{ width: 2, height: 16, background: 'var(--borda)', marginLeft: 4 }} />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF6B00', marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--texto-muted)' }}>Destino</p>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{destino}</p>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--borda)', marginTop: '1rem', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--texto-muted)', marginBottom: '0.4rem' }}>Descrição da carga:</p>
                <p style={{ fontSize: '0.9rem' }}>{descricao}</p>
              </div>
            </div>

            {/* Price card */}
            <div style={{
              background: 'linear-gradient(135deg, #FF6B00, #FF8C38)',
              borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center'
            }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>Estimativa de Preço</p>
              <p style={{ color: 'white', fontSize: '2.5rem', fontWeight: 900 }}>R$ {precoEstimado.toFixed(2)}</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                {distancia}km • {urgente ? '⚡ Urgente' : 'Normal'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                Preço final negociado com o motorista via PIX/dinheiro
              </p>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: '0.75rem', marginBottom: '1rem', color: 'var(--erro)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setStep(2)} className="btn-outline" style={{ flex: 1 }}>Voltar</button>
              <button onClick={handleSubmit} className="btn-primary" style={{ flex: 2 }} disabled={loading}>
                {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : '🚛 Publicar Pedido'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NovoPedidoPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cinza-bg)' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    }>
      <NovoPedidoForm />
    </Suspense>
  )
}
