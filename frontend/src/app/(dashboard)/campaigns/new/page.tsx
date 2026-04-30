'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Zap, HelpCircle } from 'lucide-react'
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
    if (match) {
      setQuery(match[1])
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  function insertVar(col: string) {
    const before = value.slice(0, cursorPos)
    const after = value.slice(cursorPos)
    const match = before.match(/\{\{(\w*)$/)
    if (match) {
      const newBefore = before.slice(0, before.lastIndexOf('{{')) + `{{${col}}}`
      onChange(newBefore + after)
    } else {
      onChange(value + `{{${col}}}`)
    }
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const filtered = columns.filter(c =>
    c.toLowerCase().includes(query.toLowerCase())
  )

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

export default function NewCampaignPage() {
  const router = useRouter()
  const [columns, setColumns] = useState<string[]>([])
  const [lists, setLists] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    listId: '',
    sellerId: '',
    templateId: '',
    message: '',
    link: '',
    imageUrl: '',
  })
  const [params, setParams] = useState<string[]>([''])

  useEffect(() => {
    api.getLeadLists().then(setLists).catch(() => {})
    api.getSellers().then(setSellers).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.listId) {
      api.getLeadColumns(form.listId).then(cols => {
        // adiciona variáveis do vendedor se houver um selecionado
        const sellerVars = ['login', 'link', 'linkbotao']
        const all = [...new Set([...cols, ...sellerVars])]
        setColumns(all)
      }).catch(() => {})
    } else {
      setColumns(['login', 'link', 'linkbotao'])
    }
  }, [form.listId])

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function addParam() { setParams(p => [...p, '']) }
  function removeParam(i: number) { setParams(p => p.filter((_, idx) => idx !== i)) }
  function setParam(i: number, v: string) {
    setParams(p => p.map((val, idx) => idx === i ? v : val))
  }

  async function handleSave() {
    if (!form.name) return toast.error('Nome é obrigatório')
    if (!form.listId) return toast.error('Selecione uma base de leads')
    if (!form.templateId && !form.message) return toast.error('Template ID ou mensagem é obrigatório')
    setSaving(true)
    try {
      await api.createCampaign({
        ...form,
        templateParams: params.filter(Boolean),
      })
      toast.success('Campanha criada!')
      router.push('/campaigns')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="text-[var(--muted)] hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Nova Campanha</h1>
          <p className="text-sm text-[var(--foreground-2)] mt-0.5">Configure o disparo de mensagens</p>
        </div>
      </div>

      {/* Variables hint */}
      {columns.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium mb-1.5">
            <Zap size={12} />
            Variáveis disponíveis - clique em campos com {`{{`} para ver autocomplete
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
            placeholder="Ex: Promoção Maio 2025"
            className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">
            Base de Leads *
          </label>
          {lists.length === 0 ? (
            <div className="h-9 px-3 flex items-center rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--muted)]">
              Nenhuma base criada — vá em Leads e crie uma base primeiro
            </div>
          ) : (
            <select
              value={form.listId}
              onChange={e => setField('listId', e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">Selecione uma base...</option>
              {lists.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l._count?.leads ?? 0} leads)
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">
            Vendedor
          </label>
          <select
            value={form.sellerId}
            onChange={e => setField('sellerId', e.target.value)}
            className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground focus:outline-none focus:border-emerald-500 transition-colors"
          >
            <option value="">Sem vendedor</option>
            {sellers.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} (@{s.login})
              </option>
            ))}
          </select>
          {form.sellerId && (() => {
            const s = sellers.find(x => x.id === form.sellerId)
            return s ? (
              <p className="text-xs text-emerald-400/80 mt-1">
                {`{{login}}`} = {s.login}{s.linkBotao ? ` · {{linkbotao}} = ${s.linkBotao}` : ''}
              </p>
            ) : null
          })()}
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">
            Template ID (Gupshup)
          </label>
          <input
            value={form.templateId}
            onChange={e => setField('templateId', e.target.value)}
            placeholder="Ex: welcome_template_v2"
            className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors font-mono"
          />
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
                    placeholder={`{{nome}} ou texto fixo`}
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
          <p className="text-xs text-[var(--muted)] mt-2">
            Ordem posicional - cada linha = um parâmetro {'{1}'}, {'{2}'}, etc.
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
            placeholder="https://..."
            className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">Link</label>
          <input
            value={form.link}
            onChange={e => setField('link', e.target.value)}
            placeholder="https://..."
            className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href="/campaigns"
          className="flex-1 h-9 flex items-center justify-center rounded-md border border-[var(--border)] text-sm hover:bg-[var(--surface-2)] transition-colors"
        >
          Cancelar
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-9 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors disabled:opacity-50"
        >
          {saving ? 'Criando...' : 'Criar Campanha'}
        </button>
      </div>
    </div>
  )
}
