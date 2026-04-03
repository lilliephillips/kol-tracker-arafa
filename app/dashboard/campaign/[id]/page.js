'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { formatCPM, kategoriCPM } from '@/lib/cpm'
import * as XLSX from 'xlsx'

const platformIcon = { tiktok: '🎵', instagram: '📸', youtube: '▶️' }

export default function CampaignDetailPage() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [kols, setKols] = useState([])
  const [allKols, setAllKols] = useState([])
  const [produkList, setProdukList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddKol, setShowAddKol] = useState(false)
  const [editKol, setEditKol] = useState(null)
  const [selectedProduk, setSelectedProduk] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(null)
  const dropdownRef = useRef(null)

  const [formKol, setFormKol] = useState({
    kol_id: '', fee_kol: 0, produk_variasi_id: '',
    hpp_satuan: 0, quantity: 1, ongkos_kirim: 0,
    kota: '', tanggal_kirim_barang: '', catatan: ''
  })

  useEffect(() => {
    fetchDetail()
    fetchAllKols()
    fetchProduk()
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [id])

  function handleClickOutside(e) {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setDropdownOpen(null)
    }
  }

  async function fetchDetail() {
    setLoading(true)
    const res = await fetch('/api/campaign?id=' + id)
    const data = await res.json()
    setCampaign(data.campaign)
    setKols(data.kols || [])
    setLoading(false)
  }

  async function fetchAllKols() {
    const res = await fetch('/api/kol')
    const data = await res.json()
    setAllKols(Array.isArray(data) ? data : [])
  }

  async function fetchProduk() {
    const res = await fetch('/api/produk')
    const data = await res.json()
    setProdukList(Array.isArray(data) ? data : [])
  }

  function handlePilihProduk(produkId) {
    const produk = produkList.find(p => p.id === produkId)
    setSelectedProduk(produk || null)
    setFormKol({ ...formKol, produk_variasi_id: '', hpp_satuan: 0 })
  }

  function handlePilihVariasi(variasiId) {
    const variasi = selectedProduk?.produk_variasi?.find(v => v.id === variasiId)
    setFormKol({ ...formKol, produk_variasi_id: variasiId, hpp_satuan: variasi?.hpp || 0 })
  }

  function handlePilihKol(kolId) {
    const kol = allKols.find(k => k.id === kolId)
    setFormKol({
      ...formKol,
      kol_id: kolId,
      kota: kol?.kota_kab || ''
    })
  }

  const totalSpendingPreview =
    Number(formKol.fee_kol) +
    (Number(formKol.hpp_satuan) * Number(formKol.quantity)) +
    Number(formKol.ongkos_kirim)

  async function handleAddKol(e) {
    e.preventDefault()
    try {
      const payload = {
        campaign_id: id,
        kol_id: formKol.kol_id,
        fee_kol: Number(formKol.fee_kol) || 0,
        produk_variasi_id: formKol.produk_variasi_id || null,
        hpp_satuan: Number(formKol.hpp_satuan) || 0,
        quantity: Number(formKol.quantity) || 1,
        ongkos_kirim: Number(formKol.ongkos_kirim) || 0,
        kota: formKol.kota || '',
        tanggal_kirim_barang: formKol.tanggal_kirim_barang || null,
        catatan: formKol.catatan || '',
        hpp_total: (Number(formKol.hpp_satuan) || 0) * (Number(formKol.quantity) || 1)
      }

      const method = editKol ? 'PUT' : 'POST'
      const body = editKol ? { id: editKol.id, ...payload } : payload

      const res = await fetch('/api/campaign/kol', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await res.json()
      if (result.error) { alert('Error: ' + result.error); return }

      resetForm()
      fetchDetail()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  function resetForm() {
    setFormKol({
      kol_id: '', fee_kol: 0, produk_variasi_id: '',
      hpp_satuan: 0, quantity: 1, ongkos_kirim: 0,
      kota: '', tanggal_kirim_barang: '', catatan: ''
    })
    setSelectedProduk(null)
    setEditKol(null)
    setShowAddKol(false)
  }

  function handleEditKol(ck) {
    setFormKol({
      kol_id: ck.kol_id,
      fee_kol: ck.fee_kol || 0,
      produk_variasi_id: ck.produk_variasi_id || '',
      hpp_satuan: ck.hpp_satuan || 0,
      quantity: ck.quantity || 1,
      ongkos_kirim: ck.ongkos_kirim || 0,
      kota: ck.kota || '',
      tanggal_kirim_barang: ck.tanggal_kirim_barang || '',
      catatan: ck.catatan || ''
    })
    if (ck.produk_variasi) {
      const produk = produkList.find(p =>
        p.produk_variasi?.some(v => v.id === ck.produk_variasi_id)
      )
      setSelectedProduk(produk || null)
    }
    setEditKol(ck)
    setShowAddKol(true)
    setDropdownOpen(null)
  }

  async function handleRemoveKol(ckId) {
    if (!confirm('Hapus KOL dari campaign ini?')) return
    await fetch('/api/campaign/kol?id=' + ckId, { method: 'DELETE' })
    setDropdownOpen(null)
    fetchDetail()
  }

  function handleFollowUpWA(ck) {
    const noWa = ck.kols?.no_wa
    if (!noWa) { alert('KOL ini belum punya nomor WhatsApp'); return }
    window.open('https://wa.me/' + noWa, '_blank')
    setDropdownOpen(null)
  }

  function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(num || 0)
  }

  function formatNumber(num) {
    if (!num) return '-'
    return new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(num)
  }

  function hitungER(likes, komentar, views) {
    if (!views || views === 0) return null
    return ((( likes || 0) + (komentar || 0)) / views * 100).toFixed(2)
  }

  // Hitung statistik
  const totalSpending = kols.reduce((sum, ck) => sum + (ck.total_spending || 0), 0)
  const totalBudget = campaign?.budget || 0
  const pctBudget = totalBudget > 0 ? Math.min((totalSpending / totalBudget) * 100, 100) : 0
  const totalViews = kols.reduce((sum, ck) => sum + (ck.engagement?.views || 0), 0)
  const totalLikes = kols.reduce((sum, ck) => sum + (ck.engagement?.likes || 0), 0)
  const totalKomentar = kols.reduce((sum, ck) => sum + (ck.engagement?.komentar || 0), 0)
  const targetImpresi = campaign?.target_impressi || 0
  const pctImpresi = targetImpresi > 0 ? Math.min((totalViews / targetImpresi) * 100, 100) : 0
  const erCampaign = totalViews > 0 ? ((totalLikes + totalKomentar) / totalViews * 100).toFixed(2) : null
  const cpmCampaign = totalViews > 0 ? (totalSpending / totalViews) * 1000 : 0

  function handleExport() {
    const exportData = kols.map(ck => ({
      'Kode Unik': ck.kode_unik || '-',
      'Nama KOL': ck.kols?.nama,
      'Platform': ck.kols?.platform,
      'Produk': ck.produk_variasi?.nama_variasi || '-',
      'Fee KOL': ck.fee_kol || 0,
      'HPP Satuan': ck.hpp_satuan || 0,
      'Quantity': ck.quantity || 1,
      'Total HPP': ck.hpp_total || 0,
      'Ongkos Kirim': ck.ongkos_kirim || 0,
      'Total Spending': ck.total_spending || 0,
      'Kota': ck.kota || '-',
      'Tanggal Kirim': ck.tanggal_kirim_barang || '-',
      'Views': ck.engagement?.views || 0,
      'Likes': ck.engagement?.likes || 0,
      'Komentar': ck.engagement?.komentar || 0,
      'ER (%)': hitungER(ck.engagement?.likes, ck.engagement?.komentar, ck.engagement?.views) || 0,
      'CPM': ck.engagement?.cpm || 0,
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, campaign?.nama || 'Campaign')
    XLSX.writeFile(wb, 'Laporan_' + (campaign?.nama || 'Campaign') + '.xlsx')
  }

  if (loading) return <div className="p-8 text-gray-500">Memuat data campaign...</div>

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500 mb-1">
            ← <a href="/dashboard/campaign" className="hover:text-blue-600 text-gray-600">Semua Campaign</a>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{campaign?.nama}</h1>
          {campaign?.deskripsi && <p className="text-gray-600 text-sm mt-1">{campaign.deskripsi}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            📥 Export Excel
          </button>
          <button onClick={() => setShowAddKol(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Tambah KOL
          </button>
        </div>
      </div>

      {/* Progress Bar Budget */}
      {totalBudget > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-800">💰 Budget Campaign</span>
            <span className="text-sm font-medium text-gray-700">{formatRupiah(totalSpending)} / {formatRupiah(totalBudget)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className={'h-3 rounded-full transition-all ' +
              (pctBudget >= 90 ? 'bg-red-500' : pctBudget >= 70 ? 'bg-yellow-500' : 'bg-green-500')}
              style={{ width: pctBudget + '%' }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className={'text-xs font-medium ' +
              (pctBudget >= 90 ? 'text-red-600' : pctBudget >= 70 ? 'text-yellow-600' : 'text-green-600')}>
              {pctBudget.toFixed(1)}% terpakai
            </span>
            <span className="text-xs text-gray-500">Sisa: {formatRupiah(totalBudget - totalSpending)}</span>
          </div>
        </div>
      )}

      {/* Progress Bar Target Impressi */}
      {targetImpresi > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-800">👁️ Target Impressi</span>
            <span className="text-sm font-medium text-gray-700">
              {new Intl.NumberFormat('id-ID').format(totalViews)} / {new Intl.NumberFormat('id-ID').format(targetImpresi)}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className={'h-3 rounded-full transition-all ' +
              (pctImpresi >= 100 ? 'bg-green-500' : pctImpresi >= 50 ? 'bg-blue-500' : 'bg-yellow-500')}
              style={{ width: pctImpresi + '%' }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className={'text-xs font-medium ' +
              (pctImpresi >= 100 ? 'text-green-600' : pctImpresi >= 50 ? 'text-blue-600' : 'text-yellow-600')}>
              {pctImpresi.toFixed(1)}% tercapai
            </span>
            <span className="text-xs text-gray-500">
              Sisa: {new Intl.NumberFormat('id-ID').format(Math.max(0, targetImpresi - totalViews))} views
            </span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-blue-600">{kols.length}</div>
          <div className="text-sm font-medium text-gray-700 mt-1">👥 Total KOL</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-purple-600">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, notation: 'compact' }).format(totalSpending)}
          </div>
          <div className="text-sm font-medium text-gray-700 mt-1">💸 Total Spending</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-3xl font-bold text-green-600">{formatNumber(totalViews)}</div>
          <div className="text-sm font-medium text-gray-700 mt-1">👁️ Total Views</div>
        </div>
        {erCampaign ? (
          <div className={'rounded-xl border p-5 ' +
            (Number(erCampaign) > 3 ? 'bg-green-50 border-green-200' :
             Number(erCampaign) >= 1 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200')}>
            <div className={'text-3xl font-bold ' +
              (Number(erCampaign) > 3 ? 'text-green-600' :
               Number(erCampaign) >= 1 ? 'text-yellow-600' : 'text-red-600')}>
              {erCampaign}%
            </div>
            <div className="text-sm font-medium text-gray-700 mt-1">📊 Engagement Rate</div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-3xl font-bold text-gray-400">-</div>
            <div className="text-sm font-medium text-gray-700 mt-1">📊 Engagement Rate</div>
          </div>
        )}
      </div>

      {/* Tabel KOL */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Daftar KOL dalam Campaign</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Kode Unik</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">KOL</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Produk</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Fee KOL</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">HPP × Qty</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Ongkir</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Total Spending</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Kota</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Kirim Barang</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Views</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Likes</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Komentar</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">ER</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">CPM</th>
              <th className="text-left px-4 py-3 text-gray-700 font-semibold whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {kols.length === 0 ? (
              <tr><td colSpan={15} className="text-center py-12 text-gray-500">Belum ada KOL. Klik "+ Tambah KOL".</td></tr>
            ) : kols.map(ck => {
              const er = hitungER(ck.engagement?.likes, ck.engagement?.komentar, ck.engagement?.views)
              const cpmInfo = kategoriCPM(ck.engagement?.cpm || 0)
              return (
                <tr key={ck.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-mono">
                      {ck.kode_unik || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">{ck.kols?.nama}</div>
                    <div className="text-xs text-gray-600">{platformIcon[ck.kols?.platform]} @{ck.kols?.handle}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                    {ck.produk_variasi?.nama_variasi || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatRupiah(ck.fee_kol)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-gray-700">{formatRupiah(ck.hpp_satuan)} × {ck.quantity}</div>
                    <div className="text-xs text-gray-500">= {formatRupiah(ck.hpp_total)}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatRupiah(ck.ongkos_kirim)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatRupiah(ck.total_spending)}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">{ck.kota || '-'}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">{ck.tanggal_kirim_barang || '-'}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatNumber(ck.engagement?.views)}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatNumber(ck.engagement?.likes)}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatNumber(ck.engagement?.komentar)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {er ? (
                      <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' +
                        (Number(er) > 3 ? 'bg-green-100 text-green-700' :
                         Number(er) >= 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                        {er}%
                      </span>
                    ) : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {ck.engagement?.cpm > 0
                      ? <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + cpmInfo.class}>{formatCPM(ck.engagement.cpm)}</span>
                      : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap relative" ref={dropdownOpen === ck.id ? dropdownRef : null}>
                    <button
                      onClick={() => setDropdownOpen(dropdownOpen === ck.id ? null : ck.id)}
                      className="text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 font-bold text-lg">
                      ⋮
                    </button>
                    {dropdownOpen === ck.id && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-40 py-1">
                        <button onClick={() => handleEditKol(ck)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleFollowUpWA(ck)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          💬 Follow Up WA
                        </button>
                        <button onClick={() => handleRemoveKol(ck.id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                          🗑️ Hapus
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah/Edit KOL */}
      {showAddKol && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                {editKol ? 'Edit KOL dalam Campaign' : 'Tambah KOL ke Campaign'}
              </h2>
            </div>
            <form onSubmit={handleAddKol} className="p-6 space-y-4">

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Pilih KOL *</label>
                <select value={formKol.kol_id}
                  onChange={e => handlePilihKol(e.target.value)}
                  required disabled={!!editKol}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
                  <option value="">-- Pilih KOL --</option>
                  {allKols.map(k => (
                    <option key={k.id} value={k.id}>
                      {platformIcon[k.platform]} {k.nama} (@{k.handle})
                    </option>
                  ))}
                </select>
                {!editKol && <p className="text-xs text-gray-500 mt-1">KOL yang sama bisa ditambah lebih dari sekali untuk produk berbeda</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Fee KOL / Rate Card (Rp)</label>
                <input type="number" value={formKol.fee_kol}
                  onChange={e => setFormKol({...formKol, fee_kol: e.target.value})}
                  placeholder="0" min="0"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Pilih Produk (Opsional)</label>
                <select onChange={e => handlePilihProduk(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Pilih Produk --</option>
                  {produkList.map(p => <option key={p.id} value={p.id}>{p.nama_brand}</option>)}
                </select>
              </div>

              {selectedProduk && (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Pilih Variasi (Opsional)</label>
                  <select value={formKol.produk_variasi_id}
                    onChange={e => handlePilihVariasi(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Tidak ada variasi --</option>
                    {selectedProduk.produk_variasi?.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.nama_variasi}{v.ukuran ? ' - ' + v.ukuran : ''}{v.warna ? ' - ' + v.warna : ''}
                        {' (HPP: ' + new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v.hpp) + ')'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">HPP Satuan (Rp)</label>
                  <input type="number" value={formKol.hpp_satuan}
                    onChange={e => setFormKol({...formKol, hpp_satuan: e.target.value})}
                    placeholder="Otomatis dari produk" min="0"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Quantity</label>
                  <input type="number" value={formKol.quantity}
                    onChange={e => setFormKol({...formKol, quantity: e.target.value})}
                    min="1"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Ongkos Kirim (Rp)</label>
                  <input type="number" value={formKol.ongkos_kirim}
                    onChange={e => setFormKol({...formKol, ongkos_kirim: e.target.value})}
                    placeholder="0" min="0"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">Kota/Kabupaten</label>
                  <input type="text" value={formKol.kota}
                    onChange={e => setFormKol({...formKol, kota: e.target.value})}
                    placeholder="Otomatis dari KOL"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Tanggal Kirim Barang</label>
                <input type="date" value={formKol.tanggal_kirim_barang}
                  onChange={e => setFormKol({...formKol, tanggal_kirim_barang: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Preview Total */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-1">
                <div className="text-xs text-gray-600 flex justify-between">
                  <span>Fee KOL</span><span>{formatRupiah(formKol.fee_kol)}</span>
                </div>
                <div className="text-xs text-gray-600 flex justify-between">
                  <span>HPP ({formKol.quantity}x × {formatRupiah(formKol.hpp_satuan)})</span>
                  <span>{formatRupiah(formKol.hpp_satuan * formKol.quantity)}</span>
                </div>
                <div className="text-xs text-gray-600 flex justify-between">
                  <span>Ongkos Kirim</span><span>{formatRupiah(formKol.ongkos_kirim)}</span>
                </div>
                <div className="border-t border-blue-200 pt-1 flex justify-between">
                  <span className="text-sm font-semibold text-blue-700">Total Spending</span>
                  <span className="text-sm font-bold text-blue-700">{formatRupiah(totalSpendingPreview)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Catatan</label>
                <textarea value={formKol.catatan}
                  onChange={e => setFormKol({...formKol, catatan: e.target.value})}
                  placeholder="Catatan khusus..." rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2.5 text-sm">
                  {editKol ? 'Simpan Perubahan' : 'Tambah KOL'}
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