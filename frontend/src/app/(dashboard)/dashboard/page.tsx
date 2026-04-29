'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'
import {
  MessageSquare, CheckCheck, Eye, AlertCircle,
  Clock, Users, RefreshCw, TrendingUp
} from 'lucide-react'

function StatCard({
  label, value, sub, icon: Icon, color, shimmer
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; shimmer?: boolean
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 relative overflow-hidden group hover:border-[var(--border-2)] transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-[var(--foreground-2)] font-medium uppercase tracking-wider mb-3">{label}</div>
          {shimmer ? (
            <div className="h-7 w-20 shimmer rounded" />
          ) : (
            <div className="text-2xl font-semibold tracking-tight">{value}</div>
          )}
          {sub && !shimmer && <div className="text-xs text-[var(--muted)] mt-1">{sub}</div>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} />
        </div>
      </div>
    </div>
  )
}

function StatusBar({ data }: { data: any }) {
  if (!data) return null
  const { total, sent, delivered, read, failed, pending } = data
  if (!total) return <div className="text-xs text-[var(--muted)] py-4 text-center">Sem dados de disparo</div>

  const segments = [
    { label: 'Lida', value: read, color: '#34d399' },
    { label: 'Entregue', value: delivered, color: '#10b981' },
    { label: 'Enviada', value: sent, color: '#f59e0b' },
    { label: 'Pendente', value: pending, color: '#3b82f6' },
    { label: 'Falha', value: failed, color: '#ef4444' },
  ]

  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-2 bg-[var(--surface-3)]">
        {segments.map(s => (
          s.value > 0 && (
            <div
              key={s.label}
              style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
              title={`${s.label}: ${s.value}`}
            />
          )
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-[var(--foreground-2)]">
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            {s.label} <span className="text-foreground font-medium">{formatNumber(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = useCallback(async () => {
    try {
      const res = await api.getDashboard()
      setData(res)
      setLastRefresh(new Date())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  const ov = data?.overview || {}
  const shimmer = loading && !data

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-[var(--foreground-2)] mt-0.5">
            Visão geral dos disparos em tempo real
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-xs text-[var(--foreground-2)] hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-[var(--surface-2)] border border-[var(--border)]"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Disparos"
          value={shimmer ? '—' : formatNumber(ov.total || 0)}
          sub={`${ov.progress || 0}% concluído`}
          icon={MessageSquare}
          color="bg-[var(--surface-3)] text-[var(--foreground-2)]"
          shimmer={shimmer}
        />
        <StatCard
          label="Entregues"
          value={shimmer ? '—' : formatNumber((ov.delivered || 0) + (ov.read || 0))}
          sub={`Taxa: ${ov.delivery_rate || 0}%`}
          icon={CheckCheck}
          color="bg-emerald-500/10 text-emerald-400"
          shimmer={shimmer}
        />
        <StatCard
          label="Lidas"
          value={shimmer ? '—' : formatNumber(ov.read || 0)}
          sub={`Taxa: ${ov.read_rate || 0}%`}
          icon={Eye}
          color="bg-emerald-500/15 text-emerald-300"
          shimmer={shimmer}
        />
        <StatCard
          label="Falhas"
          value={shimmer ? '—' : formatNumber(ov.failed || 0)}
          sub={ov.total ? `${((ov.failed / ov.total) * 100).toFixed(1)}% do total` : '0%'}
          icon={AlertCircle}
          color="bg-red-500/10 text-red-400"
          shimmer={shimmer}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Pendentes"
          value={shimmer ? '—' : formatNumber(ov.pending || 0)}
          icon={Clock}
          color="bg-blue-500/10 text-blue-400"
          shimmer={shimmer}
        />
        <StatCard
          label="Total Leads"
          value={shimmer ? '—' : formatNumber(data?.totalLeads || 0)}
          icon={Users}
          color="bg-[var(--surface-3)] text-[var(--foreground-2)]"
          shimmer={shimmer}
        />
        <StatCard
          label="Números Ativos"
          value={shimmer ? '—' : formatNumber(data?.numbers?.filter((n: any) => n.active).length || 0)}
          sub={`de ${data?.numbers?.length || 0} cadastrados`}
          icon={TrendingUp}
          color="bg-amber-500/10 text-amber-400"
          shimmer={shimmer}
        />
      </div>

      {/* Progress bar */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Distribuição de Status</h2>
          <span className="text-xs text-[var(--muted)]">
            {lastRefresh.toLocaleTimeString('pt-BR')}
          </span>
        </div>
        {shimmer ? (
          <div className="h-2 shimmer rounded-full" />
        ) : (
          <StatusBar data={ov} />
        )}
      </div>

      {/* Campaigns */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-medium">Campanhas Recentes</h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {shimmer ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                <div className="h-3.5 w-40 shimmer rounded" />
                <div className="h-3.5 w-16 shimmer rounded ml-auto" />
              </div>
            ))
          ) : !data?.campaigns?.length ? (
            <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">
              Nenhuma campanha criada ainda
            </div>
          ) : (
            data.campaigns.map((c: any) => (
              <div key={c.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-[var(--surface-2)] transition-colors">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">{c._count?.dispatches || 0} disparos</div>
                </div>
                <div className="ml-auto">
                  <CampaignBadge status={c.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Numbers */}
      {data?.numbers?.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-medium">Números WhatsApp</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {data.numbers.map((n: any) => (
              <div key={n.id} className="px-5 py-3 flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${n.active && !n.restrictionStatus ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div>
                  <div className="text-sm font-mono">{n.phone}</div>
                  <div className="text-xs text-[var(--muted)]">{n.appName}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs text-[var(--foreground-2)]">{formatNumber(n.sentCount)} enviados</div>
                  <div className="text-xs text-[var(--muted)]">limite {formatNumber(n.dailyLimit)}/dia</div>
                </div>
                {/* Usage bar */}
                <div className="w-20 h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min((n.sentCount / n.dailyLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CampaignBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-[var(--surface-3)] text-[var(--foreground-2)]',
    running: 'bg-emerald-500/10 text-emerald-400',
    paused: 'bg-amber-500/10 text-amber-400',
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
