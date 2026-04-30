'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, UserCheck, X, Check, Loader2 } from 'lucide-react'

const EMPTY = { name: '', imageUrl: '', linkBotao: '' }

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

  function openNew() { setForm(EMPTY); setEditing(null); setShowForm(true) }
  function openEdit(s: any) {
    setForm({ name: s.name || '', imageUrl: s.imageUrl || '', linkBotao: s.linkBotao || '' })
    setEditing(s.id); setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditing(null); setForm(EMPTY) }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Nome é obrigatório')
    setSaving(true)
    try {
      if (editing) {
        await api.updateSeller(editing, form)
        toast.success('Vendedor atualizado')
      } else {
        await api.createSeller(form)
        toast.success('Vendedor criado')
      }
      closeForm(); load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover vendedor "${name}"?`)) return
    try {
      await api.deleteSeller(id); toast.success('Vendedor removido'); load()
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Vendedores</h1>
          <p className="text-sm text-[var(--foreground-2)] mt-0.5">
            {sellers.length} vendedor{sellers.length !== 1 ? 'es' : ''} cadastrado{sellers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 h-8 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors">
          <Plus size={14} /> Novo Vendedor
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h2 className="text-sm font-medium">{editing ? 'Editar Vendedor' : 'Novo Vendedor'}</h2>
            <button onClick={closeForm} className="text-[var(--muted)] hover:text-foreground transition-colors"><X size={15} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">Nome *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Letícia Souza"
                className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">URL da Foto</label>
              <input
                value={form.imageUrl}
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-xs text-[var(--muted)] mt-1">Foto enviada como imagem na mensagem WhatsApp</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">
                Sufixo do Botão <span className="text-emerald-400 font-mono normal-case">{'{{linkbotao}}'}</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)] whitespace-nowrap">https://app.leadroute.com.br/r/</span>
                <input
                  value={form.linkBotao}
                  onChange={e => setForm(f => ({ ...f, linkBotao: e.target.value }))}
                  placeholder="leticiasouza"
                  className="flex-1 h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
              {form.linkBotao && (
                <p className="text-xs text-emerald-400/80 mt-1">
                  URL final: https://app.leadroute.com.br/r/{form.linkBotao}
                </p>
              )}
              <p className="text-xs text-[var(--muted)] mt-1">
                Usado como <span className="font-mono">{'{{linkbotao}}'}</span> no parâmetro do template
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={closeForm} className="flex-1 h-9 flex items-center justify-center rounded-md border border-[var(--border)] text-sm hover:bg-[var(--surface-2)] transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 h-9 flex items-center justify-center gap-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 h-20 shimmer" />)}
        </div>
      ) : sellers.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center">
          <UserCheck size={32} className="mx-auto mb-3 text-[var(--muted)]" />
          <div className="text-sm font-medium mb-1">Nenhum vendedor cadastrado</div>
          <div className="text-xs text-[var(--muted)]">Cadastre vendedores para personalizar os links do botão em cada campanha</div>
        </div>
      ) : (
        <div className="space-y-2">
          {sellers.map(seller => (
            <div key={seller.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 flex items-center gap-4 hover:border-[var(--border-2)] transition-colors">
              {/* Foto */}
              <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                {seller.imageUrl
                  ? <img src={seller.imageUrl} alt={seller.name} className="w-full h-full object-cover" />
                  : <span className="text-sm font-semibold text-emerald-400">{seller.name[0]?.toUpperCase()}</span>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold mb-0.5">{seller.name}</div>
                {seller.linkBotao && (
                  <div className="text-xs text-[var(--muted)]">
                    <span className="font-mono text-emerald-400/70">{'{{linkbotao}}'}</span>
                    {' = '}
                    <span className="font-mono">https://app.leadroute.com.br/r/{seller.linkBotao}</span>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(seller)} className="p-2 rounded-md hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-foreground transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(seller.id, seller.name)} className="p-2 rounded-md hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400 transition-colors">
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
