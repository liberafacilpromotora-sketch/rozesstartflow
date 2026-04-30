'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { formatNumber } from '@/lib/utils'
import {
  ArrowLeft, Play, Pause, RefreshCw,
  CheckCheck, Eye, AlertCircle, Clock, MessageSquare
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', submitted: 'Submetido', enqueued: 'Enfileirado',
  sent: 'Enviada', delivered: 'Entregue', read: 'Lida',
  failed: 'Falhou', deleted: 'Deletada'
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-zinc-500',
    submitted: 'bg-blue-500',
    enqueued: 'bg-violet-500',
    sent: 'bg-amber-500',
    delivered: 'bg-emerald-500',
    read: 'bg-emerald-400',
    failed: 'bg-red-500',
    deleted: 'bg-zinc-600',
  }
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[status] || 'bg-zinc-500'}`} />
  )
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<any>(null)
  const [dispatches, setDispatches] = useState<any>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const [c, d, m] = await Promise.all([
        api.getCampaign(id),
        api.getCampaignDispatches(id, page, 50),
        api.getDashboard(id),
      ])
      setCampaign(c)
      setDispatches(d)
      setMetrics(m)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [id, page])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  async function handleStart() {
    setActionLoading(true)
    try {
      const res = await api.startCampaign(id)
      toast.success(`${res.queued} disparos enfileirados (~${res.estimatedMinutes} min)`)
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handlePause() {
    setActionLoading(true)
    try {
      await api.pauseCampaign(id)
      toast.success('Campanha pausada')
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const ov = metrics?.overview || {}
  const filteredDispatches = statusFilter
    ? dispatches?.data?.filter((d: any) => d.status === statusFilter)
    : dispatches?.data

  const statusCounts: Record<string, number> = {}
  dispatches?.data?.forEach((d: any) => {
    statusCounts[d.status] = (statusCounts[d.status] || 0) + 1
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="text-[var(--muted)] hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold">{campaign?.name || '—'}</h1>
              {campaign && (
                <CampaignBadge status={campaign.status} />
              )}
            </div>
            {campaign?.list && (
              <p className="text-xs text-emerald-500/80 mt-0.5">Base: {campaign.list.name}</p>
            )}
            {campaign?.templateId && (
              <p className="text-xs text-[var(--muted)] mt-0.5 font-mono">Template: {campaign.templateId}</p>
            )}
            {campaign?.pausedReason && (
              <p className="text-xs text-amber-400 mt-0.5">{campaign.pausedReason}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-foreground transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          {campaign?.status !== 'running' && (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="flex items-center gap-2 h-8 px-3.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-sm font-medium text-white transition-colors disabled:opacity-50"
            >
              <Play size={13} />
              {campaign?.status === 'paused' ? 'Retomar' : 'Iniciar'}
            </button>
          )}
          {campaign?.status === 'running' && (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="flex items-center gap-2 h-8 px-3.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Pause size={13} />
              Pausar
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: ov.total || 0, icon: MessageSquare, color: 'text-[var(--foreground-2)]' },
          { label: 'Enviadas', value: ov.sent || 0, icon: CheckCheck, color: 'text-amber-400' },
          { label: 'Entregues', value: (ov.delivered || 0) + (ov.read || 0), icon: CheckCheck, color: 'text-emerald-400' },
          { label: 'Lidas', value: ov.read || 0, icon: Eye, color: 'text-emerald-300' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--muted)]">{label}</span>
              <Icon size={14} className={color} />
            </div>
            <div className="text-xl font-semibold">{loading ? '—' : formatNumber(value)}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {ov.total > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex justify-between text-xs text-[var(--muted)] mb-2">
            <span>Progresso</span>
            <span>{ov.progress || 0}% concluído</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${ov.progress || 0}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-2.5">
            {[
              { label: 'Taxa Entrega', value: `${ov.delivery_rate || 0}%`, color: 'text-emerald-400' },
              { label: 'Taxa Leitura', value: `${ov.read_rate || 0}%`, color: 'text-emerald-300' },
              { label: 'Falhas', value: formatNumber(ov.failed || 0), color: 'text-red-400' },
              { label: 'Pendentes', value: formatNumber(ov.pending || 0), color: 'text-blue-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-xs">
                <span className="text-[var(--muted)]">{label}: </span>
                <span className={`font-medium ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispatches table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-medium">Disparos</h2>
          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['', 'pending', 'sent', 'delivered', 'read', 'failed'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === s
                    ? 'bg-[var(--surface-3)] text-foreground'
                    : 'text-[var(--muted)] hover:text-[var(--foreground-2)]'
                }`}
              >
                {s === '' ? 'Todos' : STATUS_LABELS[s]}
                {s && statusCounts[s] ? ` (${statusCounts[s]})` : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">Lead</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">Número</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">Enviado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--foreground-2)] uppercase tracking-wider">Entregue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 shimmer rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !filteredDispatches?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--muted)] text-sm">
                    {statusFilter ? `Nenhum disparo com status "${STATUS_LABELS[statusFilter]}"` : 'Nenhum disparo ainda. Inicie a campanha para começar.'}
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((d: any) => (
                  <tr key={d.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-4 py-3 font-medium text-xs">{d.lead?.fullName || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--foreground-2)]">{d.lead?.phone}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">{d.waNumber?.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full status-${d.status}`}>
                        <StatusDot status={d.status} />
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                      {d.errorMsg && (
                        <div className="text-xs text-red-400 mt-0.5 truncate max-w-[200px]" title={d.errorMsg}>
                          {d.errorMsg}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">
                      {d.sentAt ? new Date(d.sentAt).toLocaleTimeString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">
                      {d.deliveredAt ? new Date(d.deliveredAt).toLocaleTimeString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {dispatches && dispatches.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--muted)]">Página {page} de {dispatches.pages}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs rounded border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--surface-2)] transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(dispatches.pages, p + 1))}
                disabled={page >= dispatches.pages}
                className="px-3 py-1.5 text-xs rounded border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--surface-2)] transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CampaignBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft:    'bg-zinc-500/10 text-zinc-400',
    running:  'bg-emerald-500/10 text-emerald-400',
    paused:   'bg-amber-500/10 text-amber-400',
    finished: 'bg-blue-500/10 text-blue-400',
  }
  const label: Record<string, string> = {
    draft: 'Rascunho', running: 'Ativa', paused: 'Pausada', finished: 'Finalizada'
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || map.draft}`}>
      {label[status] || status}
    </span>
  )
}
