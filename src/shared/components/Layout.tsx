import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from './Header'

const PUBLIC_ROUTES = ['/login']

export const Layout = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation()
  const isPublic = PUBLIC_ROUTES.includes(pathname)

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gray-50">
      {!isPublic && <Header />}
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}