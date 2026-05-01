'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Zap, CheckCircle, AlertCircle, Loader2, ChevronDown } from 'lucide-react'
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

export default function NewCampaignPage() {
  const router = useRouter()
  const [columns, setColumns] = useState<string[]>([])
  const [lists, setLists] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [numbers, setNumbers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ name: '', listId: '', imageUrl: '' })
  const [sellerIds, setSellerIds] = useState<string[]>([])
  const [maxLeads, setMaxLeads] = useState<string>('')
  const [params, setParams] = useState<string[]>([''])

  // template selection
  const [selectedNumberId, setSelectedNumberId] = useState('')
  const [templates, setTemplates] = useState<any[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [showTemplateList, setShowTemplateList] = useState(false)

  useEffect(() => {
    api.getLeadLists().then(setLists).catch(() => {})
    api.getSellers().then(setSellers).catch(() => {})
    api.getNumbers().then(nums => setNumbers(nums.filter((n: any) => n.active))).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.listId) {
      api.getLeadColumns(form.listId)
        .then(cols => setColumns([...new Set([...cols])]))
        .catch(() => setColumns([]))
    } else {
      setColumns([])
    }
  }, [form.listId])

  // busca templates ao selecionar número
  useEffect(() => {
    if (!selectedNumberId) { setTemplates([]); setSelectedTemplate(null); return }
    setTemplatesLoading(true)
    setSelectedTemplate(null)
    api.getNumberTemplates(selectedNumberId)
      .then(setTemplates)
      .catch(() => { toast.error('Erro ao buscar templates'); setTemplates([]) })
      .finally(() => setTemplatesLoading(false))
  }, [selectedNumberId])

  // ao selecionar template, ajusta params automaticamente
  function selectTemplate(tpl: any) {
    setSelectedTemplate(tpl)
    setShowTemplateList(false)
    setParams(p => {
      const target = tpl.textParams
      if (p.length === target) return p
      if (p.length < target) return [...p, ...Array(target - p.length).fill('')]
      return p.slice(0, target)
    })
  }

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleSeller(id: string) {
    setSellerIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  function addParam() { setParams(p => [...p, '']) }
  function removeParam(i: number) { setParams(p => p.filter((_, idx) => idx !== i)) }
  function setParam(i: number, v: string) {
    setParams(p => p.map((val, idx) => idx === i ? v : val))
  }

  async function handleSave() {
    if (!form.name) return toast.error('Nome é obrigatório')
    if (!form.listId) return toast.error('Selecione uma base de leads')
    if (!selectedTemplate) return toast.error('Selecione um template')
    setSaving(true)
    try {
      await api.createCampaign({
        ...form,
        templateId: selectedTemplate.id,
        sellerIds,
        ...(maxLeads ? { maxLeads: parseInt(maxLeads) } : {}),
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

  const paramsMismatch = selectedTemplate && params.filter(Boolean).length !== selectedTemplate.textParams
  const approvedTemplates = templates.filter(t => t.approved)
  const otherTemplates = templates.filter(t => !t.approved)

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

      {columns.length > 0 && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium mb-1.5">
            <Zap size={12} />
            Variáveis disponíveis — clique nos campos para autocomplete
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
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">Nome da Campanha *</label>
          <input
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="Ex: Promoção Maio 2025"
            className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">Base de Leads *</label>
          {lists.length === 0 ? (
            <div className="h-9 px-3 flex items-center rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--muted)]">
              Nenhuma base criada
            </div>
          ) : (
            <select
              value={form.listId}
              onChange={e => setField('listId', e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">Selecione uma base...</option>
              {lists.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l._count?.leads ?? 0} leads)</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">Quantidade de Leads</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMaxLeads('')}
              className={`h-9 px-4 rounded-md border text-sm transition-colors ${!maxLeads ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]'}`}
            >
              Todos
            </button>
            <input
              type="number" min={1}
              value={maxLeads}
              onChange={e => setMaxLeads(e.target.value)}
              placeholder="Ex: 200"
              className="flex-1 h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground placeholder:text-[var(--muted)] focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">Vendedores</label>
          {sellers.length === 0 ? (
            <div className="h-9 px-3 flex items-center rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--muted)]">Nenhum vendedor cadastrado</div>
          ) : (
            <div className="space-y-1.5">
              {sellers.map(s => {
                const selected = sellerIds.includes(s.id)
                return (
                  <button key={s.id} type="button" onClick={() => toggleSeller(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md border text-left transition-colors ${selected ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-2)]'}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] overflow-hidden shrink-0 flex items-center justify-center">
                      {s.imageUrl ? <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" /> : <span className="text-xs font-semibold text-emerald-400">{s.name[0]?.toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-[var(--muted)] truncate">
                        {s.imageUrl && <span className="mr-2">📷 foto</span>}
                        {s.linkBotao && <span className="font-mono">botão: …/r/{s.linkBotao}</span>}
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${selected ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--border)]'}`}>
                      {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {sellerIds.length > 1 && <p className="text-xs text-[var(--muted)] mt-2">{sellerIds.length} vendedores — round-robin por lead</p>}
        </div>

        {/* Número WA + seletor de template */}
        <div>
          <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">
            Número WhatsApp *
          </label>
          {numbers.length === 0 ? (
            <div className="h-9 px-3 flex items-center rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--muted)]">
              Nenhum número ativo cadastrado
            </div>
          ) : (
            <select
              value={selectedNumberId}
              onChange={e => setSelectedNumberId(e.target.value)}
              className="w-full h-9 px-3 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-foreground focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">Selecione um número para ver os templates...</option>
              {numbers.map(n => (
                <option key={n.id} value={n.id}>{n.phone} — {n.appName}</option>
              ))}
            </select>
          )}
        </div>

        {/* Lista de templates */}
        {selectedNumberId && (
          <div>
            <label className="block text-xs font-medium text-[var(--foreground-2)] mb-1.5 uppercase tracking-wider">
              Template *
            </label>

            {templatesLoading ? (
              <div className="h-9 px-3 flex items-center gap-2 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--muted)]">
                <Loader2 size={13} className="animate-spin" /> Buscando templates...
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTemplateList(v => !v)}
                  className={`w-full h-9 px-3 flex items-center justify-between rounded-md border text-sm transition-colors ${
                    selectedTemplate
                      ? 'border-emerald-500 bg-emerald-500/5 text-foreground'
                      : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]'
                  }`}
                >
                  <span className="truncate">
                    {selectedTemplate ? `${selectedTemplate.name} — ${selectedTemplate.approved ? 'Aprovado' : selectedTemplate.status}` : 'Selecione um template...'}
                  </span>
                  <ChevronDown size={14} className={`shrink-0 ml-2 transition-transform ${showTemplateList ? 'rotate-180' : ''}`} />
                </button>

                {showTemplateList && templates.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden shadow-xl max-h-64 overflow-y-auto">
                    {approvedTemplates.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[10px] font-medium text-emerald-400 uppercase tracking-wider bg-emerald-500/5 border-b border-[var(--border)]">
                          Aprovados ({approvedTemplates.length})
                        </div>
                        {approvedTemplates.map(t => (
                          <button key={t.id} onMouseDown={() => selectTemplate(t)}
                            className="w-full px-3 py-2.5 text-left hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)] last:border-0"
                          >
                            <div className="text-sm font-medium">{t.name}</div>
                            <div className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{t.body}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-emerald-400">{t.textParams} params texto</span>
                              {t.hasButton && <span className="text-[10px] text-blue-400">+ botão automático</span>}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {otherTemplates.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[10px] font-medium text-amber-400 uppercase tracking-wider bg-amber-500/5 border-b border-[var(--border)]">
                          Pendentes / Outros
                        </div>
                        {otherTemplates.map(t => (
                          <button key={t.id} onMouseDown={() => selectTemplate(t)}
                            className="w-full px-3 py-2.5 text-left hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)] last:border-0 opacity-60"
                          >
                            <div className="text-sm font-medium">{t.name}</div>
                            <div className="text-xs text-amber-400">{t.status}</div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Preview do template selecionado */}
            {selectedTemplate && (
              <div className={`mt-2 rounded-lg border px-4 py-3 space-y-2 ${selectedTemplate.approved ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                <div className="flex items-center gap-2">
                  {selectedTemplate.approved
                    ? <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                    : <AlertCircle size={13} className="text-amber-400 shrink-0" />
                  }
                  <span className="text-sm font-medium">{selectedTemplate.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${selectedTemplate.approved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {selectedTemplate.approved ? 'Aprovado' : selectedTemplate.status}
                  </span>
                </div>
                <div className="text-xs text-[var(--muted)]">
                  <span className="text-foreground font-medium">{selectedTemplate.textParams}</span> parâmetros de texto para configurar
                  {selectedTemplate.hasButton && <span className="text-emerald-400/80 ml-2">· botão preenchido automaticamente pelo vendedor</span>}
                </div>
                {selectedTemplate.body && (() => {
                  const sellerLinkBotao = sellerIds.length > 0
                    ? sellers.find(s => s.id === sellerIds[0])?.linkBotao
                    : null
                  const previewBody = sellerLinkBotao
                    ? selectedTemplate.body.replace(/\{\{(\d+)\}\}(?=[^}]*\/r\/)/g, sellerLinkBotao)
                    : selectedTemplate.body
                  return (
                    <div className="text-xs text-[var(--muted)] font-mono bg-[var(--surface-2)] rounded px-2 py-1.5 leading-relaxed line-clamp-3">
                      {previewBody}
                      {sellerLinkBotao && (
                        <span className="text-emerald-400 not-italic block mt-1">↑ link da vendedora: {sellerLinkBotao}</span>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* Params */}
        {selectedTemplate && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">Parâmetros do Template</label>
              <button onClick={addParam} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                <Plus size={11} /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {params.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)] w-6 text-right shrink-0">{i + 1}.</span>
                  <div className="flex-1">
                    <VarInput value={p} onChange={v => setParam(i, v)} columns={columns} placeholder="{{nome}} ou texto fixo" />
                  </div>
                  {params.length > 1 && (
                    <button onClick={() => removeParam(i)} className="text-[var(--muted)] hover:text-red-400 transition-colors shrink-0">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {selectedTemplate.hasButton && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--surface-2)] border border-dashed border-[var(--border)]">
                <span className="text-xs text-[var(--muted)] w-6 text-right shrink-0">{params.length + 1}.</span>
                <span className="text-xs text-emerald-400/70 font-mono">seller.linkBotao</span>
                <span className="text-xs text-[var(--muted)]">— automático pelo vendedor</span>
              </div>
            )}

            {paramsMismatch && (
              <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                <AlertCircle size={11} />
                Template espera {selectedTemplate.textParams} param(s), você configurou {params.filter(Boolean).length}
              </p>
            )}
            <p className="text-xs text-[var(--muted)] mt-2">Ordem posicional — cada linha = um parâmetro {'{1}'}, {'{2}'}, etc.</p>
          </div>
        )}
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
        <Link href="/campaigns" className="flex-1 h-9 flex items-center justify-center rounded-md border border-[var(--border)] text-sm hover:bg-[var(--surface-2)] transition-colors">
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
