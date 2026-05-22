import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../shared/context/AuthContext'
import { memberPTPackageService } from '../../members/services/memberPTPackageService'
import { sessionService } from '../../sessions/services/sessionService'
import type { MemberPTPackage } from '../../members/types/memberPTPackage'
import type { SessionEnrollment } from '../../sessions/models/session'

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const isExpired = (pkg: MemberPTPackage) => new Date(pkg.expiresAt) < new Date()
const isActive = (pkg: MemberPTPackage) => !isExpired(pkg) && pkg.sessionsRemaining > 0

export const MemberDashboard = () => {
    const { authState } = useAuth()
    const navigate = useNavigate()
    const memberId = authState.status === 'authenticated' ? authState.data.memberId : null

    const [packages, setPackages] = useState<MemberPTPackage[]>([])
    const [enrollments, setEnrollments] = useState<SessionEnrollment[]>([])
    const [loadingPkg, setLoadingPkg] = useState(true)
    const [loadingEnroll, setLoadingEnroll] = useState(true)

    useEffect(() => {
        if (!memberId) return

        memberPTPackageService.getAll(memberId)
            .then(setPackages)
            .catch(console.error)
            .finally(() => setLoadingPkg(false))

        sessionService.getMemberEnrollments(memberId)
            .then(setEnrollments)
            .catch(console.error)
            .finally(() => setLoadingEnroll(false))
    }, [memberId])

    if (!memberId) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">Member account not linked. Please contact admin.</p>
            </div>
        )
    }

    const activePackages = packages.filter(isActive)
    const totalRemaining = activePackages.reduce((sum, p) => sum + p.sessionsRemaining, 0)
    const activeEnrollments = enrollments.filter(e => e.status === 'enrolled')

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">

            {/* Welcome */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
                <p className="text-sm text-slate-500 mt-0.5">Your PT session overview</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active Packages</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{loadingPkg ? '—' : activePackages.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sessions Left</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{loadingPkg ? '—' : totalRemaining}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Upcoming</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">{loadingEnroll ? '—' : activeEnrollments.length}</p>
                </div>
            </div>

            {/* Book CTA */}
            <button
                onClick={() => navigate('/book-pt-session')}
                className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm"
            >
                + Book a PT Session
            </button>

            {/* Active packages */}
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">PT Packages</h2>
                {loadingPkg ? (
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                ) : packages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-400">
                        No packages yet. Contact admin to purchase one.
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {packages.map(pkg => {
                            const expired = isExpired(pkg)
                            const pct = pkg.sessionsTotal === 0 ? 0
                                : Math.round(((pkg.sessionsTotal - pkg.sessionsRemaining) / pkg.sessionsTotal) * 100)
                            return (
                                <div key={pkg.id} className={`bg-white rounded-2xl border p-5 shadow-sm ${expired ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <span className="text-2xl font-bold text-slate-900">{pkg.sessionsRemaining}</span>
                                            <span className="text-sm text-slate-400"> / {pkg.sessionsTotal} sessions</span>
                                        </div>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${expired ? 'bg-gray-100 text-gray-500' :
                                                pkg.sessionsRemaining === 0 ? 'bg-amber-100 text-amber-700' :
                                                    pkg.sessionsRemaining <= 2 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {expired ? 'Expired' : pkg.sessionsRemaining === 0 ? 'Exhausted' : pkg.sessionsRemaining <= 2 ? 'Low' : 'Active'}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={`h-full rounded-full ${expired ? 'bg-gray-300' : pct >= 80 ? 'bg-orange-400' : 'bg-blue-500'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-2 text-xs text-slate-400">
                                        <span>Expires {formatDate(pkg.expiresAt)}</span>
                                        <span>{pct}% used</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Upcoming enrollments */}
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">Upcoming Sessions</h2>
                {loadingEnroll ? (
                    <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                ) : activeEnrollments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-400">
                        No upcoming sessions booked.
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {activeEnrollments.slice(0, 5).map(enrollment => (
                            <div key={enrollment.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">PT Session</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(enrollment.enrolledAt)}</p>
                                </div>
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    Enrolled
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    )
}
