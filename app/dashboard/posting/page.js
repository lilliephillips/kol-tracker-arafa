'use client'

import { useState, useEffect } from 'react'
import { format, isPast, isToday, differenceInDays } from 'date-fns'
import { id } from 'date-fns/locale'

const platformIcon = {
  tiktok: '🎵', instagram: '📸', youtube: '▶️'
}

export default function PostingPage() {
  const [postings, setPostings] = useState([])
  const [kols, setKols] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(null) // id posting
  const [linkInput, setLinkInput] = useState('')
const [scraping, setScraping] = useState(null) // id posting yang sedang discrape
const [engagementData, setEngagementData] = useState({}) // cache data engagement
  const [form, setForm] = useState({
    kol_id: '', tanggal_deadline: '', catatan: ''
  })

  useEffect(() => {
    fetchPostings()
    fetchKols()
  }, [filterStatus])

  async function fetchPostings() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)

    const res = await fetch(`/api/posting?${params}`)
    const data = await res.json()
    setPostings(data || [])
    setLoading(false)
  }

  async function fetchKols() {
    const res = await fetch('/api/kol?status=aktif')
    const data = await res.json()
    setKols(data || [])
  }

  async function handleTambahPosting(e) {
    e.preventDefault()
    await fetch('/api/posting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, status: 'belum' })
    })
    setForm({ kol_id: '', tanggal_deadline: '', catatan: '' })
    setShowForm(false)
    fetchPostings()
  }

  async function handleInputLink(postingId) {
    if (!linkInput.trim()) return
    await fetch('/api/posting', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postingId, link_posting: linkInput })
    })
    setShowLinkForm(null)
    setLinkInput('')
    fetchPostings()
  }

  async function handleDelete(id) {
    if (!confirm('Yakin hapus data posting ini?')) return
    await fetch(`/api/posting?id=${id}`, { method: 'DELETE' })
    fetchPostings()
  }

  function getDeadlineStatus(tanggal_deadline, status) {
    if (status === 'sudah') return null
    const deadline = new Date(tanggal_deadline)
    if (isToday(deadline)) return { label: 'Hari ini!', class: 'text-orange-600 font-bold' }
    if (isPast(deadline)) {
      const days = Math.abs(differenceInDays(new Date(), deadline))
      return { label: `Terlambat ${days} hari`, class: 'text-red-600 font-bold' }
    }
    const days = differenceInDays(deadline, new Date())
    if (days <= 3) return { label: `${days} hari lagi`, class: 'text-yellow-600 font-medium' }
    return { label: `${days} hari lagi`, class: 'text-gray-500' }
  }

  // Hitung statistik
  const totalBelum = postings.filter(p => p.status === 'belum').length
  const totalSudah = postings.filter(p => p.status === 'sudah').length
  const totalOverdue = postings.filter(p => 
    p.status === 'belum' && isPast(new Date(p.tanggal_deadline))
  ).length
async function handleScrape(postingId) {
  setScraping(postingId)
  try {
    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posting_id: postingId })
    })
    const result = await res.json()
    if (result.success) {
      setEngagementData(prev => ({
        ...prev,
        [postingId]: result.engagement
      }))
      alert('✅ Data berhasil diperbarui!')
    } else {
      alert('❌ Gagal: ' + result.error)
    }
  } catch (err) {
    alert('❌ Error: ' + err.message)
  }
  setScraping(null)
}
  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tracking Posting</h1>
          <p className="text-gray-500 text-sm mt-0.5">Monitor status posting KOL</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 
                     rounded-lg text-sm font-medium transition-colors"
        >
          + Tambah Posting
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-800">{totalSudah}</div>
          <div className="text-sm text-gray-500 mt-0.5">✅ Sudah Posting</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-yellow-600">{totalBelum}</div>
          <div className="text-sm text-gray-500 mt-0.5">⏳ Belum Posting</div>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="text-2xl font-bold text-red-600">{totalOverdue}</div>
          <div className="text-sm text-red-500 mt-0.5">🚨 Overdue / Terlambat</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-6">
        {[
          { value: '', label: 'Semua' },
          { value: 'belum', label: '⏳ Belum Posting' },
          { value: 'sudah', label: '✅ Sudah Posting' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filterStatus === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Tabel Posting */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">KOL</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Platform</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Deadline</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Sisa Waktu</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Link Posting</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
            ) : postings.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                Belum ada data posting.
              </td></tr>
            ) : (
              postings.map(posting => {
                const deadlineInfo = getDeadlineStatus(posting.tanggal_deadline, posting.status)
                const isOverdue = posting.status === 'belum' && isPast(new Date(posting.tanggal_deadline))

                return (
                  <tr key={posting.id}
                    className={`border-b border-gray-100 
                      ${isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {posting.kols?.nama}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">
                        {platformIcon[posting.kols?.platform]} {posting.kols?.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {posting.tanggal_deadline
                        ? format(new Date(posting.tanggal_deadline), 'dd MMM yyyy', { locale: id })
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {deadlineInfo && (
                        <span className={deadlineInfo.class}>{deadlineInfo.label}</span>
                      )}
                      {posting.status === 'sudah' && (
                        <span className="text-green-600">
                          Posting: {posting.tanggal_posting
                            ? format(new Date(posting.tanggal_posting), 'dd MMM yyyy', { locale: id })
                            : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${posting.status === 'sudah'
                          ? 'bg-green-100 text-green-700'
                          : isOverdue
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {posting.status === 'sudah' ? '✅ Sudah' : isOverdue ? '🚨 Overdue' : '⏳ Belum'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {posting.link_posting ? (
                        <a href={posting.link_posting} target="_blank"
                          className="text-blue-600 hover:underline text-xs">
                          Lihat Post →
                        </a>
                      ) : (
                        <div>
                          {showLinkForm === posting.id ? (
                            <div className="flex gap-2 items-center">
                              <input
                                type="url"
                                value={linkInput}
                                onChange={e => setLinkInput(e.target.value)}
                                placeholder="Paste URL..."
                                className="border border-gray-300 rounded px-2 py-1 text-xs w-40
                                           focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => handleInputLink(posting.id)}
                                className="bg-green-600 text-white px-2 py-1 rounded text-xs"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => { setShowLinkForm(null); setLinkInput('') }}
                                className="text-gray-400 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowLinkForm(posting.id)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                            >
                              + Input Link
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                   <td className="px-4 py-3">
  <div className="flex gap-2 flex-col">
    {posting.status === 'sudah' && (
      <button
        onClick={() => handleScrape(posting.id)}
        disabled={scraping === posting.id}
        className="text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-50"
      >
        {scraping === posting.id ? '⏳ Loading...' : '🔄 Refresh Data'}
      </button>
    )}
    <button
      onClick={() => handleDelete(posting.id)}
      className="text-red-500 hover:text-red-700 text-xs font-medium"
    >
      Hapus
    </button>
  </div>
</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah Posting */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Tambah Data Posting</h2>
            </div>
            <form onSubmit={handleTambahPosting} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih KOL *
                </label>
                <select
                  value={form.kol_id}
                  onChange={e => setForm({...form, kol_id: e.target.value})}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih KOL --</option>
                  {kols.map(kol => (
                    <option key={kol.id} value={kol.id}>
                      {platformIcon[kol.platform]} {kol.nama} (@{kol.handle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Deadline *
                </label>
                <input
                  type="date"
                  value={form.tanggal_deadline}
                  onChange={e => setForm({...form, tanggal_deadline: e.target.value})}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan
                </label>
                <textarea
                  value={form.catatan}
                  onChange={e => setForm({...form, catatan: e.target.value})}
                  placeholder="Contoh: Posting wajib tag @brand, gunakan hashtag #produk"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white 
                             font-medium rounded-lg py-2.5 text-sm transition-colors">
                  Tambah Posting
                </button>
                <button type="button"
                  onClick={() => { setShowForm(false); setForm({ kol_id: '', tanggal_deadline: '', catatan: '' }) }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 
                             font-medium rounded-lg py-2.5 text-sm transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}