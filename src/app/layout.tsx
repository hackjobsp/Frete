import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FreteJá Colatina — Frete rápido, preço justo',
  description: 'A plataforma de frete e mudanças de Colatina-ES. Conectamos você com os melhores motoristas da região em minutos.',
  keywords: 'frete colatina, mudança colatina, transporte colatina, frete espirito santo',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'FreteJá Colatina',
    description: 'Frete rápido, preço justo, do jeito que Colatina precisa',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#FF6B00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
