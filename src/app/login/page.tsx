'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Truck, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos. Tente novamente.')
      setLoading(false)
      return
    }

    // Check user role to redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'motorista') {
      router.push('/motorista/dashboard')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ color: 'var(--texto)', fontWeight: 800, fontSize: '1.8rem', marginBottom: '0.5rem' }}>
            Entrar
          </h1>
          <p style={{ color: 'var(--texto-muted)', fontSize: '0.9rem' }}>
            Digite seus dados para continuar
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FCA5A5',
              borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1.25rem',
              color: '#EF4444', fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="label" style={{ color: 'var(--texto)', fontWeight: 600 }}>E-mail ou telefone</label>
            <input
              type="text"
              className="input"
              placeholder="(27) 99999-9999 ou email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                background: 'white',
                border: '1px solid var(--borda)',
                color: 'var(--texto)'
              }}
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label className="label" style={{ color: 'var(--texto)', fontWeight: 600 }}>Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  background: 'white',
                  border: '1px solid var(--borda)',
                  color: 'var(--texto)',
                  paddingRight: '3rem'
                }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-muted)'
              }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginBottom: '2rem' }}>
            <Link href="/recuperar-senha" style={{ color: 'var(--texto-muted)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}>
              Esqueci minha senha
            </Link>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: '1rem', padding: '1rem' }} disabled={loading}>
            {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <p style={{ color: 'var(--texto-muted)', fontSize: '0.85rem' }}>ou continuar com</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button style={{ 
            width: '100%', padding: '1rem', background: 'white', border: '1px solid var(--borda)', 
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            color: 'var(--texto)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.86 16.79 15.69 17.57V20.34H19.26C21.35 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
              <path d="M12 23C14.97 23 17.46 22.02 19.26 20.34L15.69 17.57C14.71 18.23 13.47 18.63 12 18.63C9.16 18.63 6.75 16.71 5.88 14.15H2.21V16.99C4.01 20.57 7.7 23 12 23Z" fill="#34A853"/>
              <path d="M5.88 14.15C5.66 13.49 5.54 12.76 5.54 12C5.54 11.24 5.66 10.51 5.88 9.85V7.01H2.21C1.47 8.5 1 10.19 1 12C1 13.81 1.47 15.5 2.21 16.99L5.88 14.15Z" fill="#FBBC05"/>
              <path d="M12 5.38C13.62 5.38 15.06 5.93 16.21 7.02L19.34 3.89C17.45 2.13 14.97 1 12 1C7.7 1 4.01 3.43 2.21 7.01L5.88 9.85C6.75 7.29 9.16 5.38 12 5.38Z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button style={{ 
            width: '100%', padding: '1rem', background: 'white', border: '1px solid var(--borda)', 
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            color: 'var(--texto)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.675 0H1.325C0.593 0 0 0.593 0 1.325V22.676C0 23.407 0.593 24 1.325 24H12.82V14.706H9.692V11.084H12.82V8.413C12.82 5.313 14.713 3.625 17.479 3.625C18.804 3.625 19.942 3.724 20.274 3.768V7.008L18.356 7.009C16.852 7.009 16.561 7.724 16.561 8.772V11.085H20.148L19.681 14.707H16.561V24H22.677C23.407 24 24 23.407 24 22.675V1.325C24 0.593 23.408 0 22.675 0Z" fill="#1877F2"/>
            </svg>
            Facebook
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <p style={{ color: 'var(--texto-muted)', fontSize: '0.875rem' }}>
            Não tem conta?{' '}
            <Link href="/cadastro" style={{ color: 'var(--laranja)', fontWeight: 700, textDecoration: 'none' }}>
              Criar conta
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
