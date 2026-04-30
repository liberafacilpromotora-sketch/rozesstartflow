'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { toast } from 'sonner'
import { Upload, Search, ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react'

export default function LeadsPage() {
  const [leads, setLeads] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<any>(null)

  const load = useCallback(async (p = page, s = search) => {
    setLoading(true)
    try {
      const res = await api.getLeads(p, 50, s || undefined)
      setLeads(res)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { load() }, [])

  function handleSearch(val: string) {
    setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      load(1, val)
    }, 400)
  }

  function handlePageChange(p: number) {
    setPage(p)
    load(p, search)
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) return toast.error('Envie um arquivo CSV')
    setUploading(true)
    try {
      const res = await api.importLeads(file)
      toast.success(`Importado: ${res.created} criados, ${res.updated} atualizados${res.errors ? `, ${res.errors} erros` : ''}`)
      load(1, search)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar CSV')
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const extras = leads?.data?.[0]?.extras ? Object.keys(leads.data[0].extras) : []

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Leads</h1>
          <p className="text-sm text-[var(--foreground-2)] mt-0.5">
            {leads ? formatNumber(leads.total) : '—'} contatos cadastrados
          </p>
        </div>

        {/* Upload button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 h-8 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Importando...' : 'Importar CSV'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-emerald-500 bg-emerald-500/5'
            : 'border-[var(--border)] hover:border-[var(--border-2)] hover:bg-[var(--surface-2)]'
        }`}
      >
        <FileText size={24} className="mx-auto mb-3 text-[var(--muted)]" />
        <div className="text-sm font-medium">Arraste um CSV aqui ou clique para selecionar</div>
        <div className="text-xs text-[var(--muted)] mt-1">
          Colunas detectadas automaticamente: celular/telefone/phone + nome/name
        </div>
        <div className="text-xs text-[var(--muted)] mt-0.5">
          Colunas extras serão salvas em campos dinâmicos disponíveis como variáveis
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full h-9 pl-8 pr-3 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">Telefone</th>
                {extras.slice(0, 3).map(k => (
                  <th key={k} className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">{k}</th>
                ))}
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-3.5 w-32 shimmer rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3.5 w-28 shimmer rounded" /></td>
                    {extras.slice(0, 3).map(k => (
                      <td key={k} className="px-4 py-3"><div className="h-3.5 w-20 shimmer rounded" /></td>
                    ))}
                    <td className="px-4 py-3"><div className="h-3.5 w-20 shimmer rounded" /></td>
                  </tr>
                ))
              ) : leads?.data?.length === 0 ? (
                <tr>
                  <td colSpan={5 + extras.length} className="px-4 py-12 text-center text-[var(--muted)]">
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                leads?.data?.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-4 py-3 font-medium">{lead.fullName || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--foreground-2)]">{lead.phone}</td>
                    {extras.slice(0, 3).map(k => (
                      <td key={k} className="px-4 py-3 text-xs text-[var(--foreground-2)]">
                        {lead.extras?.[k] || '—'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">
                      {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {leads && leads.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--muted)]">
              Página {leads.page} de {leads.pages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= leads.pages}
                className="p-1.5 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
