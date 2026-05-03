'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ShieldCheck, Truck, User, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'

type Profile = {
  id: string
  role: 'cliente' | 'motorista'
  full_name: string
  onboarding_completo: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1)

  // Form states
  const [cpf, setCpf] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [cnh, setCnh] = useState('')
  const [placa, setPlaca] = useState('')
  const [modelo, setModelo] = useState('')
  const [tipoVeiculo, setTipoVeiculo] = useState('carro')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !profileData) {
      console.error('Erro ao buscar perfil:', error)
      return
    }

    if (profileData.onboarding_completo) {
      router.push(profileData.role === 'motorista' ? '/motorista/dashboard' : '/dashboard')
      return
    }

    setProfile(profileData)
    setLoading(false)
  }

  // Masks
  const formatCPF = (val: string) => {
    let v = val.replace(/\D/g, '')
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, '$1.$2')
      v = v.replace(/(\d{3})(\d)/, '$1.$2')
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return v
  }

  const formatPlaca = (val: string) => {
    let v = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (v.length > 3) {
      v = v.replace(/([A-Z]{3})([0-9A-Z]{1,4})/, '$1-$2')
    }
    return v.substring(0, 8)
  }

  const formatCNH = (val: string) => val.replace(/\D/g, '').substring(0, 11)

  const isValidAge = (dateString: string) => {
    if (!dateString) return false
    const birthDate = new Date(dateString)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age >= 18
  }

  const handleSubmitCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (cpf.length < 14) return alert('CPF incompleto.')
    if (!isValidAge(dataNascimento)) return alert('Você deve ter pelo menos 18 anos.')

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        cpf: cpf.replace(/\D/g, ''),
        data_nascimento: dataNascimento,
        onboarding_completo: true
      })
      .eq('id', profile.id)

    setSaving(false)
    if (error) {
      alert('Erro ao salvar dados.')
      console.error(error)
    } else {
      router.push('/dashboard')
    }
  }

  const handleSubmitMotorista = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    if (step === 1) {
      if (cpf.length < 14) return alert('CPF incompleto.')
      if (!isValidAge(dataNascimento)) return alert('Você deve ter pelo menos 18 anos.')
      setStep(2)
      return
    }

    if (step === 2) {
      if (cnh.length < 11) return alert('CNH incompleta.')
      setStep(3)
      return
    }

    if (step === 3) {
      if (placa.length < 8) return alert('Placa inválida.')
      if (modelo.length < 2) return alert('Modelo inválido.')

      setSaving(true)
      
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          cpf: cpf.replace(/\D/g, ''),
          data_nascimento: dataNascimento,
          onboarding_completo: true
        })
        .eq('id', profile.id)

      if (profileError) {
        alert('Erro ao salvar perfil.')
        setSaving(false)
        return
      }

      // Check if vehicle exists (should not, but just in case)
      const { data: veiculos } = await supabase.from('veiculos').select('id').eq('motorista_id', profile.id)
      
      if (veiculos && veiculos.length > 0) {
        await supabase
          .from('veiculos')
          .update({
            cnh: cnh,
            placa: placa.replace('-', ''),
            modelo: modelo,
            tipo: tipoVeiculo
          })
          .eq('motorista_id', profile.id)
      } else {
        await supabase
          .from('veiculos')
          .insert({
            motorista_id: profile.id,
            cnh: cnh,
            placa: placa.replace('-', ''),
            modelo: modelo,
            tipo: tipoVeiculo
          })
      }

      setSaving(false)
      router.push('/motorista/dashboard')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <Loader2 className="spinner" size={40} color="var(--laranja)" />
      </div>
    )
  }

  if (!profile) return null

  const isMotorista = profile.role === 'motorista'

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,107,0,0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
            color: 'var(--laranja)'
          }}>
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontWeight: 800, fontSize: '1.5rem', color: '#0F172A', marginBottom: '0.5rem' }}>
            Protegendo nossa comunidade
          </h1>
          <p style={{ color: 'var(--texto-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Para garantir a segurança de todos na FreteJá, precisamos de alguns dados antes de liberar seu acesso.
          </p>
        </div>

        {/* Progress Bar (Only for Motorista) */}
        {isMotorista && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{ 
                height: 6, flex: 1, borderRadius: 3, 
                background: s <= step ? 'var(--laranja)' : '#E2E8F0',
                transition: 'background 0.3s'
              }} />
            ))}
          </div>
        )}

        {/* Form Card */}
        <div className="card" style={{ padding: '2rem' }}>
          
          <form onSubmit={isMotorista ? handleSubmitMotorista : handleSubmitCliente}>
            
            {/* ETAPA 1: DADOS PESSOAIS (Ambos) */}
            {(!isMotorista || step === 1) && (
              <div className="animate-fade-up">
                <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={20} color="var(--laranja)" /> Seus Dados
                </h2>
                
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="label">CPF</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="000.000.000-00" 
                    value={cpf}
                    onChange={e => setCpf(formatCPF(e.target.value))}
                    maxLength={14}
                    required
                  />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label className="label">Data de Nascimento</label>
                  <input 
                    type="date" 
                    className="input" 
                    value={dataNascimento}
                    onChange={e => setDataNascimento(e.target.value)}
                    required
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--texto-muted)', marginTop: '0.5rem' }}>
                    Você deve ter pelo menos 18 anos para usar a plataforma.
                  </p>
                </div>
              </div>
            )}

            {/* ETAPA 2: CNH (Apenas Motorista) */}
            {isMotorista && step === 2 && (
              <div className="animate-fade-up">
                <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={20} color="var(--laranja)" /> Sua Habilitação
                </h2>
                
                <div style={{ marginBottom: '2rem' }}>
                  <label className="label">Número da CNH</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Somente números" 
                    value={cnh}
                    onChange={e => setCnh(formatCNH(e.target.value))}
                    maxLength={11}
                    required
                  />
                </div>
              </div>
            )}

            {/* ETAPA 3: VEÍCULO (Apenas Motorista) */}
            {isMotorista && step === 3 && (
              <div className="animate-fade-up">
                <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck size={20} color="var(--laranja)" /> Seu Veículo
                </h2>
                
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="label">Tipo de Veículo</label>
                  <select 
                    className="input" 
                    value={tipoVeiculo}
                    onChange={e => setTipoVeiculo(e.target.value)}
                    required
                  >
                    <option value="carro">🚗 Carro / Picape Leve</option>
                    <option value="van">🚐 Van / Furgão</option>
                    <option value="caminhao_pequeno">🚚 Caminhão Pequeno (3/4)</option>
                    <option value="caminhao_grande">🚛 Caminhão Grande (Toco/Truck)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="label">Placa do Veículo</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="ABC-1234 ou ABC1D23" 
                    value={placa}
                    onChange={e => setPlaca(formatPlaca(e.target.value))}
                    maxLength={8}
                    required
                  />
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label className="label">Modelo do Veículo</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Ex: Fiat Fiorino" 
                    value={modelo}
                    onChange={e => setModelo(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              {isMotorista && step > 1 && (
                <button 
                  type="button" 
                  onClick={() => setStep(s => s - 1)}
                  className="btn-outline"
                  style={{ flex: 1, padding: '1rem', fontWeight: 600 }}
                  disabled={saving}
                >
                  Voltar
                </button>
              )}
              
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1rem' }}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="spinner" size={20} />
                ) : (
                  <>
                    {(!isMotorista || step === 3) ? 'Concluir Cadastro' : 'Avançar'} 
                    {(!isMotorista || step === 3) ? <CheckCircle size={20} /> : <ArrowRight size={20} />}
                  </>
                )}
              </button>
            </div>
            
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ color: 'var(--texto-muted)', fontSize: '0.85rem' }}>
            Seus dados são criptografados e protegidos. Nunca compartilharemos suas informações pessoais publicamente.
          </p>
        </div>

      </div>
    </div>
  )
}
