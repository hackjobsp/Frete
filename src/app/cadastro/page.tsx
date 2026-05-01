'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Truck, User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'

function CadastroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get('role') as 'cliente' | 'motorista' | null

  const [role, setRole] = useState<'cliente' | 'motorista'>(roleParam || 'cliente')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const formatPhone = (v: string) => {
    const n = v.replace(/\D/g, '')
    if (n.length <= 11) {
      return n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return v
  }

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone: phone.replace(/\D/g, ''), role }
      }
    })

    if (error) {
      setError(error.message === 'User already registered'
        ? 'Este e-mail já está cadastrado. Tente fazer login.'
        : 'Erro ao criar conta. Tente novamente.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0D1B40 0%, #162552 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(16,185,129,0.2)', border: '2px solid #10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <CheckCircle size={40} color="#10B981" />
          </div>
          <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>
            Conta criada! 🎉
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '2rem' }}>
            Verifique seu e-mail para confirmar o cadastro e então faça login para começar a usar o FreteJá.
          </p>
          <Link href="/login" className="btn-primary" style={{ fontSize: '1rem' }}>
            Fazer Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0D1B40 0%, #162552 50%, #0d3060 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
          fontSize: '0.85rem', marginBottom: '2rem'
        }}>
          <ArrowLeft size={16} /> Voltar
        </Link>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #FF6B00, #FF8C38)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 0.75rem'
          }}>
            <Truck size={26} color="white" />
          </div>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: '1.5rem' }}>
            Criar conta grátis
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Colatina já tem um FreteJá — você ainda não. 😄
          </p>
        </div>

        {/* Role selector */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem'
        }}>
          {(['cliente', 'motorista'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              style={{
                padding: '1rem',
                borderRadius: 12,
                border: role === r ? '2px solid #FF6B00' : '2px solid rgba(255,255,255,0.12)',
                background: role === r ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.05)',
                color: role === r ? '#FF8C38' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem',
                transition: 'all 0.2s'
              }}
            >
              {r === 'cliente' ? '📦 Sou Cliente' : '🚛 Sou Motorista'}
            </button>
          ))}
        </div>

        {/* Form card */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20, padding: '2rem'
        }}>
          <form onSubmit={handleCadastro}>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem',
                color: '#FCA5A5', fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            {/* Full name */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="label" style={{ color: 'rgba(255,255,255,0.8)' }}>Nome completo</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
                <input type="text" className="input" placeholder="Seu nome" value={fullName}
                  onChange={e => setFullName(e.target.value)} required
                  style={{ paddingLeft: '2.75rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="label" style={{ color: 'rgba(255,255,255,0.8)' }}>E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
                <input type="email" className="input" placeholder="seu@email.com" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  style={{ paddingLeft: '2.75rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                />
              </div>
            </div>

            {/* Phone */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="label" style={{ color: 'rgba(255,255,255,0.8)' }}>WhatsApp</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
                <input type="tel" className="input" placeholder="(27) 99999-9999" value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))} required maxLength={15}
                  style={{ paddingLeft: '2.75rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label" style={{ color: 'rgba(255,255,255,0.8)' }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
                <input type={showPassword ? 'text' : 'password'} className="input" placeholder="Min. 6 caracteres" value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={6}
                  style={{ paddingLeft: '2.75rem', paddingRight: '3rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)'
                }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: '1rem' }} disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : `Criar conta de ${role}`}
            </button>
          </form>

          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
            Ao criar conta você concorda com nossos Termos de Uso.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', textAlign: 'center', marginTop: '0.75rem' }}>
            Já tem conta?{' '}
            <Link href="/login" style={{ color: '#FF8C38', fontWeight: 600, textDecoration: 'none' }}>Fazer login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CadastroPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0D1B40, #162552)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    }>
      <CadastroForm />
    </Suspense>
  )
}
