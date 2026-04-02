'use client'

import { useState, useEffect } from 'react'

export default function ProdukPage() {
  const [produkList, setProdukList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [showVariasiForm, setShowVariasiForm] = useState(null)

  const [form, setForm] = useState({ nama_brand: '', deskripsi: '', aktif: true })
  const [variasiForm, setVariasiForm] = useState({ nama_variasi: '', ukuran: '', warna: '', hpp: 0 })

  useEffect(() => { fetchProduk() }, [])

  async function fetchProduk() {
    setLoading(true)
    const res = await fetch('/api/produk')
    const data = await res.json()
    setProdukList(data || [])
    setLoading(false)
  }

  function resetForm() {
    setForm({ nama_brand: '', deskripsi: '', aktif: true })
    setEditData(null)
    setShowForm(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (editData) {
      await fetch('/api/produk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editData.id, ...form })
      })
    } else {
      await fetch('/api/produk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, variasi: [] })
      })
    }
    resetForm()
    fetchProduk()
  }

  async function handleTambahVariasi(produkId) {
    await fetch('/api/produk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: produkId,
        variasi: [variasiForm]
      })
    })

    // Simpan variasi langsung
    await fetch('/api/produk/variasi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produk_id: produkId, ...variasiForm })
    })

    setVariasiForm({ nama_variasi: '', ukuran: '', warna: '', hpp: 0 })
    setShowVariasiForm(null)
    fetchProduk()
  }

  async function handleHapusVariasi(variasiId) {
    if (!confirm('Hapus variasi ini?')) return
    await fetch(`/api/produk?variasi_id=${variasiId}`, { method: 'DELETE' })
    fetchProduk()
  }

  async function handleHapusProduk(id) {
    if (!confirm('Hapus produk ini beserta semua variasinya?')) return
    await fetch(`/api/produk?id=${id}`, { method: 'DELETE' })
    fetchProduk()
  }

  function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(num || 0)
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Master Produk</h1>
          <p className="text-gray-500 text-sm mt-0.5">{produkList.length} produk terdaftar</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 
                     rounded-lg text-sm font-medium transition-colors">
          + Tambah Produk
        </button>
      </div>

      {/* List Produk */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat data...</div>
      ) : produkList.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Belum ada produk. Klik "Tambah Produk" untuk mulai.
        </div>
      ) : (
        <div className="space-y-4">
          {produkList.map(produk => (
            <div key={produk.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              
              {/* Header Produk */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{produk.nama_brand}</h3>
                  {produk.deskripsi && <p className="text-gray-500 text-sm">{produk.deskripsi}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowVariasiForm(produk.id)}
                    className="bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 
                               rounded-lg text-xs font-medium transition-colors">
                    + Tambah Variasi
                  </button>
                  <button
                    onClick={() => { setEditData(produk); setForm({ nama_brand: produk.nama_brand, deskripsi: produk.deskripsi || '', aktif: produk.aktif }); setShowForm(true) }}
                    className="text-gray-500 hover:text-gray-700 px-3 py-1.5 
                               rounded-lg text-xs border border-gray-200">
                    Edit
                  </button>
                  <button
                    onClick={() => handleHapusProduk(produk.id)}
                    className="text-red-500 hover:text-red-700 px-3 py-1.5 
                               rounded-lg text-xs border border-red-100">
                    Hapus
                  </button>
                </div>
              </div>

              {/* Form Tambah Variasi */}
              {showVariasiForm === produk.id && (
                <div className="px-6 py-4 bg-green-50 border-b border-green-100">
                  <h4 className="text-sm font-medium text-green-800 mb-3">Tambah Variasi Baru</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <input type="text" placeholder="Nama Variasi *"
                      value={variasiForm.nama_variasi}
                      onChange={e => setVariasiForm({...variasiForm, nama_variasi: e.target.value})}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm 
                                 focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <input type="text" placeholder="Ukuran (opsional)"
                      value={variasiForm.ukuran}
                      onChange={e => setVariasiForm({...variasiForm, ukuran: e.target.value})}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm 
                                 focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <input type="text" placeholder="Warna (opsional)"
                      value={variasiForm.warna}
                      onChange={e => setVariasiForm({...variasiForm, warna: e.target.value})}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm 
                                 focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <input type="number" placeholder="HPP (Rp)"
                      value={variasiForm.hpp}
                      onChange={e => setVariasiForm({...variasiForm, hpp: e.target.value})}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm 
                                 focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <div className="flex gap-2">
                      <button onClick={() => handleTambahVariasi(produk.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white 
                                   rounded-lg py-2 text-xs font-medium">
                        Simpan
                      </button>
                      <button onClick={() => setShowVariasiForm(null)}
                        className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 
                                   rounded-lg text-xs">
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabel Variasi */}
              {produk.produk_variasi && produk.produk_variasi.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-2 text-gray-500 font-medium text-xs">Nama Variasi</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium text-xs">Ukuran</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium text-xs">Warna</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium text-xs">HPP</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-medium text-xs">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produk.produk_variasi.map(v => (
                      <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-2.5 font-medium text-gray-700">{v.nama_variasi}</td>
                        <td className="px-4 py-2.5 text-gray-500">{v.ukuran || '-'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{v.warna || '-'}</td>
                        <td className="px-4 py-2.5 text-gray-700 font-medium">{formatRupiah(v.hpp)}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => handleHapusVariasi(v.id)}
                            className="text-red-500 hover:text-red-700 text-xs">
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-6 py-4 text-gray-400 text-sm">
                  Belum ada variasi. Klik "+ Tambah Variasi".
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Produk */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">
                {editData ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
                <input type="text" value={form.nama_brand}
                  onChange={e => setForm({...form, nama_brand: e.target.value})}
                  placeholder="Contoh: Livia, Scarlett, dll"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea value={form.deskripsi}
                  onChange={e => setForm({...form, deskripsi: e.target.value})}
                  placeholder="Deskripsi produk..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="aktif_produk" checked={form.aktif}
                  onChange={e => setForm({...form, aktif: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-300" />
                <label htmlFor="aktif_produk" className="text-sm text-gray-700">Produk Aktif</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white 
                             font-medium rounded-lg py-2.5 text-sm transition-colors">
                  {editData ? 'Simpan' : 'Tambah Produk'}
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