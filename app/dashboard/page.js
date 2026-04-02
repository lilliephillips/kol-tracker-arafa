'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { kategoriCPM, formatCPM, hitungCPM } from '@/lib/cpm'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [kols, setKols] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // Ambil semua KOL
      const kolRes = await fetch('/api/kol')
      const kolData = await kolRes.json()
      
      // Ambil semua posting
      const postRes = await fetch('/api/posting')
      const postData = await postRes.json()

      // Ambil engagement terbaru per posting
      const engRes = await fetch('/api/scrape')
      const engData = await engRes.json()

      // Hitung statistik
      const totalKol = kolData?.length || 0
      const kolAktif = kolData?.filter(k => k.status_aktif)?.length || 0
      const totalBudget = kolData?.reduce((sum, k) => sum + (k.total_biaya || 0), 0) || 0
      const sudahPosting = postData?.filter(p => p.status === 'sudah')?.length || 0
      const totalPosting = postData?.length || 0
      const pctPosting = totalPosting > 0 ? Math.round((sudahPosting / totalPosting) * 100) : 0

      // Hitung rata-rata CPM
      const cpms = engData?.filter(e => e.cpm > 0)?.map(e => e.cpm) || []
      const avgCpm = cpms.length > 0 ? cpms.reduce((a, b) => a + b, 0) / cpms.length : 0

      // Data KOL dengan engagement terbaru
      const kolsWithEng = await Promise.all(
        (kolData || []).map(async (kol) => {
          const posting = postData?.find(p => p.kol_id === kol.id && p.status === 'sudah')
          if (!posting) return { ...kol, views: 0, cpm: 0 }
          
          const eng = engData?.find(e => e.posting_id === posting.id)
          const cpm = eng ? eng.cpm : hitungCPM(kol.total_biaya, eng?.views || 0)
          return { ...kol, views: eng?.views || 0, likes: eng?.likes || 0, cpm: cpm || 0, posting }
        })
      )

      setStats({ totalKol, kolAktif, totalBudget, sudahPosting, totalPosting, pctPosting, avgCpm })
      setKols(kolsWithEng)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR',
      minimumFractionDigits: 0, notation: 'compact'
    }).format(num)
  }

  if (loading) return (
    <div className="p-8 text-gray-400">Memuat dashboard...</div>
  )

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Overview performa KOL Affiliate Branding</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-blue-600">{stats?.kolAktif}</div>
          <div className="text-sm text-gray-500 mt-1">👥 KOL Aktif</div>
          <div className="text-xs text-gray-400 mt-0.5">dari {stats?.totalKol} total</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-purple-600">{formatRupiah(stats?.totalBudget)}</div>
          <div className="text-sm text-gray-500 mt-1">💰 Total Budget</div>
          <div className="text-xs text-gray-400 mt-0.5">semua KOL aktif</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-green-600">{stats?.pctPosting}%</div>
          <div className="text-sm text-gray-500 mt-1">✅ Sudah Posting</div>
          <div className="text-xs text-gray-400 mt-0.5">{stats?.sudahPosting} dari {stats?.totalPosting}</div>
        </div>
        <div className={`rounded-xl border p-5 ${
          stats?.avgCpm === 0 ? 'bg-white border-gray-200' :
          stats?.avgCpm < 50000 ? 'bg-green-50 border-green-200' :
          stats?.avgCpm <= 150000 ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className={`text-3xl font-bold ${
            stats?.avgCpm === 0 ? 'text-gray-400' :
            stats?.avgCpm < 50000 ? 'text-green-600' :
            stats?.avgCpm <= 150000 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {stats?.avgCpm === 0 ? '-' : formatCPM(stats?.avgCpm)}
          </div>
          <div className="text-sm text-gray-500 mt-1">📊 Rata-rata CPM</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {stats?.avgCpm === 0 ? 'Belum ada data' :
             stats?.avgCpm < 50000 ? '✅ Efisien' :
             stats?.avgCpm <= 150000 ? '⚠️ Normal' : '🔴 Mahal'}
          </div>
        </div>
      </div>

      {/* Tabel KOL dengan CPM */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Performa KOL</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Nama KOL</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Platform</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Total Biaya</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Views</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Likes</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">CPM</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {kols.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada data KOL</td></tr>
            ) : kols.map(kol => {
              const cpmInfo = kategoriCPM(kol.cpm)
              return (
                <tr key={kol.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{kol.nama}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{kol.platform}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(kol.total_biaya)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {kol.views > 0 ? kol.views.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {kol.likes > 0 ? kol.likes.toLocaleString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {kol.cpm > 0 ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cpmInfo.class}`}>
                        {formatCPM(kol.cpm)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Belum ada data</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                      ${kol.status_aktif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {kol.status_aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}