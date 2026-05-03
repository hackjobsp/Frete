'use client'

import Link from 'next/link'
import { ArrowLeft, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SelecionarTipoPedido() {
  const router = useRouter()

  return (
    <div className="animate-fade-up" style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => router.back()} style={{ background: 'white', border: '1px solid var(--borda)', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <X size={24} color="var(--texto)" />
        </button>
      </div>

      <div style={{ padding: '1.5rem', flex: 1 }}>
        <h1 style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--texto)', marginBottom: '0.5rem', textAlign: 'center' }}>
          O que você precisa hoje?
        </h1>
        <p style={{ color: 'var(--texto-muted)', fontSize: '0.95rem', textAlign: 'center', marginBottom: '2.5rem' }}>
          Escolha o tipo de serviço para continuarmos
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Link href="/pedidos/novo?tipo=frete" style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: 'white', borderRadius: 24, padding: '1.5rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.02)',
              display: 'flex', gap: '1.25rem', alignItems: 'center',
              transition: 'transform 0.2s ease'
            }}>
              <div style={{ width: 64, height: 64, background: 'rgba(255, 193, 7, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
                📦
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--texto)' }}>Frete</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--texto-muted)', marginTop: '0.2rem', lineHeight: 1.4, fontWeight: 500 }}>
                  Ideal para caixas, objetos avulsos ou compras.
                </p>
              </div>
            </div>
          </Link>
          
          <Link href="/pedidos/novo?tipo=mudanca" style={{ textDecoration: 'none' }}>
            <div style={{ 
              background: 'white', borderRadius: 24, padding: '1.5rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.02)',
              display: 'flex', gap: '1.25rem', alignItems: 'center',
              transition: 'transform 0.2s ease'
            }}>
              <div style={{ width: 64, height: 64, background: 'rgba(255, 193, 7, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
                🏠
              </div>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--texto)' }}>Mudança</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--texto-muted)', marginTop: '0.2rem', lineHeight: 1.4, fontWeight: 500 }}>
                  Transporte completo de móveis e eletrodomésticos.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
