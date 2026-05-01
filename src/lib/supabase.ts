import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string
          role: 'cliente' | 'motorista'
          avatar_url: string | null
          cidade: string
          rating: number
          total_fretes: number
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          phone: string
          role: 'cliente' | 'motorista'
          avatar_url?: string | null
          cidade?: string
          rating?: number
          total_fretes?: number
        }
        Update: {
          full_name?: string
          phone?: string
          avatar_url?: string | null
          cidade?: string
        }
      }
      veiculos: {
        Row: {
          id: string
          motorista_id: string
          tipo: 'carro' | 'van' | 'caminhao_pequeno' | 'caminhao_grande'
          placa: string
          modelo: string
          capacidade_kg: number
          verificado: boolean
          cnh_url: string | null
          created_at: string
        }
      }
      pedidos: {
        Row: {
          id: string
          cliente_id: string
          motorista_id: string | null
          origem: string
          destino: string
          origem_lat: number
          origem_lng: number
          destino_lat: number
          destino_lng: number
          tipo: 'frete' | 'mudanca' | 'entrega'
          descricao: string
          foto_url: string | null
          status: 'pendente' | 'aceito' | 'em_andamento' | 'concluido' | 'cancelado'
          preco_estimado: number
          preco_final: number | null
          urgente: boolean
          agendado_para: string | null
          distancia_km: number
          created_at: string
        }
        Insert: {
          cliente_id: string
          origem: string
          destino: string
          origem_lat: number
          origem_lng: number
          destino_lat: number
          destino_lng: number
          tipo: 'frete' | 'mudanca' | 'entrega'
          descricao: string
          foto_url?: string | null
          preco_estimado: number
          urgente?: boolean
          agendado_para?: string | null
          distancia_km: number
        }
      }
      propostas: {
        Row: {
          id: string
          pedido_id: string
          motorista_id: string
          preco: number
          mensagem: string
          status: 'pendente' | 'aceita' | 'recusada'
          created_at: string
        }
      }
      avaliacoes: {
        Row: {
          id: string
          pedido_id: string
          avaliador_id: string
          avaliado_id: string
          nota: number
          comentario: string | null
          created_at: string
        }
      }
    }
  }
}
