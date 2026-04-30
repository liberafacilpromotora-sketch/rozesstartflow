'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Play, Pause, Megaphone, Trash2, ChevronRight } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft:    { label: 'Rascunho', cls: 'bg-zinc-500/10 text-zinc-400' },
  running:  { label: 'Ativa',    cls: 'bg-emerald-500/10 text-emerald-400' },
  paused:   { label: 'Pausada',  cls: 'bg-amber-500/10 text-amber-400' },
  finished: { label: 'Finalizada', cls: 'bg-blue-500/10 text-blue-400' },
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      setCampaigns(await api.getCampaigns())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleStart(id: string, e: React.MouseEvent) {
    e.preventDefault()
    try {
      const res = await api.startCampaign(id)
      toast.success(`${res.queued} disparos enfileirados (~${res.estimatedMinutes} min)`)
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handlePause(id: string, e: React.MouseEvent) {
    e.preventDefault()
    try {
      await api.pauseCampaign(id, 'Pausado manualmente')
      toast.success('Campanha pausada')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm('Remover campanha?')) return
    try {
      await api.deleteCampaign(id)
      toast.success('Campanha removida')
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Campanhas</h1>
          <p className="text-sm text-[var(--foreground-2)] mt-0.5">
            {campaigns.filter(c => c.status === 'running').length} ativas de {campaigns.length} total
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 h-8 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors"
        >
          <Plus size={14} />
          Nova Campanha
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 h-20 shimmer" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-16 text-center">
          <Megaphone size={32} className="mx-auto mb-3 text-[var(--muted)]" />
          <div className="text-sm font-medium mb-1">Nenhuma campanha criada</div>
          <div className="text-xs text-[var(--muted)] mb-4">Crie sua primeira campanha para começar a disparar</div>
          <Link href="/campaigns/new" className="text-xs text-emerald-400 hover:text-emerald-300">
            + Criar campanha
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => {
            const st = STATUS_MAP[c.status] || STATUS_MAP.draft
            return (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="block bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-2)] hover:bg-[var(--surface-2)] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-sm font-semibold truncate">{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                      {c.list && <span className="text-emerald-500/70">Base: {c.list.name}</span>}
                      <span>{c.templateId ? `Template: ${c.templateId}` : 'Sem template'}</span>
                      <span>{formatNumber(c._count?.dispatches || 0)} disparos</span>
                      {c.pausedReason && <span className="text-amber-500 truncate max-w-xs">{c.pausedReason}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.preventDefault()}>
                    {c.status !== 'running' && (
                      <button
                        onClick={e => handleStart(c.id, e)}
                        className="p-2 rounded-md hover:bg-emerald-500/10 text-[var(--muted)] hover:text-emerald-400 transition-colors"
                        title="Iniciar"
                      >
                        <Play size={14} />
                      </button>
                    )}
                    {c.status === 'running' && (
                      <button
                        onClick={e => handlePause(c.id, e)}
                        className="p-2 rounded-md hover:bg-amber-500/10 text-[var(--muted)] hover:text-amber-400 transition-colors"
                        title="Pausar"
                      >
                        <Pause size={14} />
                      </button>
                    )}
                    <button
                      onClick={e => handleDelete(c.id, e)}
                      className="p-2 rounded-md hover:bg-red-500/10 text-[var(--muted)] hover:text-red-400 transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={14} className="text-[var(--muted)] ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
