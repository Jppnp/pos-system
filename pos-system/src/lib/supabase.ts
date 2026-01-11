import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          cost_price: number
          selling_price: number
          quantity: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          cost_price: number
          selling_price: number
          quantity?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          cost_price?: number
          selling_price?: number
          quantity?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          items: any // JSONB
          total: number
          total_cost: number
          profit: number
          timestamp: string
        }
        Insert: {
          id?: string
          user_id: string
          items: any
          total: number
          total_cost: number
          profit: number
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string
          items?: any
          total?: number
          total_cost?: number
          profit?: number
          timestamp?: string
        }
      }
    }
  }
}