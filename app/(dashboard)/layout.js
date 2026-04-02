import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users_profile')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userProfile={profile} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}