import { supabase } from '../../../shared/lib/supabaseClient'
import type { Trainer } from '../models/trainer'
import { ToCamelCase, ToSnakeCase } from '../../../shared/utils/transform'

const mapTrainer = (item: any): Trainer => ({
  ...ToCamelCase(item),
  branchName: item.branches?.name,
  specialties: item.trainer_specialties?.map((ts: any) => ts.specialties?.name).filter(Boolean)
})

const getSpecialtyIdsByName = async (names: string[]) => {
  if (!names.length) return []

  const { data, error } = await supabase
    .from('specialties')
    .select('id, name')
    .in('name', names)

  if (error) throw error

  const foundNames = (data || []).map((item: any) => item.name)
  const missing = names.filter(name => !foundNames.includes(name))
  if (missing.length) {
    throw new Error(`Specialties not found: ${missing.join(', ')}`)
  }

  return (data || []).map((item: any) => item.id)
}

export const trainerService = {
  getAll: async (): Promise<Trainer[]> => {
    const { data, error } = await supabase
      .from('trainers')
      .select(`
        *,
        branches:branch_id (
          name
        ),
        trainer_specialties (
          specialties: specialty_id (
            name
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(mapTrainer)
  },

  getByBranch: async (branchId: string): Promise<Trainer[]> => {
    const { data, error } = await supabase
      .from('trainers')
      .select(`
        *,
        branches:branch_id (
          name
        ),
        trainer_specialties (
          specialties: specialty_id (
            name
          )
        )
      `)
      .eq('branch_id', branchId)
      .eq('active', true)
      .order('first_name', { ascending: true })

    if (error) throw error
    return (data || []).map(mapTrainer)
  },

  getById: async (id: string): Promise<Trainer | null> => {
    const { data, error } = await supabase
      .from('trainers')
      .select(`
        *,
        branches:branch_id (
          name
        ),
        trainer_specialties (
          specialties: specialty_id (
            name
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data ? mapTrainer(data) : null
  },

  create: async (trainer: Omit<Trainer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trainer> => {
    const { specialties, ...trainerPayload } = trainer

    const { data, error } = await supabase
      .from('trainers')
      .insert([ToSnakeCase(trainerPayload)])
      .select()
      .single()

    if (error) throw error

    if (specialties?.length) {
      const specialtyIds = await getSpecialtyIdsByName(specialties)
      await supabase.from('trainer_specialties').insert(
        specialtyIds.map(specialtyId => ({
          trainer_id: data.id,
          specialty_id: specialtyId
        }))
      )
    }

    return trainerService.getById(data.id) as Promise<Trainer>
  },

  update: async (id: string, updates: Partial<Trainer>): Promise<Trainer> => {
    const { specialties, ...updatePayload } = updates

    const { error } = await supabase
      .from('trainers')
      .update(ToSnakeCase({
        ...updatePayload,
        updatedAt: new Date().toISOString()
      }))
      .eq('id', id)

    if (error) throw error

    if (specialties !== undefined) {
      await supabase.from('trainer_specialties').delete().eq('trainer_id', id)

      if (specialties.length) {
        const specialtyIds = await getSpecialtyIdsByName(specialties)
        await supabase.from('trainer_specialties').insert(
          specialtyIds.map(specialtyId => ({
            trainer_id: id,
            specialty_id: specialtyId
          }))
        )
      }
    }

    return trainerService.getById(id) as Promise<Trainer>
  }
}