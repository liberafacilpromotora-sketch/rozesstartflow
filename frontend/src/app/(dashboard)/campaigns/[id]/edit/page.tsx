'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Zap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

function VarInput({
  value, onChange, columns, placeholder
}: {
  value: string
  onChange: (v: string) => void
  columns: string[]
  placeholder?: string
}) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [query, setQuery] = useState('')
  const [cursorPos, setCursorPos] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    const pos = e.target.selectionStart || 0
    onChange(val)
    setCursorPos(pos)
    const before = val.slice(0, pos)
    const match = before.match(/\{\{(\w*)$/)
    if (match) { setQuery(match[1]); setShowSuggestions(true) }
    else setShowSuggestions(false)
  }

  function insertVar(col: string) {
    const before = value.slice(0, cursorPos)
    const after = value.slice(cursorPos)
    const match = before.match(/\{\{(\w*)$/)
    if (match) {
      onChange(before.slice(0, before.lastIndexOf('{{')) + `{{${col}}}` + after)
    } else {
      onChange(value + `{{${col}}}`)
    }
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const filtered = columns.filter(c => c.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors font-mono"
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden shadow-xl">
          {filtered.map(col => (
            <button
              key={col}
              onMouseDown={() => insertVar(col)}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-[var(--surface-2)] transition-colors"
            >
              <span className="text-emerald-400 font-mono">{`{{${col}}}`}</span>
              <span className="text-[var(--muted)]">variável</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EditCampaignPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [columns, setColumns] = useState<string[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', templateId: '', imageUrl: '' })
  const [sellerIds, setSellerIds] = useState<string[]>([])
  const [params, setParams] = useState<string[]>([''])
  const [preview, setPreview] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    Promise.all([api.getCampaign(id), api.getSellers()])
      .then(([campaign, sels]) => {
        setSellers(sels)
        setForm({
          name: campaign.name || '',
          templateId: campaign.templateId || '',
          imageUrl: campaign.imageUrl || '',
        })
        setParams(campaign.templateParams?.length ? campaign.templateParams : [''])
        setSellerIds(campaign.sellerIds || [])
        if (campaign.listId) {
          api.getLeadColumns(campaign.listId)
            .then(cols => setColumns([...new Set([...cols])]))
            .catch(() => setColumns([]))
        }
      })
      .catch(() => toast.error('Erro ao carregar campanha'))
      .finally(() => setLoading(false))
  }, [id])

  // debounce template preview
  useEffect(() => {
    if (!form.templateId || form.templateId.length < 10) {
      setPreview(null)
      return
    }
    setPreviewLoading(true)
    const timer = setTimeout(() => {
      api.templatePreview(form.templateId)
        .then(data => setPreview(data))
        .catch(() => setPreview({ error: true }))
        .finally(() => setPreviewLoading(false))
    }, 700)
    return () => clearTimeout(timer)
  }, [form.templateId])

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleSeller(sellerId: string) {
    setSellerIds(prev =>
      prev.includes(sellerId) ? prev.filter(s => s !== sellerId) : [...prev, sellerId]
    )
  }

  function addParam() { setParams(p => [...p, '']) }
  function removeParam(i: number) { setParams(p => p.filter((_, idx) => idx !== i)) }
  function setParam(i: number, v: string) {
    setParams(p => p.map((val, idx) => idx === i ? v : val))
  }

  async function handleSave() {
    if (!form.name) return toast.error('Nome é obrigatório')
    setSaving(true)
    try {
      await api.updateCampaign(id, {
        ...form,
        sellerIds,
        templateParams: params.filter(Boolean),
      })
      toast.success('Campanha atualizada!')
      router.push(`/campaigns/${id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const paramsMismatch = preview && !preview.error && params.filter(Boolean).length !== preview.textParams

  if (loading) {
    return <div className="p-6 max-w-2xl mx-auto text-sm text-[var(--muted)]">Carregando...</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/campaigns/${id}`} className="text-[var(--muted)] hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Editar Campanha</h1>
          <p className="text-sm text-[var(--foreground-2)] mt-0.5">Altere os parâmetros do template</p>
        </div>
      </div>

      {columns.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium mb-1.5">
            <Zap size={12} />
            Variáveis disponíveis
          </div>
          <div className="flex flex-wrap gap-1.5">
            {columns.map(c => (
              <span key={c} className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded">
                {`{{${c}}}`}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-medium border-b border-[var(--border)] pb-3">Informações básicas</h2>

        <div>
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">
            Nome da Campanha *
          </label>
          <input
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">
            Vendedores
          </label>
          {sellers.length === 0 ? (
            <div className="h-9 px-3 flex items-center rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--muted)]">
              Nenhum vendedor cadastrado
            </div>
          ) : (
            <div className="space-y-1.5">
              {sellers.map(s => {
                const selected = sellerIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSeller(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md border text-left transition-colors ${
                      selected
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-2)]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                      {s.imageUrl
                        ? <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                        : <span className="text-xs font-semibold text-emerald-400">{s.name[0]?.toUpperCase()}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-[var(--muted)] truncate">
                        {s.imageUrl && <span className="mr-2">📷 foto</span>}
                        {s.linkBotao && <span className="font-mono">botão: …/r/{s.linkBotao}</span>}
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                      selected ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--border)]'
                    }`}>
                      {selected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">
            Template ID (Gupshup)
          </label>
          <div className="relative">
            <input
              value={form.templateId}
              onChange={e => setField('templateId', e.target.value)}
              className="w-full h-9 px-3 pr-8 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground focus:outline-none focus:border-emerald-500 transition-colors font-mono"
            />
            {previewLoading && (
              <Loader2 size={14} className="absolute right-2.5 top-2.5 animate-spin text-[var(--muted)]" />
            )}
          </div>

          {preview && !preview.error && (
            <div className={`mt-2 rounded-lg border px-4 py-3 space-y-2 ${
              preview.approved
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-amber-500/30 bg-amber-500/5'
            }`}>
              <div className="flex items-center gap-2">
                {preview.approved
                  ? <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                  : <AlertCircle size={13} className="text-amber-400 shrink-0" />
                }
                <span className="text-sm font-medium">{preview.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  preview.approved
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {preview.approved ? 'Aprovado' : preview.status}
                </span>
              </div>
              <div className="text-xs text-[var(--muted)] space-y-0.5">
                <div>
                  <span className="text-foreground font-medium">{preview.textParams}</span> parâmetros de texto para configurar
                </div>
                {preview.hasButton && (
                  <div className="text-emerald-400/80">
                    Botão URL dinâmico — preenchido automaticamente pelo vendedor
                  </div>
                )}
              </div>
              {preview.body && (
                <div className="text-xs text-[var(--muted)] font-mono bg-[var(--surface-2)] rounded px-2 py-1.5 leading-relaxed line-clamp-3">
                  {preview.body}
                </div>
              )}
            </div>
          )}
          {preview?.error && (
            <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2.5 flex items-center gap-2">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <span className="text-xs text-red-400">Template não encontrado neste número</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">
              Parâmetros do Template
            </label>
            <button
              onClick={addParam}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
            >
              <Plus size={11} /> Adicionar
            </button>
          </div>
          <div className="space-y-2">
            {params.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)] w-6 text-right shrink-0">{i + 1}.</span>
                <div className="flex-1">
                  <VarInput
                    value={p}
                    onChange={v => setParam(i, v)}
                    columns={columns}
                    placeholder="{{nome}} ou texto fixo"
                  />
                </div>
                {params.length > 1 && (
                  <button onClick={() => removeParam(i)} className="text-[var(--muted)] hover:text-red-400 transition-colors shrink-0">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {preview?.hasButton && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--surface-2)] border border-dashed border-[var(--border)]">
              <span className="text-xs text-[var(--muted)] w-6 text-right shrink-0">{params.length + 1}.</span>
              <span className="text-xs text-emerald-400/70 font-mono">seller.linkBotao</span>
              <span className="text-xs text-[var(--muted)]">— automático pelo vendedor</span>
            </div>
          )}

          {paramsMismatch && (
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              <AlertCircle size={11} />
              Template espera {preview.textParams} param(s) de texto, você configurou {params.filter(Boolean).length}
            </p>
          )}

          <p className="text-xs text-[var(--muted)] mt-2">
            Ordem posicional — cada linha = um parâmetro {'{1}'}, {'{2}'}, etc.
          </p>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-medium border-b border-[var(--border)] pb-3">Opcional</h2>
        <div>
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">URL da Imagem</label>
          <input
            value={form.imageUrl}
            onChange={e => setField('imageUrl', e.target.value)}
            placeholder="Deixe vazio para usar a foto do vendedor"
            className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <p className="text-xs text-[var(--muted)] mt-1">Se o vendedor tiver foto cadastrada, ela será usada automaticamente</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href={`/campaigns/${id}`}
          className="flex-1 h-9 flex items-center justify-center rounded-md border border-[var(--border)] text-sm hover:bg-[var(--surface-2)] transition-colors"
        >
          Cancelar
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-9 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  )
}
