// Hitung CPM = (Total Biaya / Total Views) × 1000
export function hitungCPM(totalBiaya, totalViews) {
  if (!totalViews || totalViews === 0) return 0
  return (totalBiaya / totalViews) * 1000
}

// Kategori CPM dengan warna
export function kategoriCPM(cpm) {
  if (cpm === 0) return { label: 'Belum ada data', class: 'bg-gray-100 text-gray-500' }
  if (cpm < 50000) return { label: '✅ Efisien', class: 'bg-green-100 text-green-700' }
  if (cpm <= 150000) return { label: '⚠️ Normal', class: 'bg-yellow-100 text-yellow-700' }
  return { label: '🔴 Mahal', class: 'bg-red-100 text-red-700' }
}

// Format angka CPM ke Rupiah
export function formatCPM(cpm) {
  if (!cpm || cpm === 0) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(cpm)
}