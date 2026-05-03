'use client'

import { Suspense, useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { buscarEnderecos, calcularRota, formatarDuracao, labelVia, type Sugestao, type ResultadoRota } from '@/lib/maps'
import { ArrowLeft, MapPin, Loader2, Zap, Clock, Navigation, Calendar, Camera, X, Check, ChevronRight } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import the map to avoid SSR issues
const OrderMap = dynamic(() => import('@/components/TrackingMapClient'), { 
  ssr: false,
  loading: () => <div style={{ height: 200, background: '#eee', borderRadius: 12 }} />
})

const TIPOS = [
  { value: 'frete', label: 'Frete', emoji: '📦', desc: 'Móveis e caixas' },
  { value: 'mudanca', label: 'Mudança', emoji: '🏠', desc: 'Residencial' },
  { value: 'entrega', label: 'Entrega', emoji: '🛵', desc: 'Pequenos volumes' },
]

const VEICULOS = [
  { value: 'carro', label: 'Carro', desc: 'Até 300kg', emoji: '🚗' },
  { value: 'van', label: 'Van / Kombi', desc: 'Até 800kg', emoji: '🚐' },
  { value: 'caminhao_pequeno', label: 'Caminhão Pequeno', desc: 'Até 3t', emoji: '🚛' },
  { value: 'caminhao_grande', label: 'Caminhão Grande', desc: '+3t', emoji: '🚚' },
]

function calcularPreco(distanciaKm: number, veiculo: string, urgente: boolean): number {
  let base = 0
  switch (veiculo) {
    case 'carro': base = distanciaKm * 2.5 + 15; break
    case 'van': base = distanciaKm * 3.5 + 25; break
    case 'caminhao_pequeno': base = distanciaKm * 5 + 50; break
    case 'caminhao_grande': base = distanciaKm * 7 + 80; break
    default: base = distanciaKm * 3 + 20
  }
  return Math.round(base * (urgente ? 1.3 : 1))
}

// ─── Componente de Input com Autocomplete ────────────────────────────────────
function AddressInput({
  label, placeholder, value, onChange, onSelect, color
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  onSelect: (s: Sugestao) => void
  color: string
}) {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [buscando, setBuscando] = useState(false)
  const [aberto, setAberto] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectingRef = useRef(false)

  const buscar = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 3) { setSugestoes([]); setBuscando(false); return }

    setBuscando(true)
    debounceRef.current = setTimeout(async () => {
      const results = await buscarEnderecos(q)
      setSugestoes(results)
      setAberto(results.length > 0)
      setBuscando(false)
    }, 500)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: '1rem' }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '0.85rem', top: '50%',
          transform: 'translateY(-50%)', zIndex: 1
        }}>
          {buscando
            ? <Loader2 size={16} color={color} style={{ animation: 'spin 1s linear infinite' }} />
            : <MapPin size={16} color={color} />
          }
        </div>
        <input
          type="text"
          className="input"
          placeholder={placeholder}
          value={value}
          onChange={e => { onChange(e.target.value); buscar(e.target.value) }}
          onFocus={() => sugestoes.length > 0 && setAberto(true)}
          onBlur={() => { if (!selectingRef.current) setTimeout(() => setAberto(false), 200) }}
          style={{ paddingLeft: '2.5rem', border: 'none', background: '#F3F4F6', height: '3.5rem' }}
          autoComplete="off"
        />
      </div>

      {aberto && sugestoes.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'white', borderRadius: 12, marginTop: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          border: '1px solid var(--borda)', overflow: 'hidden'
        }}>
          {sugestoes.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(s)
                setAberto(false)
                setSugestoes([])
              }}
              style={{
                width: '100%', padding: '1rem', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: i < sugestoes.length - 1 ? '1px solid var(--borda)' : 'none',
              }}
            >
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={14} color="var(--texto-muted)" />
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--texto)' }}>{s.nome}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--texto-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.enderecoCompleto}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Formulário Principal ─────────────────────────────────────────────────────
function NovoPedidoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)
  const [tipo, setTipo] = useState(searchParams.get('tipo') || 'frete')
  const [veiculo, setVeiculo] = useState('van')
  const [urgente, setUrgente] = useState(false)
  const [agendado, setAgendado] = useState(false)
  const [agendadoPara, setAgendadoPara] = useState('')
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [origemTexto, setOrigemTexto] = useState('')
  const [destinoTexto, setDestinoTexto] = useState('')
  const [origemCoord, setOrigemCoord] = useState<{ lat: number; lng: number } | null>(null)
  const [destinoCoord, setDestinoCoord] = useState<{ lat: number; lng: number } | null>(null)
  
  // New ColaFrete States
  const [complementoOrigem, setComplementoOrigem] = useState('')
  const [dataHoraOrigem, setDataHoraOrigem] = useState('')
  const [complementoDestino, setComplementoDestino] = useState('')
  const [dataHoraDestino, setDataHoraDestino] = useState('')
  const [peso, setPeso] = useState('')
  const [dimensoes, setDimensoes] = useState('')
  const [ajudante, setAjudante] = useState(false)
  const [observacoes, setObservacoes] = useState('')
  
  const origemRef = useRef<{ lat: number; lng: number } | null>(null)
  const destinoRef = useRef<{ lat: number; lng: number } | null>(null)

  const [rota, setRota] = useState<ResultadoRota | null>(null)
  const [calculando, setCalculando] = useState(false)
  const [distanciaInstant, setDistanciaInstant] = useState(0)

  function haversineFast(o: { lat: number; lng: number }, d: { lat: number; lng: number }): number {
    const R = 6371, toRad = (v: number) => v * Math.PI / 180
    const dLat = toRad(d.lat - o.lat), dLng = toRad(d.lng - o.lng)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(o.lat)) * Math.cos(toRad(d.lat)) * Math.sin(dLng / 2) ** 2
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.35 * 10) / 10
  }

  const triggerRota = useCallback((o: { lat: number; lng: number } | null, d: { lat: number; lng: number } | null) => {
    if (!o || !d) { setRota(null); setDistanciaInstant(0); return }
    setDistanciaInstant(haversineFast(o, d))
    setCalculando(true)
    calcularRota(o.lat, o.lng, d.lat, d.lng)
      .then(r => { setRota(r); setDistanciaInstant(r.distancia_km); setCalculando(false) })
      .catch(() => setCalculando(false))
  }, [])

  const distanciaAtual = rota?.distancia_km ?? distanciaInstant
  const preco = distanciaAtual > 0 && veiculo ? calcularPreco(distanciaAtual, veiculo, urgente) : 0

  const handleContinuar1 = async () => {
    if (!origemCoord) {
      const res = await buscarEnderecos(origemTexto)
      if (res.length > 0) {
        setOrigemCoord({ lat: res[0].lat, lng: res[0].lng })
        setOrigemTexto(res[0].nome)
      } else {
        setOrigemCoord({ lat: -19.5339, lng: -40.6274 })
      }
    }
    setStep(2)
  }

  const handleContinuar2 = async () => {
    let finalDest = destinoCoord
    if (!finalDest) {
      const res = await buscarEnderecos(destinoTexto)
      if (res.length > 0) {
        finalDest = { lat: res[0].lat, lng: res[0].lng }
        setDestinoCoord(finalDest)
        setDestinoTexto(res[0].nome)
      } else {
        finalDest = { lat: -19.5339, lng: -40.6274 }
        setDestinoCoord(finalDest)
      }
    }
    if (origemCoord && finalDest) triggerRota(origemCoord, finalDest)
    setStep(3)
  }

  const handleSubmit = async () => {
    if (!origemCoord || !destinoCoord) { setError('Selecione os endereços.'); return }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let fotoUrl: string | null = null
    if (fotoFile) {
      const ext = fotoFile.name.split('.').pop()
      const path = `pedidos/${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('fotos').upload(path, fotoFile)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('fotos').getPublicUrl(path)
        fotoUrl = urlData.publicUrl
      }
    }

    const { data, error: dbError } = await supabase.from('pedidos').insert({
      cliente_id: user.id,
      tipo: tipo as 'frete' | 'mudanca' | 'entrega',
      origem: origemTexto,
      destino: destinoTexto,
      origem_lat: origemCoord.lat,
      origem_lng: origemCoord.lng,
      destino_lat: destinoCoord.lat,
      destino_lng: destinoCoord.lng,
      descricao: `${descricao} | Peso: ${peso} | Dimensões: ${dimensoes} | Ajudante: ${ajudante ? 'Sim' : 'Não'} | Obs: ${observacoes} | Compl. Origem: ${complementoOrigem} (${dataHoraOrigem}) | Compl. Destino: ${complementoDestino} (${dataHoraDestino})`,
      foto_url: fotoUrl,
      preco_estimado: preco,
      urgente,
      distancia_km: distanciaAtual,
      agendado_para: agendado && agendadoPara ? agendadoPara : null,
    }).select().single()

    if (dbError) { setError('Erro ao criar pedido.'); setLoading(false); return }
    router.push(`/pedidos/${data.id}?novo=true`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      
      {/* Header */}
      <div style={{ 
        padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', 
        borderBottom: '1px solid var(--borda)', position: 'sticky', top: 0, background: 'white', zIndex: 100
      }}>
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <ArrowLeft size={24} color="var(--texto)" />
        </button>
        <h1 style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: '1rem', marginRight: 24, color: 'var(--texto)' }}>
          {step === 1 ? 'Coleta' : step === 2 ? 'Entrega' : step === 3 ? 'Detalhes do frete' : 'Revisar solicitação'}
        </h1>
      </div>

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '1.5rem', paddingBottom: '7rem' }}>
        
        {/* Step 1: Coleta (Tela 08) */}
        {step === 1 && (
          <div className="animate-fade">
            <h2 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--texto)', marginBottom: '1.5rem' }}>Detalhes da Coleta</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label" style={{ color: 'var(--texto)' }}>
                {tipo === 'mudanca' ? 'Quais os principais itens da mudança?' : 'O que será transportado?'}
              </label>
              <textarea 
                className="input" 
                placeholder={tipo === 'mudanca' ? 'Ex: Geladeira, fogão, sofá, cama e 15 caixas médias...' : 'Ex: 2 caixas grandes e 1 TV de 50 polegadas...'}
                value={descricao} 
                onChange={e => setDescricao(e.target.value)} 
                rows={3} 
                style={{ background: 'white', border: '1px solid var(--borda)', color: 'var(--texto)', resize: 'none', marginBottom: '0.75rem' }} 
              />
              
              {/* Photo Upload */}
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setFotoFile(f)
                    setFotoPreview(URL.createObjectURL(f))
                  }
                }}
              />
              {!fotoPreview ? (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    width: '100%', padding: '1rem', background: '#F3F4F6', 
                    border: '1px dashed var(--borda)', borderRadius: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                    color: 'var(--texto-muted)', fontWeight: 600, cursor: 'pointer', transition: '0.2s'
                  }}
                >
                  <Camera size={20} />
                  <span>Adicionar foto (opcional)</span>
                </button>
              ) : (
                <div style={{ position: 'relative', width: '100%', height: 160, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--borda)' }}>
                  <img src={fotoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    onClick={() => { setFotoFile(null); setFotoPreview(null) }}
                    style={{ 
                      position: 'absolute', top: '0.5rem', right: '0.5rem', 
                      background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                      width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', cursor: 'pointer'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ color: 'var(--texto)' }}>Endereço de coleta</label>
              <AddressInput
                label=""
                placeholder="Rua, número, bairro..."
                value={origemTexto}
                onChange={v => { setOrigemTexto(v); setOrigemCoord(null); setRota(null) }}
                onSelect={s => {
                  const c = { lat: s.lat, lng: s.lng }
                  setOrigemCoord(c); setOrigemTexto(s.nome); triggerRota(c, destinoCoord)
                }}
                color="var(--laranja)"
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ color: 'var(--texto)' }}>Complemento (opcional)</label>
              <input type="text" className="input" placeholder="Ex: Apto 201" value={complementoOrigem} onChange={e => setComplementoOrigem(e.target.value)} style={{ background: 'white', border: '1px solid var(--borda)', color: 'var(--texto)' }} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ color: 'var(--texto)' }}>Data e hora</label>
              <div style={{ position: 'relative' }}>
                <Clock size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-muted)' }} />
                <input type="datetime-local" className="input" value={dataHoraOrigem} onChange={e => setDataHoraOrigem(e.target.value)} style={{ background: 'white', border: '1px solid var(--borda)', color: 'var(--texto)' }} />
              </div>
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1.5rem', background: 'white', borderTop: '1px solid var(--borda)', zIndex: 100 }}>
              <button onClick={handleContinuar1} disabled={!origemTexto.trim() || !descricao.trim()} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Entrega (Tela 09) */}
        {step === 2 && (
          <div className="animate-fade">
            <h2 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--texto)', marginBottom: '1.5rem' }}>Informa o local de entrega</h2>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ color: 'var(--texto)' }}>Endereço</label>
              <AddressInput
                label=""
                placeholder="Rua, número, bairro..."
                value={destinoTexto}
                onChange={v => { setDestinoTexto(v); setDestinoCoord(null); setRota(null) }}
                onSelect={s => {
                  const c = { lat: s.lat, lng: s.lng }
                  setDestinoCoord(c); setDestinoTexto(s.nome); triggerRota(origemCoord, c)
                }}
                color="var(--laranja)"
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ color: 'var(--texto)' }}>Complemento (opcional)</label>
              <input type="text" className="input" placeholder="Ex: Casa azul" value={complementoDestino} onChange={e => setComplementoDestino(e.target.value)} style={{ background: 'white', border: '1px solid var(--borda)', color: 'var(--texto)' }} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ color: 'var(--texto)' }}>Data e hora</label>
              <div style={{ position: 'relative' }}>
                <Clock size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-muted)' }} />
                <input type="datetime-local" className="input" value={dataHoraDestino} onChange={e => setDataHoraDestino(e.target.value)} style={{ background: 'white', border: '1px solid var(--borda)', color: 'var(--texto)' }} />
              </div>
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1.5rem', background: 'white', borderTop: '1px solid var(--borda)' }}>
              <button onClick={handleContinuar2} disabled={!destinoTexto.trim()} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Detalhes Adicionais (Tela 10) */}
        {step === 3 && (
          <div className="animate-fade">
            <h2 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--texto)', marginBottom: '1.5rem' }}>Conta mais sobre sua entrega</h2>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ color: 'var(--texto)' }}>Peso aproximado</label>
              <input type="text" className="input" placeholder="Ex: 50 kg" value={peso} onChange={e => setPeso(e.target.value)} style={{ background: 'white', border: '1px solid var(--borda)', color: 'var(--texto)' }} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ color: 'var(--texto)' }}>Dimensões (opcional)</label>
              <input type="text" className="input" placeholder="Ex: 100x50x50 cm" value={dimensoes} onChange={e => setDimensoes(e.target.value)} style={{ background: 'white', border: '1px solid var(--borda)', color: 'var(--texto)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '1rem', border: '1px solid var(--borda)', borderRadius: 12 }}>
              <span style={{ fontWeight: 600, color: 'var(--texto)', fontSize: '0.9rem' }}>Precisa de ajudante?</span>
              <div 
                onClick={() => setAjudante(!ajudante)}
                style={{
                  width: 44, height: 24, borderRadius: 12, background: ajudante ? 'var(--laranja)' : '#E5E7EB',
                  position: 'relative', cursor: 'pointer', transition: '0.2s'
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 2, left: ajudante ? 22 : 2, transition: '0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ color: 'var(--texto)' }}>Observações (opcional)</label>
              <textarea className="input" placeholder="Alguma observação importante" value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} style={{ background: 'white', border: '1px solid var(--borda)', color: 'var(--texto)', resize: 'none' }} />
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1.5rem', background: 'white', borderTop: '1px solid var(--borda)', zIndex: 100 }}>
              <button onClick={() => setStep(4)} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Revisar solicitação (Tela 11) */}
        {step === 4 && (
          <div className="animate-fade">
            <h2 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--texto-muted)', marginBottom: '1.5rem', textAlign: 'center' }}>Confira os detalhes</h2>
            
            {/* Coleta */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--laranja)' }} />
                <div style={{ width: 2, flex: 1, background: 'var(--borda)', margin: '4px 0' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--texto)', marginBottom: '0.2rem' }}>Coleta</p>
                <p style={{ color: 'var(--texto-muted)', fontSize: '0.85rem' }}>{origemTexto}</p>
                {complementoOrigem && <p style={{ color: 'var(--texto-muted)', fontSize: '0.85rem' }}>{complementoOrigem}</p>}
                {dataHoraOrigem && <p style={{ color: 'var(--texto-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{new Date(dataHoraOrigem).toLocaleString('pt-BR')}</p>}
              </div>
            </div>

            {/* Entrega */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ width: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--laranja)' }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--texto)', marginBottom: '0.2rem' }}>Entrega</p>
                <p style={{ color: 'var(--texto-muted)', fontSize: '0.85rem' }}>{destinoTexto}</p>
                {complementoDestino && <p style={{ color: 'var(--texto-muted)', fontSize: '0.85rem' }}>{complementoDestino}</p>}
                {dataHoraDestino && <p style={{ color: 'var(--texto-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{new Date(dataHoraDestino).toLocaleString('pt-BR')}</p>}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--borda)', margin: '1.5rem 0' }} />

            {/* Detalhes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--texto)', marginBottom: '0.75rem' }}>Detalhes</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--texto-muted)' }}>Descrição</span>
                <span style={{ color: 'var(--texto)', fontWeight: 500 }}>{descricao}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--texto-muted)' }}>Peso</span>
                <span style={{ color: 'var(--texto)', fontWeight: 500 }}>{peso || '--'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--texto-muted)' }}>Ajudante</span>
                <span style={{ color: 'var(--texto)', fontWeight: 500 }}>{ajudante ? 'Sim' : 'Não'}</span>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--borda)', margin: '1.5rem 0' }} />

            {/* Forma de pagamento */}
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--texto)', marginBottom: '0.75rem' }}>Forma de pagamento</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>💵</span>
                  <span style={{ color: 'var(--texto)', fontWeight: 500, fontSize: '0.9rem' }}>Dinheiro</span>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--laranja)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>Editar</button>
              </div>
            </div>

            {error && <p style={{ color: 'var(--erro)', textAlign: 'center', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</p>}

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1.5rem', background: 'white', borderTop: '1px solid var(--borda)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--texto-muted)', fontSize: '0.9rem' }}>Total estimado</span>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--texto)' }}>R$ {preco.toFixed(2)}</span>
              </div>
              <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
                {loading ? <div className="spinner" style={{ borderColor: 'white', width: 20, height: 20 }} /> : 'Solicitar agora'}
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
    <Suspense fallback={<div className="spinner" />}>
      <NovoPedidoForm />
    </Suspense>
  )
}

