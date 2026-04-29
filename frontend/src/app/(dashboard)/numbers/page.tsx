'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Trash2, Power, Edit2, Phone, ShieldAlert } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

function Modal({ open, onClose, title, children }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-base font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}

export default function NumbersPage() {
  const [numbers, setNumbers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form, setForm] = useState({ phone: '', appName: '', apiKey: '', dailyLimit: 1000 })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setNumbers(await api.getNumbers())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditTarget(null)
    setForm({ phone: '', appName: '', apiKey: '', dailyLimit: 1000 })
    setModalOpen(true)
  }

  function openEdit(n: any) {
    setEditTarget(n)
    setForm({ phone: n.phone, appName: n.appName, apiKey: n.apiKey, dailyLimit: n.dailyLimit })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.phone || !form.appName || !form.apiKey) return toast.error('Preencha todos os campos')
    setSaving(true)
    try {
      if (editTarget) {
        await api.updateNumber(editTarget.id, form)
        toast.success('Número atualizado')
      } else {
        await api.createNumber(form)
        toast.success('Número cadastrado')
      }
      setModalOpen(false)
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(n: any) {
    try {
      await api.toggleNumber(n.id)
      toast.success(n.active ? 'Número desativado' : 'Número ativado')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(n: any) {
    if (!confirm(`Remover número ${n.phone}?`)) return
    try {
      await api.deleteNumber(n.id)
      toast.success('Número removido')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Números WhatsApp</h1>
          <p className="text-sm text-[var(--foreground-2)] mt-0.5">
            {numbers.filter(n => n.active).length} ativos de {numbers.length} cadastrados
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 h-8 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors"
        >
          <Plus size={14} />
          Adicionar Número
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
              <div className="h-4 w-28 shimmer rounded mb-3" />
              <div className="h-3 w-40 shimmer rounded mb-2" />
              <div className="h-3 w-20 shimmer rounded" />
            </div>
          ))}
        </div>
      ) : numbers.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
          <Phone size={32} className="mx-auto mb-3 text-[var(--muted)]" />
          <div className="text-sm font-medium mb-1">Nenhum número cadastrado</div>
          <div className="text-xs text-[var(--muted)] mb-4">Adicione números WhatsApp para iniciar disparos</div>
          <button onClick={openCreate} className="text-xs text-emerald-400 hover:text-emerald-300">
            + Adicionar primeiro número
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {numbers.map(n => (
            <div
              key={n.id}
              className={`bg-[var(--surface)] border rounded-xl p-5 transition-colors ${
                n.active && !n.restrictionStatus
                  ? 'border-[var(--border)] hover:border-[var(--border-2)]'
                  : 'border-red-500/20 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full mt-0.5 ${n.active && !n.restrictionStatus ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div>
                    <div className="text-sm font-semibold font-mono">{n.phone}</div>
                    <div className="text-xs text-[var(--foreground-2)]">{n.appName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(n)} className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-foreground transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleToggle(n)} className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-foreground transition-colors" title={n.active ? 'Desativar' : 'Ativar'}>
                    <Power size={13} className={n.active ? 'text-emerald-400' : ''} />
                  </button>
                  <button onClick={() => handleDelete(n)} className="p-1.5 rounded hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {n.restrictionStatus && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 mb-3">
                  <ShieldAlert size={12} />
                  {n.restrictionStatus}
                </div>
              )}

              {/* Usage */}
              <div>
                <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
                  <span>{formatNumber(n.sentCount)} enviados hoje</span>
                  <span>limite {formatNumber(n.dailyLimit)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      n.sentCount / n.dailyLimit > 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min((n.sentCount / n.dailyLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar Número' : 'Adicionar Número'}
      >
        <div className="space-y-3">
          {[
            { key: 'phone', label: 'Número (com DDI)', placeholder: '5511999999999', type: 'text' },
            { key: 'appName', label: 'App Name (Gupshup)', placeholder: 'meu-app-gupshup', type: 'text' },
            { key: 'apiKey', label: 'API Key', placeholder: 'sk_...', type: 'password' },
            { key: 'dailyLimit', label: 'Limite Diário', placeholder: '1000', type: 'number' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? +e.target.value : e.target.value }))}
                placeholder={placeholder}
                className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 h-9 rounded-md border border-[var(--border)] text-sm hover:bg-[var(--surface-2)] transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 h-9 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
