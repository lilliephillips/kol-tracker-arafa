'use client'

// Komponen ini membungkus fitur yang hanya boleh dilihat role tertentu
// Contoh pakai: <RoleGuard roles={['admin', 'manager']}><TombolHapus /></RoleGuard>

export default function RoleGuard({ children, roles, userRole }) {
  if (!roles.includes(userRole)) {
    return null // Tidak tampilkan apapun kalau role tidak sesuai
  }
  return <>{children}</>
}