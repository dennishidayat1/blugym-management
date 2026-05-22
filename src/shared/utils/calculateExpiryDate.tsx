// Utility function to calculate expiry date based on join date and duration (in months)
export default function calculateExpiryDate(joinDate: string, months: number): Date {
  // Convert string (e.g., "2025-10-06") to Date object
  const date = new Date(joinDate)

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid joinDate: ${joinDate}`)
  }

  const expiry = new Date(date)
  expiry.setMonth(expiry.getMonth() + months)

  return expiry
}
