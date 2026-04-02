'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const menuItems = [
  { href: '/dashboard',          label: 'Dashboard',      icon: '📊', roles: ['admin','manager','finance','viewer'] },
  { href: '/dashboard/kol',      label: 'Kelola KOL',     icon: '👥', roles: ['admin','manager'] },
  { href: '/dashboard/produk',   label: 'Master Produk',  icon: '📦', roles: ['admin','manager'] },
  { href: '/dashboard/campaign', label: 'Campaign',       icon: '🎯', roles: ['admin','manager'] },
  { href: '/dashboard/posting',  label: 'Tracking',       icon: '📝', roles: ['admin','manager'] },
  { href: '/dashboard/laporan',  label: 'Laporan',        icon: '📈', roles: ['admin','manager','finance'] },
]

const roleBadge = {
  admin:   'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  finance: 'bg-green-100 text-green-700',
  viewer:  'bg-gray-100 text-gray-700',
}

export default function Sidebar({ userProfile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const userRole = userProfile?.role || 'viewer'

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
      
      <div className="p-5 border-b border-gray-200">
        <div className="text-xl font-bold text-gray-800">📊 KOL Tracker</div>
        <div className="text-xs text-gray-500 mt-0.5">Affiliate Branding</div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {menuItems
          .filter(item => item.roles.includes(userRole))
          .map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  transition-colors duration-150
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="text-sm font-medium text-gray-800 truncate">
          {userProfile?.nama || 'User'}
        </div>
        <div className="text-xs text-gray-500 truncate mb-2">
          {userProfile?.email}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge[userRole]}`}>
          {userRole.toUpperCase()}
        </span>
        <button
          onClick={handleLogout}
          className="mt-3 w-full text-left text-xs text-gray-400 
                     hover:text-red-500 transition-colors"
        >
          → Keluar
        </button>
      </div>
    </aside>
  )
}