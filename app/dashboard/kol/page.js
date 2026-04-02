'use client'

import { useState, useEffect } from 'react'

const PLATFORM_OPTIONS = ['tiktok', 'instagram', 'youtube']

const platformBadge = {
  tiktok:    'bg-black text-white',
  instagram: 'bg-pink-100 text-pink-700',
  youtube:   'bg-red-100 text-red-700',
}

const platformIcon = {
  tiktok:    '🎵',
  instagram: '📸',
  youtube:   '▶️',
}

export default function KolPage() {
  const [kols, setKols] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [form, setForm] = useState({
    nama: '', platform: 'tiktok', handle: '', niche: '',
    fee_kol: 0, biaya_produk: 0, nama_produk: '', status_aktif: true
  })

  useEffect(() => { fetchKols() }, [search, filterPlatform, filterStatus])

  async function fetchKols() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterPlatform) params.set('platform', filterPlatform)
    if (filterStatus) params.set('status', filterStatus)

    const res = await fetch(`/api/kol?${params}`)
    const data = await res.json()
    setKols(data || [])
    setLoading(false)
  }

  function resetForm() {
    setForm({
      nama: '', platform: 'tiktok', handle: '', niche: '',
      fee_kol: 0, biaya_produk: 0, nama_produk: '', status_aktif: true
    })
    setEditData(null)
    setShowForm(false)
  }

  function handleEdit(kol) {
    setForm({
      nama: kol.nama, platform: kol.platform, handle: kol.handle,
      niche: kol.niche || '', fee_kol: kol.fee_kol, biaya_produk: kol.biaya_produk,
      nama_produk: kol.nama_produk || '', status_aktif: kol.status_aktif
    })
    setEditData(kol)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      fee_kol: Number(form.fee_kol),
      biaya_produk: Number(form.biaya_produk),
    }

    if (editData) {
      await fetch('/api/kol', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editData.id, ...payload })
      })
    } else {
      await fetch('/api/kol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    }
    resetForm()
    fetchKols()
  }

  async function handleDelete(id) {
    if (!confirm('Yakin hapus KOL ini?')) return
    await fetch(`/api/kol?id=${id}`, { method: 'DELETE' })
    fetchKols()
  }

  function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(num)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kelola KOL</h1>
          <p className="text-gray-500 text-sm mt-0.5">{kols.length} KOL terdaftar</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Tambah KOL
        </button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="🔍 Cari nama KOL..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={filterPlatform}
          onChange={e => setFilterPlatform(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Platform</option>
          {PLATFORM_OPTIONS.map(p => (
            <option key={p} value={p}>{platformIcon[p]} {p}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Tidak Aktif</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Nama KOL</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Platform</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Handle</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Niche</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Fee KOL</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Biaya Produk</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Total</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
            ) : kols.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Belum ada KOL. Klik "Tambah KOL" untuk mulai.</td></tr>
            ) : (
              kols.map(kol => (
                <tr key={kol.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{kol.nama}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${platformBadge[kol.platform]}`}>
                      {platformIcon[kol.platform]} {kol.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">@{kol.handle}</td>
                  <td className="px-4 py-3 text-gray-600">{kol.niche || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatRupiah(kol.fee_kol)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatRupiah(kol.biaya_produk)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{formatRupiah(kol.total_biaya)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${kol.status_aktif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {kol.status_aktif ? '✓ Aktif' : '✗ Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(kol)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                      <button onClick={() => handleDelete(kol.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">
                {editData ? 'Edit KOL' : 'Tambah KOL Baru'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama KOL *</label>
                <input type="text" value={form.nama} onChange={e => setForm({...form, nama: e.target.value})}
                  placeholder="Contoh: Budi Santoso" required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform *</label>
                  <select value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {PLATFORM_OPTIONS.map(p => <option key={p} value={p}>{platformIcon[p]} {p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Handle/Username *</label>
                  <input type="text" value={form.handle} onChange={e => setForm({...form, handle: e.target.value})}
                    placeholder="tanpa @" required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niche</label>
                <input type="text" value={form.niche} onChange={e => setForm({...form, niche: e.target.value})}
                  placeholder="Contoh: Beauty, Lifestyle, Food"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fee KOL (Rp)</label>
                  <input type="number" value={form.fee_kol} onChange={e => setForm({...form, fee_kol: e.target.value})}
                    placeholder="0" min="0"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Produk (Rp)</label>
                  <input type="number" value={form.biaya_produk} onChange={e => setForm({...form, biaya_produk: e.target.value})}
                    placeholder="0" min="0"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg px-4 py-3">
                <span className="text-sm text-blue-700 font-medium">
                  Total Biaya: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(form.fee_kol) + Number(form.biaya_produk))}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk yang Dikirim</label>
                <input type="text" value={form.nama_produk} onChange={e => setForm({...form, nama_produk: e.target.value})}
                  placeholder="Contoh: Serum Vitamin C 30ml"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="status_aktif" checked={form.status_aktif}
                  onChange={e => setForm({...form, status_aktif: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-300" />
                <label htmlFor="status_aktif" className="text-sm text-gray-700">KOL Aktif</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2.5 text-sm transition-colors">
                  {editData ? 'Simpan Perubahan' : 'Tambah KOL'}
                </button>
                <button type="button" onClick={resetForm}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg py-2.5 text-sm transition-colors">
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