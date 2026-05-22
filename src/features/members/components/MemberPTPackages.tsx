import { useState, useEffect } from 'react'
import { memberPTPackageService } from '../services/memberPTPackageService'
import type { MemberPTPackage } from '../types/memberPTPackage'

interface MemberPTPackagesProps {
  memberId: string
  memberName?: string
}

type ViewFilter = 'active' | 'all'

const SESSION_PRESETS = [8, 12, 16, 24]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isExpired = (pkg: MemberPTPackage) =>
  new Date(pkg.expiresAt) < new Date()

const isActive = (pkg: MemberPTPackage) =>
  !isExpired(pkg) && pkg.sessionsRemaining > 0

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const progressPercent = (pkg: MemberPTPackage) =>
  pkg.sessionsTotal === 0
    ? 0
    : Math.round(((pkg.sessionsTotal - pkg.sessionsRemaining) / pkg.sessionsTotal) * 100)

// ─── Package Status Badge ─────────────────────────────────────────────────────

const PackageStatusBadge = ({ pkg }: { pkg: MemberPTPackage }) => {
  if (isExpired(pkg))
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">Expired</span>
  if (pkg.sessionsRemaining === 0)
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Exhausted</span>
  if (pkg.sessionsRemaining <= 2)
    return <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">Low sessions</span>
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
}

// ─── Package Card ─────────────────────────────────────────────────────────────

const PackageCard = ({
  pkg,
  onEdit,
  onDelete,
}: {
  pkg: MemberPTPackage
  onEdit: (pkg: MemberPTPackage) => void
  onDelete: (pkg: MemberPTPackage) => void
}) => {
  const pct = progressPercent(pkg)
  const expired = isExpired(pkg)

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${expired ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <PackageStatusBadge pkg={pkg} />
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {pkg.sessionsRemaining}
            <span className="text-base font-normal text-slate-400"> / {pkg.sessionsTotal} sessions</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onEdit(pkg)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(pkg)}
            className="rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>{pct}% used</span>
          <span>{pkg.sessionsTotal - pkg.sessionsRemaining} sessions done</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${expired ? 'bg-gray-300' : pct >= 80 ? 'bg-orange-400' : 'bg-blue-500'
              }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        <div>
          <span className="font-medium text-slate-600">Purchased</span>{' '}
          {formatDate(pkg.purchaseDate)}
        </div>
        <div className={expired ? 'text-red-500' : ''}>
          <span className={`font-medium ${expired ? 'text-red-600' : 'text-slate-600'}`}>Expires</span>{' '}
          {formatDate(pkg.expiresAt)}
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const EditPackageModal = ({
  pkg,
  onClose,
  onSave,
}: {
  pkg: MemberPTPackage
  onClose: () => void
  onSave: (id: string, updates: Partial<MemberPTPackage>, current: MemberPTPackage) => Promise<void>
}) => {
  const [sessionsRemaining, setSessionsRemaining] = useState(pkg.sessionsRemaining)
  const [sessionsTotal, setSessionsTotal] = useState(pkg.sessionsTotal)
  const [expiresAt, setExpiresAt] = useState(pkg.expiresAt.split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remainingInvalid = sessionsRemaining < 0 || sessionsRemaining > sessionsTotal

  const handleSave = async () => {
    if (remainingInvalid) return
    setSaving(true)
    setError(null)
    try {
      await onSave(
        pkg.id,
        { sessionsRemaining, sessionsTotal, expiresAt: new Date(expiresAt).toISOString() },
        pkg
      )
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Edit Package</h2>
          <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-700">×</button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sessions Total</label>
            <input
              type="number"
              min={1}
              value={sessionsTotal}
              onChange={e => setSessionsTotal(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Sessions Remaining</label>
            <input
              type="number"
              min={0}
              max={sessionsTotal}
              value={sessionsRemaining}
              onChange={e => setSessionsRemaining(Number(e.target.value))}
              className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${remainingInvalid
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                }`}
            />
            {remainingInvalid && (
              <p className="mt-1 text-xs text-red-600">Must be between 0 and sessions total</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Expiry Date</label>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || remainingInvalid}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Modal ────────────────────────────────────────────────────────────────

const AddPackageModal = ({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (sessionCount: number) => Promise<void>
}) => {
  const [sessionCount, setSessionCount] = useState(8)
  const [custom, setCustom] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewExpiry = new Date()
  previewExpiry.setMonth(previewExpiry.getMonth() + 1)

  const handleCreate = async () => {
    if (sessionCount < 1) return
    setSaving(true)
    setError(null)
    try {
      await onCreate(sessionCount)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create package')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">New PT Package</h2>
          <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-700">×</button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Session count</label>
            <div className="grid grid-cols-4 gap-2">
              {SESSION_PRESETS.map(n => (
                <button
                  key={n}
                  onClick={() => { setSessionCount(n); setCustom(false) }}
                  className={`rounded-xl border py-2 text-sm font-semibold transition ${!custom && sessionCount === n
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCustom(true)}
              className={`mt-2 w-full rounded-xl border py-2 text-sm font-semibold transition ${custom
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
            >
              Custom
            </button>
            {custom && (
              <input
                autoFocus
                type="number"
                min={1}
                value={sessionCount}
                onChange={e => setSessionCount(Number(e.target.value))}
                placeholder="Enter session count"
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Sessions</span>
              <span className="font-semibold text-slate-800">{sessionCount}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Expires</span>
              <span className="font-semibold text-slate-800">{formatDate(previewExpiry.toISOString())}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || sessionCount < 1}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create package'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

const DeleteConfirmModal = ({
  pkg,
  onClose,
  onConfirm,
}: {
  pkg: MemberPTPackage
  onClose: () => void
  onConfirm: (id: string) => Promise<void>
}) => {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await onConfirm(pkg.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete package')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900">Delete Package?</h2>
        <p className="mt-2 text-sm text-slate-500">
          This will permanently delete the package with{' '}
          <span className="font-semibold text-slate-700">{pkg.sessionsRemaining} sessions remaining</span>.
          This action cannot be undone.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const MemberPTPackages = ({ memberId, memberName }: MemberPTPackagesProps) => {
  const [packages, setPackages] = useState<MemberPTPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ViewFilter>('active')
  const [editingPkg, setEditingPkg] = useState<MemberPTPackage | null>(null)
  const [deletingPkg, setDeletingPkg] = useState<MemberPTPackage | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const loadPackages = async () => {
    try {
      setError(null)
      setLoading(true)
      const data = await memberPTPackageService.getAll(memberId)
      setPackages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPackages()
  }, [memberId])

  // const loadPackagesById = async () => {
  //   try {
  //     const data = await memberPTPackageService.getById(memberId)
  //     await loadPackages()
  //   } catch (err) {
  //     console.error('Failed to fetch member details:', err);
  //     setError(err instanceof Error ? err.message : 'Failed to load member packages')
  //   }
  // }

  const handleCreate = async (sessionCount: number) => {
    await memberPTPackageService.create(memberId, sessionCount)
    await loadPackages()
  }

  const handleUpdate = async (
    id: string,
    updates: Partial<MemberPTPackage>,
    current: MemberPTPackage
  ) => {
    await memberPTPackageService.update(id, updates, current)
    await loadPackages()
  }

  const handleDelete = async (id: string) => {
    await memberPTPackageService.delete(id)
    await loadPackages()
  }

  const filteredPackages = packages.filter(pkg =>
    filter === 'active' ? isActive(pkg) : true
  )

  const activeCount = packages.filter(isActive).length
  const totalSessionsRemaining = packages
    .filter(isActive)
    .reduce((sum, p) => sum + p.sessionsRemaining, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            PT Packages{memberName ? ` — ${memberName}` : ''}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {activeCount} active package{activeCount !== 1 ? 's' : ''} · {totalSessionsRemaining} sessions remaining
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + New package
        </button>
      </div>

      <div className="flex gap-2">
        {(['active', 'all'] as ViewFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl border px-4 py-1.5 text-sm font-semibold capitalize transition ${filter === f
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
          >
            {f === 'active' ? 'Active' : 'All packages'}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
          <button onClick={loadPackages} className="ml-3 font-semibold underline">Retry</button>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map(i => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      {!loading && !error && (
        filteredPackages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-sm text-slate-500">
              {filter === 'active'
                ? 'No active packages. Create one to get started.'
                : 'No packages found for this member.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPackages.map(pkg => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onEdit={setEditingPkg}
                onDelete={setDeletingPkg}
              />
            ))}
          </div>
        )
      )}

      {editingPkg && (
        <EditPackageModal
          pkg={editingPkg}
          onClose={() => setEditingPkg(null)}
          onSave={handleUpdate}
        />
      )}
      {showAddModal && (
        <AddPackageModal
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreate}
        />
      )}
      {deletingPkg && (
        <DeleteConfirmModal
          pkg={deletingPkg}
          onClose={() => setDeletingPkg(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
