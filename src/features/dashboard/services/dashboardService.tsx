// src/features/dashboard/services/dashboardService.ts
import { supabase } from '../../../shared/lib/supabaseClient'
import { ToCamelCase } from '../../../shared/utils/transform'
import type { Member } from '../../members/types/Member'

export interface DashboardMetrics {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  suspendedMembers: number
  expiringThisWeek: number
  revenueThisMonth: number
  newMembersThisMonth: number
  memberGrowth: { month: string; count: number }[]
  statusDistribution: { name: string; value: number }[]
  recentMembers: Member[]
  expiringMembers: Member[]
}

export const dashboardService = {
  async getMetrics(): Promise<DashboardMetrics> {
    // Fetch all members
    const { data: membersData, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const members: Member[] = membersData.map(m => ToCamelCase(m))

    // Calculate basic counts
    const totalMembers = members.length
    const activeMembers = members.filter(m => m.status === 'active').length
    const inactiveMembers = members.filter(m => m.status === 'inactive').length
    const suspendedMembers = members.filter(m => m.status === 'suspended').length

    // Calculate expiring this week
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)

    const expiringMembers = members.filter(m => {
      const expiryDate = new Date(m.expiryDate)
      return expiryDate >= today && expiryDate <= nextWeek && m.status === 'active'
    })

    // Calculate revenue this month (assuming basic = $50, ultra = $100 per month)
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    
    const newMembersThisMonth = members.filter(m => {
      const joinDate = new Date(m.joinDate)
      return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear
    })

    const revenueThisMonth = newMembersThisMonth.reduce((sum, m) => {
      const price = m.membershipType === 'ultra' ? 100 : 50
      return sum + (price * m.membershipDuration)
    }, 0)

    // Member growth over last 6 months
    const memberGrowth = this.calculateMemberGrowth(members)

    // Status distribution for pie chart
    const statusDistribution = [
      { name: 'Active', value: activeMembers },
      { name: 'Inactive', value: inactiveMembers },
      { name: 'Suspended', value: suspendedMembers }
    ]

    // Recent members (last 5)
    const recentMembers = members.slice(0, 5)

    return {
      totalMembers,
      activeMembers,
      inactiveMembers,
      suspendedMembers,
      expiringThisWeek: expiringMembers.length,
      revenueThisMonth,
      newMembersThisMonth: newMembersThisMonth.length,
      memberGrowth,
      statusDistribution,
      recentMembers,
      expiringMembers: expiringMembers.slice(0, 10) // Top 10 expiring soon
    }
  },

  calculateMemberGrowth(members: Member[]): { month: string; count: number }[] {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const today = new Date()
    const growthData: { month: string; count: number }[] = []

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthStr = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      
      // Count members who joined up to this month
      const count = members.filter(m => {
        const joinDate = new Date(m.joinDate)
        return joinDate.getFullYear() === date.getFullYear() && joinDate.getMonth() === date.getMonth()
      }).length

      growthData.push({ month: monthStr, count })
    }

    return growthData
  }
}
