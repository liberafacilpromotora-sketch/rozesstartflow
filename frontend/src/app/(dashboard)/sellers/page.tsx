'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, UserCheck, X, Check, Loader2 } from 'lucide-react'

const EMPTY = { name: '', login: '', imageUrl: '', link: '', linkBotao: '' }

export default function SellersPage() {
  const [sellers, setSellers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      setSellers(await api.getSellers())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm(EMPTY)
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(seller: any) {
    setForm({
      name: seller.name || '',
      login: seller.login || '',
      imageUrl: seller.imageUrl || '',
      link: seller.link || '',
      linkBotao: seller.linkBotao || '',
    })
    setEditing(seller.id)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(EMPTY)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Nome é obrigatório')
    if (!form.login.trim()) return toast.error('Login é obrigatório')
    setSaving(true)
    try {
      if (editing) {
        await api.updateSeller(editing, form)
        toast.success('Vendedor atualizado')
      } else {
        await api.createSeller(form)
        toast.success('Vendedor criado')
      }
      closeForm()
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover vendedor "${name}"?`)) return
    try {
      await api.deleteSeller(id)
      toast.success('Vendedor removido')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const field = (key: keyof typeof EMPTY, label: string, placeholder: string, hint?: string) => (
    <div>
      <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors"
      />
      {hint && <p className="text-xs text-[var(--muted)] mt-1">{hint}</p>}
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Vendedores</h1>
          <p className="text-sm text-[var(--foreground-2)] mt-0.5">
            {sellers.length} vendedor{sellers.length !== 1 ? 'es' : ''} cadastrado{sellers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 h-8 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors"
        >
          <Plus size={14} />
          Novo Vendedor
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h2 className="text-sm font-medium">{editing ? 'Editar Vendedor' : 'Novo Vendedor'}</h2>
            <button onClick={closeForm} className="text-[var(--muted)] hover:text-foreground transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('name', 'Nome *', 'Ex: Letícia Souza')}
            {field('login', 'Login *', 'Ex: leticiasouza', 'Usado como variável {{login}} no template')}
            {field('imageUrl', 'URL da Foto', 'https://...', 'Foto do vendedor exibida na mensagem')}
            {field('link', 'Link', 'https://...', 'Variável {{link}} no template')}
            {field('linkBotao', 'Link do Botão', 'Ex: leticiasouza', 'Variável {{linkbotao}} no template — sufixo da URL do botão')}
          </div>

          {/* Preview das variáveis */}
          {(form.login || form.link || form.linkBotao) && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
              <div className="text-xs text-emerald-400 font-medium mb-2">Variáveis geradas por este vendedor:</div>
              <div className="flex flex-wrap gap-2">
                {form.login && <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded">{'{{login}}'} = {form.login}</span>}
                {form.link && <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded">{'{{link}}'} = {form.link}</span>}
                {form.linkBotao && <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded">{'{{linkbotao}}'} = {form.linkBotao}</span>}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={closeForm} className="flex-1 h-9 flex items-center justify-center rounded-md border border-[var(--border)] text-sm hover:bg-[var(--surface-2)] transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-9 flex items-center justify-center gap-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 h-20 shimmer" />
          ))}
        </div>
      ) : sellers.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center">
          <UserCheck size={32} className="mx-auto mb-3 text-[var(--muted)]" />
          <div className="text-sm font-medium mb-1">Nenhum vendedor cadastrado</div>
          <div className="text-xs text-[var(--muted)]">Cadastre vendedores para usar os links personalizados nos disparos</div>
        </div>
      ) : (
        <div className="space-y-2">
          {sellers.map(seller => (
            <div
              key={seller.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 flex items-center gap-4 hover:border-[var(--border-2)] transition-colors"
            >
              {/* Foto */}
              <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                {seller.imageUrl ? (
                  <img src={seller.imageUrl} alt={seller.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-emerald-400">{seller.name[0]?.toUpperCase()}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{seller.name}</span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">@{seller.login}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                  {seller.link && <span className="truncate max-w-[200px]">link: {seller.link}</span>}
                  {seller.linkBotao && <span className="truncate max-w-[200px]">botão: {seller.linkBotao}</span>}
                </div>
              </div>

              {/* Variáveis */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono bg-[var(--surface-2)] text-[var(--muted)] px-2 py-0.5 rounded">{'{{login}}'}</span>
                {seller.link && <span className="text-[10px] font-mono bg-[var(--surface-2)] text-[var(--muted)] px-2 py-0.5 rounded">{'{{link}}'}</span>}
                {seller.linkBotao && <span className="text-[10px] font-mono bg-[var(--surface-2)] text-[var(--muted)] px-2 py-0.5 rounded">{'{{linkbotao}}'}</span>}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(seller)}
                  className="p-2 rounded-md hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-foreground transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(seller.id, seller.name)}
                  className="p-2 rounded-md hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
