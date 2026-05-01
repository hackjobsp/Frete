'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  Truck, Package, Home, Star, Shield, Zap, ChevronRight,
  MapPin, Clock, CheckCircle, ArrowRight, Menu, X, Phone
} from 'lucide-react'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div style={{ overflowX: 'hidden' }}>

      {/* ===== NAVBAR ===== */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #FF6B00, #FF8C38)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Truck size={20} color="white" />
          </div>
          <span style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
            Frete<span style={{ color: '#FF6B00' }}>Já</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }} className="desktop-only">
          <a href="#como-funciona" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontWeight: 500 }}>Como Funciona</a>
          <a href="#para-motoristas" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontWeight: 500 }}>Para Motoristas</a>
          <a href="#depoimentos" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontWeight: 500 }}>Depoimentos</a>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/login" className="btn-secondary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem' }}>
            Entrar
          </Link>
          <Link href="/cadastro" className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem' }}>
            Cadastrar
          </Link>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="gradient-hero" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: '10%', right: '-5%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(255,107,0,0.15) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', left: '-10%',
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(255,107,0,0.08) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />

        <div className="container" style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>

            {/* Left */}
            <div className="animate-fade-up">
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(255,107,0,0.15)', border: '1px solid rgba(255,107,0,0.3)',
                borderRadius: 20, padding: '0.4rem 1rem', marginBottom: '1.5rem'
              }}>
                <MapPin size={14} color="#FF6B00" />
                <span style={{ color: '#FF8C38', fontSize: '0.82rem', fontWeight: 600 }}>
                  Colatina, Espírito Santo 🚛
                </span>
              </div>

              <h1 style={{
                color: 'white', fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1px',
                marginBottom: '1.25rem'
              }}>
                Frete rápido,<br />
                <span style={{
                  background: 'linear-gradient(135deg, #FF6B00, #FF8C38)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>
                  preço justo.
                </span>
              </h1>

              <p style={{
                color: 'rgba(255,255,255,0.75)', fontSize: '1.1rem',
                lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 480
              }}>
                Conectamos você com os melhores motoristas de Colatina em minutos.
                Frete, mudança ou entrega — simples, seguro e transparente.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
                <Link href="/pedidos/novo" className="btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
                  <Truck size={18} />
                  Pedir Frete Agora
                </Link>
                <Link href="/cadastro?role=motorista" className="btn-secondary" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
                  Sou Motorista
                  <ArrowRight size={16} />
                </Link>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {[
                  { value: 'Grátis', label: 'para usar' },
                  { value: '< 5min', label: 'resposta média' },
                  { value: '100%', label: 'motoristas verificados' },
                ].map((stat, i) => (
                  <div key={i}>
                    <div style={{ color: '#FF8C38', fontSize: '1.4rem', fontWeight: 800 }}>{stat.value}</div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — App mockup card */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="card-glass" style={{ width: '100%', maxWidth: 340, padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ color: 'white', fontWeight: 700 }}>Novo Pedido</span>
                    <span className="badge badge-urgente">Urgente</span>
                  </div>

                  {/* Origin */}
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>Origem</span>
                    </div>
                    <p style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      Av. Getúlio Vargas, Colatina
                    </p>
                  </div>

                  {/* Destination */}
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6B00' }} />
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>Destino</span>
                    </div>
                    <p style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      São Silvano, Colatina
                    </p>
                  </div>
                </div>

                {/* Price estimate */}
                <div style={{ background: 'rgba(255,107,0,0.2)', borderRadius: 10, padding: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>Estimativa de Preço</p>
                  <p style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800 }}>R$ 85,00</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>4,2 km • Van disponível</p>
                </div>

                {/* Drivers nearby */}
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  3 motoristas próximos
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['🚛', '🚐', '🚗'].map((emoji, i) => (
                    <div key={i} style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}>
                      {emoji}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section id="como-funciona" className="section" style={{ background: 'white' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{
              background: 'rgba(255,107,0,0.1)', color: 'var(--laranja)',
              padding: '0.3rem 1rem', borderRadius: 20, fontSize: '0.82rem', fontWeight: 700
            }}>
              SIMPLES ASSIM
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.75rem', letterSpacing: '-0.5px' }}>
              Como funciona o FreteJá?
            </h2>
            <p style={{ color: 'var(--texto-muted)', fontSize: '1.05rem', marginTop: '0.75rem' }}>
              Do pedido ao frete concluído em minutos
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {[
              {
                step: '01',
                icon: <Package size={28} />,
                title: 'Descreva seu frete',
                desc: 'Informe origem, destino, tipo de carga e tire uma foto. Leva menos de 2 minutos.'
              },
              {
                step: '02',
                icon: <Truck size={28} />,
                title: 'Receba propostas',
                desc: 'Motoristas verificados na sua região enviam propostas com preço e tempo estimado.'
              },
              {
                step: '03',
                icon: <CheckCircle size={28} />,
                title: 'Escolha e confirme',
                desc: 'Veja o perfil, avaliações e escolha o motorista ideal. Pague no PIX ou dinheiro.'
              },
              {
                step: '04',
                icon: <Star size={28} />,
                title: 'Avalie e pronto!',
                desc: 'Frete concluído! Avalie o serviço e ajude outros clientes a escolherem melhor.'
              },
            ].map((item, i) => (
              <div key={i} className="card" style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: '1.2rem', right: '1.2rem',
                  fontSize: '2.5rem', fontWeight: 900, color: 'rgba(255,107,0,0.08)'
                }}>
                  {item.step}
                </div>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(255,107,0,0.1)', color: 'var(--laranja)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem'
                }}>
                  {item.icon}
                </div>
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{item.title}</h3>
                <p style={{ color: 'var(--texto-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TIPOS DE SERVIÇO ===== */}
      <section style={{ background: 'var(--cinza-bg)', padding: '4rem 0' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '2.5rem' }}>
            Qual serviço você precisa?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            {[
              { emoji: '📦', tipo: 'Frete de Objetos', desc: 'Móveis, eletrodomésticos, caixas', cor: '#FF6B00' },
              { emoji: '🏠', tipo: 'Mudança Residencial', desc: 'Casa, apartamento, república', cor: '#0D1B40' },
              { emoji: '🏢', tipo: 'Mudança Comercial', desc: 'Escritório, loja, empresa', cor: '#10B981' },
              { emoji: '🛵', tipo: 'Entrega Rápida', desc: 'Encomendas e pequenos volumes', cor: '#F59E0B' },
            ].map((s, i) => (
              <Link key={i} href="/pedidos/novo" style={{ textDecoration: 'none' }}>
                <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{s.emoji}</div>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.3rem' }}>{s.tipo}</h3>
                  <p style={{ color: 'var(--texto-muted)', fontSize: '0.82rem' }}>{s.desc}</p>
                  <div style={{
                    marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    color: s.cor, fontSize: '0.82rem', fontWeight: 600
                  }}>
                    Pedir agora <ChevronRight size={14} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PARA MOTORISTAS ===== */}
      <section id="para-motoristas" className="gradient-hero section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>

            <div>
              <span style={{
                background: 'rgba(255,107,0,0.2)', color: '#FF8C38',
                padding: '0.3rem 1rem', borderRadius: 20, fontSize: '0.82rem', fontWeight: 700
              }}>
                PARA MOTORISTAS
              </span>
              <h2 style={{ color: 'white', fontSize: '2.2rem', fontWeight: 800, margin: '1rem 0', letterSpacing: '-0.5px' }}>
                Ganhe mais com<br />sua van ou caminhão
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: '2rem' }}>
                Cadastre-se, defina seu raio de atuação em Colatina e comece a receber pedidos de frete na sua região.
                Sem burocracia, sem mensalidade no início.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { icon: <Zap size={18} />, text: 'Pedidos em tempo real no seu celular' },
                  { icon: <Shield size={18} />, text: 'Motoristas verificados ganham mais visibilidade' },
                  { icon: <Clock size={18} />, text: 'Trabalhe nos horários que quiser' },
                  { icon: <Phone size={18} />, text: 'Suporte via WhatsApp sempre disponível' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(255,107,0,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#FF8C38', flexShrink: 0
                    }}>
                      {item.icon}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>{item.text}</span>
                  </div>
                ))}
              </div>

              <Link href="/cadastro?role=motorista" className="btn-primary" style={{ fontSize: '1rem', padding: '0.9rem 2rem' }}>
                Quero ser motorista parceiro
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Earnings mockup */}
            <div className="card-glass" style={{ padding: '2rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Ganhos estimados (Colatina)
              </p>
              <p style={{ color: '#FF8C38', fontSize: '2.5rem', fontWeight: 900, marginBottom: '1.5rem' }}>
                R$ 250–600<span style={{ fontSize: '1rem', fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>/semana</span>
              </p>

              {[
                { veiculo: '🚗 Carro', ganho: 'R$ 250–350/sem' },
                { veiculo: '🚐 Van', ganho: 'R$ 400–600/sem' },
                { veiculo: '🚛 Caminhão', ganho: 'R$ 600–1200/sem' },
              ].map((v, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 0',
                  borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                }}>
                  <span style={{ color: 'white', fontSize: '0.95rem' }}>{v.veiculo}</span>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>{v.ganho}</span>
                </div>
              ))}

              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '1rem' }}>
                *Estimativas baseadas em 3-5 fretes por dia em Colatina
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ===== DIFERENCIAIS ===== */}
      <section style={{ background: 'white', padding: '5rem 0' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '3rem' }}>
            Por que o FreteJá é diferente?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              {
                icon: '🛡️', title: 'Motoristas Verificados',
                desc: 'CNH confirmada, foto do veículo e histórico de avaliações visível para todos.'
              },
              {
                icon: '💰', title: 'Preço Transparente',
                desc: 'Calculadora automática mostra a estimativa antes de publicar. Sem surpresa na hora de pagar.'
              },
              {
                icon: '⚡', title: 'Frete no Zap',
                desc: 'Notificações no WhatsApp quando uma proposta for aceita. Do jeito que o Brasil gosta.'
              },
              {
                icon: '📍', title: '100% Local',
                desc: 'Foco em Colatina e região. Atendimento personalizado, não somos empresa grande e fria.'
              },
              {
                icon: '🕐', title: 'Frete Agendado',
                desc: 'Precisa amanhã de manhã? Agende com antecedência e tenha o motorista garantido.'
              },
              {
                icon: '🤝', title: 'Suporte Real',
                desc: 'Equipe local no WhatsApp. Se tiver problema, tem um humano para te ajudar.'
              },
            ].map((d, i) => (
              <div key={i} className="card">
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{d.icon}</div>
                <h3 style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{d.title}</h3>
                <p style={{ color: 'var(--texto-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section style={{
        background: 'linear-gradient(135deg, #FF6B00 0%, #D95500 100%)',
        padding: '5rem 0', textAlign: 'center'
      }}>
        <div className="container">
          <h2 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.5px' }}>
            Pronto para o primeiro frete?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
            Cadastro gratuito. Sem mensalidade. Só pague quando usar.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/cadastro" style={{
              background: 'white', color: '#FF6B00', padding: '1rem 2.5rem',
              borderRadius: 12, fontWeight: 800, fontSize: '1.05rem',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'transform 0.2s'
            }}>
              <Truck size={20} />
              Criar conta grátis
            </Link>
            <Link href="/pedidos" style={{
              background: 'transparent', color: 'white', padding: '1rem 2.5rem',
              borderRadius: 12, fontWeight: 700, fontSize: '1.05rem',
              textDecoration: 'none', border: '2px solid rgba(255,255,255,0.5)',
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
            }}>
              Ver fretes disponíveis
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: 'var(--azul)', padding: '2.5rem 0', textAlign: 'center' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Truck size={20} color="#FF6B00" />
            <span style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>
              Frete<span style={{ color: '#FF6B00' }}>Já</span>
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
            © 2026 FreteJá — Colatina, Espírito Santo. Todos os direitos reservados.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', marginTop: '0.4rem' }}>
            Frete rápido, preço justo, do jeito que Colatina precisa.
          </p>
        </div>
      </footer>

    </div>
  )
}
