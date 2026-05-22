import { supabase } from '../../../shared/lib/supabaseClient'
import type { Specialty } from '../models/specialty'

export const specialtyService = {
  getAll: async (): Promise<Specialty[]> => {
    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []) as Specialty[]
  }
}
