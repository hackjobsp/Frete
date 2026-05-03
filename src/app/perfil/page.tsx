'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, User, Phone, MapPin, Star, Truck, Package, LogOut, CheckCircle, Edit2, Save, X, FileText, Home, MessageSquare, Plus, ChevronRight, CreditCard, HelpCircle } from 'lucide-react'

type Profile = {
  id: string
  full_name: string
  phone: string
  role: 'cliente' | 'motorista'
  cidade: string
  rating: number
  total_fretes: number
  created_at: string
  cpf?: string
  data_nascimento?: string
}

type Avaliacao = {
  id: string
  nota: number
  comentario: string | null
  created_at: string
  profiles?: { full_name: string }
}

export default function PerfilPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Edit fields
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCidade, setEditCidade] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      setEditName(profileData.full_name)
      setEditPhone(profileData.phone)
      setEditCidade(profileData.cidade || 'Colatina')
    }

    // Load received reviews
    const { data: avs } = await supabase
      .from('avaliacoes')
      .select('*, profiles:avaliador_id(full_name)')
      .eq('avaliado_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    setAvaliacoes(avs || [])
    setLoading(false)
  }

  const formatPhone = (v: string) => {
    const n = v.replace(/\D/g, '')
    if (n.length <= 11) return n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    return v
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)

    await supabase
      .from('profiles')
      .update({
        full_name: editName.trim(),
        phone: editPhone.replace(/\D/g, ''),
        cidade: editCidade.trim(),
      })
      .eq('id', profile.id)

    setProfile(prev => prev ? { ...prev, full_name: editName, phone: editPhone, cidade: editCidade } : prev)
    setSaving(false)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  if (!profile) return null

  const backHref = profile.role === 'motorista' ? '/motorista/dashboard' : '/dashboard'
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(profile.rating))

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', paddingBottom: '7rem' }}>

      {/* Top Banner */}
      <div style={{ 
        background: 'var(--laranja)', 
        height: 160, 
        borderBottomLeftRadius: 40, 
        borderBottomRightRadius: 40,
        position: 'relative'
      }}>
        <h1 style={{ textAlign: 'center', paddingTop: '3rem', color: 'white', fontWeight: 800, fontSize: '1.25rem' }}>Meu Perfil</h1>
      </div>

      {/* Avatar Card (Floating) */}
      <div style={{ marginTop: -50, textAlign: 'center', padding: '0 1.5rem', marginBottom: '2rem' }}>
        <div style={{ 
          width: 100, height: 100, borderRadius: '50%', background: 'white', 
          margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', border: '4px solid white', overflow: 'hidden'
        }}>
          {profile.role === 'motorista' ? <Truck size={40} color="var(--laranja)" /> : <User size={40} color="var(--laranja)" />}
        </div>
        <h2 style={{ marginTop: '0.75rem', fontWeight: 800, fontSize: '1.4rem', color: 'var(--texto)' }}>{profile.full_name}</h2>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
          <span style={{ background: 'white', padding: '0.2rem 0.85rem', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--texto)' }}>
            ⭐ {profile.rating > 0 ? profile.rating.toFixed(1) : 'Novo'}
          </span>
          <span style={{ background: 'white', padding: '0.2rem 0.85rem', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--texto-muted)' }}>
            {profile.total_fretes} fretes
          </span>
        </div>
      </div>

      {/* Menu List or Edit Form */}
      <div style={{ padding: '0 1.5rem', position: 'relative', zIndex: 5 }}>
        
        {saved && (
          <div className="animate-fade-up" style={{ 
            background: '#10B981', color: 'white', padding: '0.85rem', borderRadius: 12, 
            textAlign: 'center', fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
          }}>
            <CheckCircle size={18} /> Perfil atualizado com sucesso!
          </div>
        )}

        {editing ? (
          <div className="animate-fade-up" style={{ background: 'white', borderRadius: 24, padding: '1.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--texto)' }}>Editar Dados</h3>
              <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="var(--texto-muted)" />
              </button>
            </div>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--texto)', marginBottom: '0.4rem' }}>Nome Completo</label>
              <input type="text" className="input" value={editName} onChange={e => setEditName(e.target.value)} style={{ borderRadius: 16, background: '#F3F4F6', border: 'none', padding: '0.85rem 1rem' }} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--texto)', marginBottom: '0.4rem' }}>Telefone</label>
              <input type="tel" className="input" value={formatPhone(editPhone)} onChange={e => setEditPhone(e.target.value)} maxLength={15} style={{ borderRadius: 16, background: '#F3F4F6', border: 'none', padding: '0.85rem 1rem' }} />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--texto)', marginBottom: '0.4rem' }}>Cidade Base</label>
              <input type="text" className="input" value={editCidade} onChange={e => setEditCidade(e.target.value)} style={{ borderRadius: 16, background: '#F3F4F6', border: 'none', padding: '0.85rem 1rem' }} />
            </div>

            <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ borderRadius: 16, padding: '1rem', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              {saving ? <div className="spinner" style={{ width: 20, height: 20, borderColor: 'white', borderTopColor: 'transparent' }} /> : <><Save size={20} /> Salvar Alterações</>}
            </button>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 24, padding: '0.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.02)' }}>
          
          {/* Editar Perfil */}
          <div onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1rem', borderBottom: '1px solid var(--borda)', cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255, 193, 7, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Edit2 size={20} color="var(--laranja)" />
            </div>
            <span style={{ flex: 1, fontWeight: 600, color: 'var(--texto)', fontSize: '0.95rem' }}>Editar perfil</span>
            <ChevronRight size={20} color="var(--texto-muted)" />
          </div>

          {/* Pedidos */}
          <Link href="/pedidos" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1rem', borderBottom: '1px solid var(--borda)', cursor: 'pointer', textDecoration: 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255, 193, 7, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} color="var(--laranja)" />
            </div>
            <span style={{ flex: 1, fontWeight: 600, color: 'var(--texto)', fontSize: '0.95rem' }}>Meus pedidos</span>
            <ChevronRight size={20} color="var(--texto-muted)" />
          </Link>

          {/* Endereços */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1rem', borderBottom: '1px solid var(--borda)', cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255, 193, 7, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={20} color="var(--laranja)" />
            </div>
            <span style={{ flex: 1, fontWeight: 600, color: 'var(--texto)', fontSize: '0.95rem' }}>Endereços salvos</span>
            <ChevronRight size={20} color="var(--texto-muted)" />
          </div>

          {/* Pagamentos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1rem', borderBottom: '1px solid var(--borda)', cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255, 193, 7, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} color="var(--laranja)" />
            </div>
            <span style={{ flex: 1, fontWeight: 600, color: 'var(--texto)', fontSize: '0.95rem' }}>Pagamentos</span>
            <ChevronRight size={20} color="var(--texto-muted)" />
          </div>

          {/* Central de Ajuda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1rem', borderBottom: '1px solid var(--borda)', cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255, 193, 7, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HelpCircle size={20} color="var(--laranja)" />
            </div>
            <span style={{ flex: 1, fontWeight: 600, color: 'var(--texto)', fontSize: '0.95rem' }}>Central de ajuda</span>
            <ChevronRight size={20} color="var(--texto-muted)" />
          </div>

          {/* Sair */}
          <div onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1rem', cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={20} color="#EF4444" />
            </div>
            <span style={{ flex: 1, fontWeight: 600, color: '#EF4444', fontSize: '0.95rem' }}>Sair da conta</span>
          </div>

        </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        {profile.role === 'motorista' ? (
          <>
            <Link href="/motorista/dashboard" className="bottom-nav-item">
              <Home size={24} color="var(--texto-muted)" />
              <span>Início</span>
            </Link>
            <Link href="/motorista/ganhos" className="bottom-nav-item">
              <CreditCard size={24} color="var(--texto-muted)" />
              <span>Ganhos</span>
            </Link>
            <Link href="/perfil" className="bottom-nav-item active">
              <User size={24} color="var(--laranja)" />
              <span>Perfil</span>
            </Link>
          </>
        ) : (
          <>
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
                width: 56, height: 56, borderRadius: '50%', background: 'var(--laranja)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(217, 119, 6, 0.4)', border: '4px solid white', textDecoration: 'none'
              }}>
                <Plus size={28} color="white" />
              </Link>
            </div>

            <Link href="/mensagens" className="bottom-nav-item">
              <MessageSquare size={24} color="var(--texto-muted)" />
              <span>Mensagens</span>
            </Link>
            <Link href="/perfil" className="bottom-nav-item active">
              <User size={24} color="var(--laranja)" />
              <span>Perfil</span>
            </Link>
          </>
        )}
      </nav>
    </div>
  )
}
