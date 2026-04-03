'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const statusBadge = {
  aktif:   'bg-green-100 text-green-700',
  selesai: 'bg-gray-100 text-gray-500',
  draft:   'bg-yellow-100 text-yellow-700',
}

export default function CampaignPage() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [form, setForm] = useState({
  nama: '', deskripsi: '', status: 'aktif', budget: 0
})

  useEffect(() => { fetchCampaigns() }, [])

  async function fetchCampaigns() {
    setLoading(true)
    const res = await fetch('/api/campaign')
    const data = await res.json()
    setCampaigns(data || [])
    setLoading(false)
  }

  function resetForm() {
    setForm({ nama: '', deskripsi: '', status: 'aktif' })
    setEditData(null)
    setShowForm(false)
  }

  function handleEdit(campaign) {
    setForm({
  nama: campaign.nama,
  deskripsi: campaign.deskripsi || '',
  status: campaign.status,
  budget: campaign.budget || 0
})
    setEditData(campaign)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (editData) {
      await fetch('/api/campaign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editData.id, ...form })
      })
    } else {
      await fetch('/api/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    }
    resetForm()
    fetchCampaigns()
  }

  async function handleDelete(id) {
    if (!confirm('Yakin hapus campaign ini? Semua data KOL dalam campaign akan terhapus.')) return
    await fetch(`/api/campaign?id=${id}`, { method: 'DELETE' })
    fetchCampaigns()
  }

  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Campaign</h1>
          <p className="text-gray-500 text-sm mt-0.5">{campaigns.length} campaign terdaftar</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 
                     rounded-lg text-sm font-medium transition-colors"
        >
          + Buat Campaign
        </button>
      </div>

      {/* Grid Campaign */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat data...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Belum ada campaign. Klik "Buat Campaign" untuk mulai.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(campaign => (
            <div key={campaign.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-lg">{campaign.nama}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[campaign.status]}`}>
                  {campaign.status}
                </span>
              </div>

              {campaign.deskripsi && (
                <p className="text-gray-500 text-sm mb-4">{campaign.deskripsi}</p>
              )}

              <div className="text-xs text-gray-400 mb-4">
                Dibuat: {new Date(campaign.created_at).toLocaleDateString('id-ID')}
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/dashboard/campaign/${campaign.id}`}
                  className="flex-1 text-center bg-blue-50 hover:bg-blue-100 text-blue-700 
                             px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Lihat Detail →
                </Link>
                <button
                  onClick={() => handleEdit(campaign)}
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 
                             rounded-lg text-xs border border-gray-200 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(campaign.id)}
                  className="text-red-500 hover:text-red-700 px-3 py-2 
                             rounded-lg text-xs border border-red-100 hover:bg-red-50"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">
                {editData ? 'Edit Campaign' : 'Buat Campaign Baru'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Campaign *</label>
                <input type="text" value={form.nama}
                  onChange={e => setForm({...form, nama: e.target.value})}
                  placeholder="Contoh: Ramadan 2025"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea value={form.deskripsi}
                  onChange={e => setForm({...form, deskripsi: e.target.value})}
                  placeholder="Deskripsi singkat campaign..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status}

                  onChange={e => setForm({...form, status: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="draft">Draft</option>
                  <option value="aktif">Aktif</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>
              <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Budget Campaign (Rp)
  </label>
  <input
    type="number"
    value={form.budget}
    onChange={e => setForm({...form, budget: e.target.value})}
    placeholder="Contoh: 10000000"
    min="0"
    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm 
               focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  {form.budget > 0 && (
    <p className="text-xs text-gray-400 mt-1">
      = {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(form.budget)}
    </p>
  )}
</div>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white 
                             font-medium rounded-lg py-2.5 text-sm transition-colors">
                  {editData ? 'Simpan' : 'Buat Campaign'}
                </button>
                <button type="button" onClick={resetForm}
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