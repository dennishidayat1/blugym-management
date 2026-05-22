import { supabase } from '../../../shared/lib/supabaseClient'
import { ToCamelCase, ToSnakeCase } from '../../../shared/utils/transform'
import type { MemberPTPackage } from '../types/memberPTPackage'

// ─── Error helper ─────────────────────────────────────────────────────────────

const toError = (err: unknown, fallback: string): Error => {
  if (err && typeof err === 'object' && 'message' in err) {
    return new Error((err as { message: string }).message)
  }
  return new Error(fallback)
}

// ─── Validation ───────────────────────────────────────────────────────────────

const validateUpdates = (
  updates: Partial<MemberPTPackage>,
  current?: MemberPTPackage
): void => {
  const total = updates.sessionsTotal ?? current?.sessionsTotal
  const remaining = updates.sessionsRemaining ?? current?.sessionsRemaining

  if (updates.sessionsTotal !== undefined && updates.sessionsTotal < 1)
    throw new Error('Sessions total must be at least 1')
  if (updates.sessionsRemaining !== undefined && updates.sessionsRemaining < 0)
    throw new Error('Sessions remaining cannot be negative')
  if (total !== undefined && remaining !== undefined && remaining > total)
    throw new Error('Sessions remaining cannot exceed sessions total')
  if (updates.expiresAt !== undefined && new Date(updates.expiresAt) <= new Date())
    throw new Error('Expiry date must be in the future')
}

// ─── memberPTPackageService ───────────────────────────────────────────────────

export const memberPTPackageService = {
  /** All packages for a member — active, exhausted, and expired. */
  getAll: async (memberId: string): Promise<MemberPTPackage[]> => {
    const { data, error } = await supabase
      .from('member_pt_packages')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })

    if (error) throw toError(error, 'Failed to fetch packages')
    return (data ?? []).map(ToCamelCase)
  },

  /** Active packages only (not expired, sessions > 0). */
  getActive: async (memberId: string): Promise<MemberPTPackage[]> => {
    const { data, error } = await supabase
      .from('member_pt_packages')
      .select('*')
      .eq('member_id', memberId)
      .gt('expires_at', new Date().toISOString())
      .gt('sessions_remaining', 0)
      .order('created_at', { ascending: false })

    if (error) throw toError(error, 'Failed to fetch active packages')
    return (data ?? []).map(ToCamelCase)
  },

  /** Single package by ID. */
  getById: async (packageId: string): Promise<MemberPTPackage | null> => {
    const { data, error } = await supabase
      .from('member_pt_packages')
      .select('*')
      .eq('id', packageId)
      .single()

    if (error && error.code !== 'PGRST116') throw toError(error, 'Failed to fetch package')
    return data ? ToCamelCase(data) : null
  },

  /** Create a new package. Defaults: 8 sessions, expires in 1 month. */
  create: async (
    memberId: string,
    sessionCount: number = 8,
    expiresAt?: string
  ): Promise<MemberPTPackage> => {
    if (sessionCount < 1) throw new Error('Session count must be at least 1')

    const expiry = expiresAt
      ? new Date(expiresAt)
      : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d })()

    if (expiry <= new Date()) throw new Error('Expiry date must be in the future')

    const { data, error } = await supabase
      .from('member_pt_packages')
      .insert([{
        member_id: memberId,
        sessions_total: sessionCount,
        sessions_remaining: sessionCount,
        expires_at: expiry.toISOString(),
      }])
      .select()
      .single()

    if (error) throw toError(error, 'Failed to create package')
    return ToCamelCase(data)
  },

  /**
   * Update a package with cross-field validation.
   * Pass `current` to validate remaining vs total across the update boundary.
   * Immutable fields (id, memberId, createdAt) are stripped before sending to DB.
   */
  update: async (
    packageId: string,
    updates: Partial<MemberPTPackage>,
    current?: MemberPTPackage
  ): Promise<MemberPTPackage> => {
    validateUpdates(updates, current)

    // Strip fields that must never be written back to the DB
    const { id: _id, memberId: _mid, createdAt: _ca, purchaseDate: _pd, ...safeUpdates } = updates
    const dbUpdates = ToSnakeCase(safeUpdates)

    const { data, error } = await supabase
      .from('member_pt_packages')
      .update(dbUpdates)
      .eq('id', packageId)
      .select()
      .single()

    if (error) throw toError(error, 'Failed to update package')
    return ToCamelCase(data)
  },

  /** Decrement sessions_remaining by 1. Throws if at 0 or expired. */
  consumeSession: async (packageId: string): Promise<MemberPTPackage> => {
    const pkg = await memberPTPackageService.getById(packageId)
    if (!pkg) throw new Error('Package not found')
    if (pkg.sessionsRemaining <= 0) throw new Error('No sessions remaining in this package')
    if (new Date(pkg.expiresAt) <= new Date()) throw new Error('This package has expired')

    return memberPTPackageService.update(
      packageId,
      { sessionsRemaining: pkg.sessionsRemaining - 1 },
      pkg
    )
  },

  /** Increment sessions_remaining by 1 (e.g. booking cancellation). */
  refundSession: async (packageId: string): Promise<MemberPTPackage> => {
    const pkg = await memberPTPackageService.getById(packageId)
    if (!pkg) throw new Error('Package not found')

    return memberPTPackageService.update(
      packageId,
      { sessionsRemaining: pkg.sessionsRemaining + 1 },
      pkg
    )
  },

  /** Permanently delete a package. */
  delete: async (packageId: string): Promise<void> => {
    const { error } = await supabase
      .from('member_pt_packages')
      .delete()
      .eq('id', packageId)

    if (error) throw toError(error, 'Failed to delete package')
  },
}