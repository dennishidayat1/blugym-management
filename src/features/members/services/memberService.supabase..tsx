// src/features/members/services/memberService.ts
import { supabase } from '../../../shared/lib/supabaseClient'
import type { Member } from '../types/Member'
import { ToCamelCase, ToSnakeCase } from '../../../shared/utils/transform'

export const memberService = {
  // Get all members
  async getAll() {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data.map(member => ToCamelCase(member)) as Member[]
  },

  // Get member by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return ToCamelCase(data) as Member
  },

  // Create new member
  async create(member: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>) {
    // Convert from camelCase to snake_case before sending to DB
    const dbMember = ToSnakeCase(member)
    
    const { data, error } = await supabase
      .from('members')
      .insert([dbMember])
      .select()
      .single()
    
    if (error) throw error
    return ToCamelCase(data) as Member
  },

  // Update member
  async update(id: string, updates: Partial<Member>) {
    // Convert camelCase to snake_case before sending to DB
    const dbUpdates = ToSnakeCase(updates)
    
    const { data, error } = await supabase
      .from('members')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return ToCamelCase(data) as Member
  },

  // Delete member
  async delete(id: string) {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Get members by status
  async getByStatus(status: Member['status']) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data.map(member => ToCamelCase(member)) as Member[]
  },

  // Get expiring memberships (within X days)
  async getExpiringSoon(days: number = 7) {
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + days)
    
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .gte('expiry_date', today.toISOString())
      .lte('expiry_date', futureDate.toISOString())
      .eq('status', 'active')
    
    if (error) throw error
    return data.map(member => ToCamelCase(member)) as Member[]
  }
}
