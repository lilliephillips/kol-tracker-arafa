'use client'

import { useState, useEffect } from 'react'

const PLATFORM_OPTIONS = ['tiktok', 'instagram', 'youtube']
const platformIcon = { tiktok: '🎵', instagram: '📸', youtube: '▶️' }
const platformBadge = {
  tiktok: 'bg-black text-white',
  instagram: 'bg-pink-100 text-pink-700',
  youtube: 'bg-red-100 text-red-700',
}

export default function KolPage() {
  const [kols, setKols] = useState([])
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
const [provinsiList, setProvinsiList] = useState([])
const [kotaList, setKotaList] = useState([])
const [kecamatanList, setKecamatanList] = useState([])
const [loadingWilayah, setLoadingWilayah] = useState(false)
const [selectedProvinsiId, setSelectedProvinsiId] = useState('')
const [selectedKotaId, setSelectedKotaId] = useState('')
  const [form, setForm] = useState({
  nama: '', handle: '', platform: 'tiktok', no_wa: '',
  provinsi: '', kota_kab: '', kecamatan: '', alamat_lengkap: '',
  catatan: '', ditambahkan_oleh: '', status_aktif: true
})

  useEffect(() => { fetchAll() }, [search, filterPlatform, filterStatus])

  async function fetchAll() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filterPlatform) params.set('platform', filterPlatform)
    if (filterStatus) params.set('status', filterStatus)

    const [kolRes, userRes, meRes] = await Promise.all([
      fetch('/api/kol?' + params),
      fetch('/api/users'),
      fetch('/api/me'),
    ])
    

    const [kolData, userData, meData] = await Promise.all([
      kolRes.json(),
      userRes.json(),
      meRes.json(),
    ])

    setKols(Array.isArray(kolData) ? kolData : [])
    setUsers(Array.isArray(userData) ? userData : [])
    setCurrentUser(meData)
    setLoading(false)
  }

  useEffect(() => { fetchProvinsi() }, [])

async function fetchProvinsi() {
  try {
    const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
    const data = await res.json()
    setProvinsiList(data || [])
  } catch (err) {
    console.error('Error fetch provinsi:', err)
  }
}

async function fetchKota(provinsiId) {
  setKotaList([])
  setKecamatanList([])
  setForm(prev => ({ ...prev, kota_kab: '', kecamatan: '' }))
  if (!provinsiId) return
  try {
    setLoadingWilayah(true)
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinsiId}.json`)
    const data = await res.json()
    setKotaList(data || [])
  } catch (err) {
    console.error('Error fetch kota:', err)
  }
  setLoadingWilayah(false)
}

async function fetchKecamatan(kotaId) {
  setKecamatanList([])
  setForm(prev => ({ ...prev, kecamatan: '' }))
  if (!kotaId) return
  try {
    setLoadingWilayah(true)
    const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${kotaId}.json`)
    const data = await res.json()
    setKecamatanList(data || [])
  } catch (err) {
    console.error('Error fetch kecamatan:', err)
  }
  setLoadingWilayah(false)
}

function resetForm() {
  setForm({
    nama: '', handle: '', platform: 'tiktok', no_wa: '',
    provinsi: '', kota_kab: '', kecamatan: '', alamat_lengkap: '',
    catatan: '', ditambahkan_oleh: '', status_aktif: true
  })
  setSelectedProvinsiId('')
  setSelectedKotaId('')
  setKotaList([])
  setKecamatanList([])
  setEditData(null)
  setShowForm(false)
}
  

  

 function handleEdit(kol) {
  setForm({
    nama: kol.nama || '',
    handle: kol.handle || '',
    platform: kol.platform || 'tiktok',
    no_wa: kol.no_wa || '',
    provinsi: kol.provinsi || '',
    kota_kab: kol.kota_kab || '',
    kecamatan: kol.kecamatan || '',
    alamat_lengkap: kol.alamat_lengkap || '',
    catatan: kol.catatan || '',
    ditambahkan_oleh: kol.ditambahkan_oleh || '',
    status_aktif: kol.status_aktif
  })
  setSelectedProvinsiId('')
  setSelectedKotaId('')
  setEditData(kol)
  setShowForm(true)
}

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form }
    if (!payload.ditambahkan_oleh) {
      payload.ditambahkan_oleh = currentUser?.id
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
    fetchAll()
  }

  async function handleDelete(id) {
    if (!confirm('Yakin hapus KOL ini?')) return
    await fetch('/api/kol?id=' + id, { method: 'DELETE' })
    fetchAll()
  }

  function formatWA(no) {
    if (!no) return '-'
    return no.startsWith('62') ? '0' + no.slice(2) : no
  }

  function openWA(no) {
    if (!no) return
    window.open('https://wa.me/' + no, '_blank')
  }

  function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(num || 0)
  }

  const isAdmin = currentUser?.role === 'admin'

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola KOL</h1>
          <p className="text-gray-600 text-sm mt-0.5">{kols.length} KOL terdaftar</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Tambah KOL
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input type="text" placeholder="🔍 Cari nama KOL..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Platform</option>
          {PLATFORM_OPTIONS.map(p => <option key={p} value={p}>{platformIcon[p]} {p}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Tidak Aktif</option>
        </select>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Nama KOL</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Platform</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Handle</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">No WhatsApp</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Kota/Kab</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Handle By</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Status</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500">Memuat data...</td></tr>
            ) : kols.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500">Belum ada KOL.</td></tr>
            ) : kols.map(kol => (
              <tr key={kol.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900">{kol.nama}</td>
                <td className="px-4 py-3">
                  <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (platformBadge[kol.platform] || '')}>
                    {platformIcon[kol.platform]} {kol.platform}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">@{kol.handle}</td>
                <td className="px-4 py-3 text-gray-700">{formatWA(kol.no_wa) || '-'}</td>
                <td className="px-4 py-3 text-gray-700">{kol.kota_kab || '-'}</td>
                <td className="px-4 py-3 text-gray-700">
                  {kol.ditambahkan_oleh_profile?.nama || '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' +
                    (kol.status_aktif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                    {kol.status_aktif ? '✓ Aktif' : '✗ Nonaktif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {kol.no_wa && (
                      <button onClick={() => openWA(kol.no_wa)}
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                        WA
                      </button>
                    )}
                    <button onClick={() => handleEdit(kol)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(kol.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium">
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editData ? 'Edit KOL' : 'Tambah KOL Baru'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Nama KOL *</label>
                <input type="text" value={form.nama}
                  onChange={e => setForm({...form, nama: e.target.value})}
                  placeholder="Nama lengkap KOL" required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Platform *</label>
                  <select value={form.platform}
                    onChange={e => setForm({...form, platform: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {PLATFORM_OPTIONS.map(p => <option key={p} value={p}>{platformIcon[p]} {p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Username/Handle *</label>
                  <input type="text" value={form.handle}
                    onChange={e => setForm({...form, handle: e.target.value})}
                    placeholder="tanpa @" required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">No WhatsApp</label>
                <input type="text" value={form.no_wa}
                  onChange={e => setForm({...form, no_wa: e.target.value})}
                  placeholder="08xx / 62xx / +62xx"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-500 mt-1">Format 08, 62, atau +62 akan otomatis dikenali</p>
              </div>

              {/* Alamat - Opsional */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
  <p className="text-sm font-semibold text-gray-700">📍 Alamat (Opsional)</p>
  
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">Provinsi</label>
    <select value={selectedProvinsiId}
      onChange={e => {
        const selected = provinsiList.find(p => p.id === e.target.value)
        setSelectedProvinsiId(e.target.value)
        setForm({...form, provinsi: selected?.name || '', kota_kab: '', kecamatan: ''})
        fetchKota(e.target.value)
      }}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
      <option value="">-- Pilih Provinsi --</option>
      {provinsiList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  </div>

  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Kota/Kabupaten {loadingWilayah && <span className="text-gray-400 text-xs">Loading...</span>}
      </label>
      <select value={selectedKotaId}
        onChange={e => {
          const selected = kotaList.find(k => k.id === e.target.value)
          setSelectedKotaId(e.target.value)
          setForm({...form, kota_kab: selected?.name || '', kecamatan: ''})
          fetchKecamatan(e.target.value)
        }}
        disabled={kotaList.length === 0}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400">
        <option value="">-- Pilih Kota/Kab --</option>
        {kotaList.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
      </select>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Kecamatan {loadingWilayah && <span className="text-gray-400 text-xs">Loading...</span>}
      </label>
      <select value={form.kecamatan}
        onChange={e => setForm({...form, kecamatan: e.target.value})}
        disabled={kecamatanList.length === 0}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400">
        <option value="">-- Pilih Kecamatan --</option>
        {kecamatanList.map(k => <option key={k.id} value={k.name}>{k.name}</option>)}
      </select>
    </div>
  </div>

  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">Alamat Lengkap</label>
    <textarea value={form.alamat_lengkap || ''}
      onChange={e => setForm({...form, alamat_lengkap: e.target.value})}
      placeholder="Contoh: Jl. Merdeka No. 10 RT 01/RW 02"
      rows={2}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
  </div>
</div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Catatan</label>
                <textarea value={form.catatan}
                  onChange={e => setForm({...form, catatan: e.target.value})}
                  placeholder="Catatan tentang KOL ini..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {/* Ditambahkan Oleh */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Ditambahkan Oleh</label>
                {isAdmin ? (
                  <select value={form.ditambahkan_oleh}
                    onChange={e => setForm({...form, ditambahkan_oleh: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Pilih User --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.nama} ({u.role})</option>)}
                  </select>
                ) : (
                  <input type="text" value={currentUser?.nama || ''} disabled
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 bg-gray-50" />
                )}
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="kol_aktif" checked={form.status_aktif}
                  onChange={e => setForm({...form, status_aktif: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-300" />
                <label htmlFor="kol_aktif" className="text-sm font-medium text-gray-800">KOL Aktif</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2.5 text-sm">
                  {editData ? 'Simpan Perubahan' : 'Tambah KOL'}
                </button>
                <button type="button" onClick={resetForm}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg py-2.5 text-sm">
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
