'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Truck, User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'

export default function CadastroPage() {
  const router = useRouter()
  
  const [role, setRole] = useState<'cliente' | 'motorista'>('cliente')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Initialize role from URL without using useSearchParams to avoid Suspense issues on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const roleParam = params.get('role')
      if (roleParam === 'motorista' || roleParam === 'cliente') {
        setRole(roleParam)
      }
    }
  }, [])

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
      background: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Back */}
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          color: 'var(--texto-muted)', textDecoration: 'none',
          fontSize: '0.85rem', marginBottom: '2rem'
        }}>
          <ArrowLeft size={16} /> Voltar
        </Link>

        {/* Header Section */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ color: 'var(--texto)', fontWeight: 800, fontSize: '1.8rem', marginBottom: '0.5rem' }}>
            Criar conta
          </h1>
          <p style={{ color: 'var(--texto-muted)', fontSize: '0.9rem' }}>
            É rápido e fácil
          </p>
        </div>

        {/* Role selector */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem',
          position: 'relative', zIndex: 10
        }}>
          {(['cliente', 'motorista'] as const).map(r => (
            <div
              key={r}
              onClick={() => {
                console.log('Switching to role:', r)
                setRole(r)
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.25rem 0.5rem',
                borderRadius: 12,
                border: role === r ? '3px solid #FFC107' : '1px solid #E5E7EB',
                background: role === r ? 'rgba(255, 193, 7, 0.15)' : 'white',
                color: role === r ? '#D97706' : '#6B7280',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.95rem',
                transition: 'none',
                textAlign: 'center',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {r === 'cliente' ? '📦 Sou Passageiro' : '🚛 Sou Motorista'}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div>
          <form onSubmit={handleCadastro}>
            {error && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FCA5A5',
                borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1.25rem',
                color: '#EF4444', fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            {/* Full name */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ color: 'var(--texto)', fontWeight: 600 }}>Nome completo</label>
              <input type="text" className="input" placeholder="João da Silva" value={fullName}
                onChange={e => setFullName(e.target.value)} required
                style={{ background: 'white', border: '1px solid var(--borda)', color: 'var(--texto)' }}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ color: 'var(--texto)', fontWeight: 600 }}>E-mail</label>
              <input type="email" className="input" placeholder="joao@email.com" value={email}
                onChange={e => setEmail(e.target.value)} required
                style={{ background: 'white', border: '1px solid var(--borda)', color: 'var(--texto)' }}
              />
            </div>

            {/* Phone */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" style={{ color: 'var(--texto)', fontWeight: 600 }}>Telefone</label>
              <input type="tel" className="input" placeholder="(27) 99999-9999" value={phone}
                onChange={e => setPhone(formatPhone(e.target.value))} required maxLength={15}
                style={{ background: 'white', border: '1px solid var(--borda)', color: 'var(--texto)' }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label" style={{ color: 'var(--texto)', fontWeight: 600 }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} className="input" placeholder="Senha" value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={6}
                  style={{ paddingRight: '3rem', background: 'white', border: '1px solid var(--borda)', color: 'var(--texto)' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-muted)'
                }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <input type="checkbox" required style={{ marginTop: '0.2rem' }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--texto-muted)', lineHeight: 1.4 }}>
                Li e aceito os <span style={{ color: 'var(--texto)', fontWeight: 600 }}>Termos de Uso</span> e <span style={{ color: 'var(--texto)', fontWeight: 600 }}>Política de Privacidade</span>
              </p>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: '1rem', padding: '1rem' }} disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : `Cadastrar`}
            </button>
          </form>

          <p style={{ color: 'var(--texto-muted)', fontSize: '0.875rem', textAlign: 'center', marginTop: '1.5rem' }}>
            Já tem conta?{' '}
            <Link href="/login" style={{ color: 'var(--laranja)', fontWeight: 700, textDecoration: 'none' }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
