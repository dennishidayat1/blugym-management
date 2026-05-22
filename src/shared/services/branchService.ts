import { supabase } from '../lib/supabaseClient'
import type { Branch } from '../models/Branch'
import { ToCamelCase, ToSnakeCase } from '../utils/transform'

export const branchService = {
  getAll: async (): Promise<Branch[]> => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []).map(ToCamelCase)
  },

  getById: async (id: string): Promise<Branch | null> => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data ? ToCamelCase(data) : null
  },

  create: async (branch: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>): Promise<Branch> => {
    const { data, error } = await supabase
      .from('branches')
      .insert([ToSnakeCase(branch)])
      .select()
      .single()

    if (error) throw error
    return ToCamelCase(data)
  },

  update: async (id: string, updates: Partial<Branch>): Promise<Branch> => {
    const { data, error } = await supabase
      .from('branches')
      .update(ToSnakeCase({
        ...updates,
        updatedAt: new Date().toISOString()
      }))
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return ToCamelCase(data)
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}