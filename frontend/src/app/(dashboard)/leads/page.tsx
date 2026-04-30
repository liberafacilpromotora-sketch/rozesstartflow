'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import { toast } from 'sonner'
import { Upload, Search, ChevronLeft, ChevronRight, FileText, Loader2, Download, Plus, Trash2, Database } from 'lucide-react'

export default function LeadsPage() {
  const [lists, setLists] = useState<any[]>([])
  const [selectedList, setSelectedList] = useState<any>(null)
  const [leads, setLeads] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dragOver, setDragOver] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [showNewList, setShowNewList] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const searchTimeout = useRef<any>(null)

  async function loadLists() {
    try {
      const data = await api.getLeadLists()
      setLists(data)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const loadLeads = useCallback(async (p = 1, s = '', listId?: string) => {
    const id = listId ?? selectedList?.id
    if (!id) return
    setLoading(true)
    try {
      const res = await api.getLeads(p, 50, s || undefined, id)
      setLeads(res)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedList])

  useEffect(() => { loadLists() }, [])

  useEffect(() => {
    if (selectedList) {
      setPage(1)
      setSearch('')
      setLeads(null)
      loadLeads(1, '', selectedList.id)
    }
  }, [selectedList?.id])

  function handleSearch(val: string) {
    setSearch(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      loadLeads(1, val, selectedList?.id)
    }, 400)
  }

  function handlePageChange(p: number) {
    setPage(p)
    loadLeads(p, search, selectedList?.id)
  }

  async function handleCreateList() {
    if (!newListName.trim()) return
    setCreatingList(true)
    try {
      const list = await api.createLeadList(newListName.trim())
      setNewListName('')
      setShowNewList(false)
      await loadLists()
      setSelectedList(list)
      toast.success(`Base "${list.name}" criada`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCreatingList(false)
    }
  }

  async function handleDeleteList(list: any, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Remover base "${list.name}" e todos os seus leads?`)) return
    try {
      await api.deleteLeadList(list.id)
      if (selectedList?.id === list.id) setSelectedList(null)
      await loadLists()
      toast.success('Base removida')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function downloadTemplate() {
    const rows = ['nome;telefone;email', 'João Silva;11999999999;joao@email.com', 'Maria Souza;21988888888;maria@email.com']
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo_leads.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) return toast.error('Envie um arquivo CSV (.csv)')
    if (!selectedList) return toast.error('Selecione uma base primeiro')
    setUploading(true)
    try {
      const res = await api.importLeads(file, selectedList.id)
      toast.success(`Importado: ${res.created} criados, ${res.updated} atualizados${res.errors ? `, ${res.errors} erros` : ''}`)
      await loadLists()
      loadLeads(1, search, selectedList.id)
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Leads</h1>
          <p className="text-sm text-[var(--foreground-2)] mt-0.5">
            {selectedList ? `${formatNumber(leads?.total ?? selectedList._count?.leads ?? 0)} contatos em "${selectedList.name}"` : 'Selecione uma base'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadTemplate} className="flex items-center gap-2 h-8 px-3.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-2)] text-sm font-medium transition-colors">
            <Download size={14} />
            Baixar Modelo
          </button>
          <button
            onClick={() => selectedList ? fileRef.current?.click() : toast.error('Selecione uma base primeiro')}
            disabled={uploading}
            className="flex items-center gap-2 h-8 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Importando...' : 'Importar CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      </div>

      {/* Bases */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">Bases de leads</span>
          <button
            onClick={() => setShowNewList(v => !v)}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Plus size={12} /> Nova base
          </button>
        </div>

        {showNewList && (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateList()}
              placeholder="Nome da base (ex: Clientes Maio)"
              className="flex-1 h-8 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              onClick={handleCreateList}
              disabled={creatingList || !newListName.trim()}
              className="h-8 px-3 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors disabled:opacity-50"
            >
              {creatingList ? <Loader2 size={13} className="animate-spin" /> : 'Criar'}
            </button>
          </div>
        )}

        {lists.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center">
            <Database size={24} className="mx-auto mb-2 text-[var(--muted)]" />
            <div className="text-sm font-medium mb-1">Nenhuma base criada</div>
            <div className="text-xs text-[var(--muted)]">Crie uma base e importe seu CSV para começar</div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {lists.map(list => (
              <button
                key={list.id}
                onClick={() => setSelectedList(list)}
                className={`flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg border text-sm font-medium transition-all ${
                  selectedList?.id === list.id
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-[var(--surface)] border-[var(--border)] text-foreground hover:border-[var(--border-2)]'
                }`}
              >
                <span>{list.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedList?.id === list.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[var(--surface-2)] text-[var(--muted)]'}`}>
                  {formatNumber(list._count?.leads ?? 0)}
                </span>
                <span
                  onClick={e => handleDeleteList(list, e)}
                  className="ml-0.5 p-0.5 rounded hover:text-red-400 text-[var(--muted)] transition-colors cursor-pointer"
                >
                  <Trash2 size={11} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedList && (
        <>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-[var(--border)] hover:border-[var(--border-2)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <FileText size={20} className="mx-auto mb-2 text-[var(--muted)]" />
            <div className="text-sm font-medium">Arraste um CSV aqui ou clique para selecionar</div>
            <div className="text-xs text-[var(--muted)] mt-1">
              Aceita <strong>ponto e vírgula (;)</strong>, vírgula ou tabulação — será importado para <strong>{selectedList.name}</strong>
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
                    Array.from({ length: 8 }).map((_, i) => (
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
                        Nenhum lead encontrado nesta base
                      </td>
                    </tr>
                  ) : (
                    leads?.data?.map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-[var(--surface-2)] transition-colors">
                        <td className="px-4 py-3 font-medium">{lead.fullName || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--foreground-2)]">{lead.phone}</td>
                        {extras.slice(0, 3).map(k => (
                          <td key={k} className="px-4 py-3 text-xs text-[var(--foreground-2)]">{lead.extras?.[k] || '—'}</td>
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

            {leads && leads.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
                <span className="text-xs text-[var(--muted)]">Página {leads.page} de {leads.pages}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="p-1.5 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => handlePageChange(page + 1)} disabled={page >= leads.pages} className="p-1.5 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
