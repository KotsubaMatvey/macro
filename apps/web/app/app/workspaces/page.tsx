import Link from 'next/link'
import { createElement as h } from 'react'
import type { ReactNode } from 'react'
import type { WorkspaceEntry } from '@macroaccess/types'

import { DataTable, EmptyState, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { WorkspaceManager } from '@/components/app/workspace-manager'
import { getWorkspaces } from '@/lib/server/api'

function formatTime(value: string) {
 return value.replace('T', ' ').slice(0, 16)
}

export default async function WorkspacesPage() {
 const workspaces = await getWorkspaces() as WorkspaceEntry[]
 const presets = workspaces.filter(function (item) { return item.isPreset })
 const custom = workspaces.filter(function (item) { return !item.isPreset })
 const metrics = [
  { label: 'Workspaces', value: String(workspaces.length), note: 'Saved desk layouts and views available for quick restoration.' },
  { label: 'Presets', value: String(presets.length), note: 'Default operator presets shipped with the workstation.' },
  { label: 'Custom', value: String(custom.length), note: 'User-saved workspaces scoped to the authenticated account.' },
  { label: 'Modules', value: String(Array.from(new Set(workspaces.flatMap(function (item) { return item.moduleKeys }))).length), note: 'Unique modules covered by saved desk definitions.' },
 ]
 const presetRows: ReactNode[][] = presets.map(function (item) {
  return [item.name, item.moduleKeys.join(', '), item.activeRoute, formatTime(item.updatedAt)]
 })
 return h(PageShell, { title: 'Workspaces', subtitle: 'Saved desk layouts and presets for faster operator workflows across modules.', active: 'workspaces' }, h('div', { className: 'space-y-4' }, [
  h(MetricGrid, { key: 'metrics', items: metrics }),
 h(Panel, { key: 'manager', title: 'Workspace manager', subtitle: 'Create, load, rename, and delete user-scoped workspaces. Save current route context directly into reusable desk presets.', level: 'command' }, h(WorkspaceManager, { initialWorkspaces: workspaces })),
  h('div', { key: 'grid', className: 'ws-two-panel' }, [
   h(Panel, { key: 'presets', title: 'Default desk presets', subtitle: 'Prebuilt operator presets for macro desk, event day, news/calendar, geoboard focus, and reactions/bias review.', level: 'support' }, presetRows.length !== 0 ? h(DataTable, { headers: ['Preset', 'Modules', 'Route', 'Updated'], rows: presetRows, dense: true, stickyHeader: true }) : h(EmptyState, { title: 'No preset workflows', body: 'Preset desk workflows are not loaded. Custom captures still work from the manager above.', tone: 'integrity' })),
   h(Panel, { key: 'workflow', title: 'Workspace workflow pivots', subtitle: 'Use workspace restore as a routing layer between calendar, news, geoboard, reactions, and provider diagnostics.', level: 'support' }, h(DataTable, { headers: ['Action', 'Use'], rows: [
    [h(Link, { href: '/app/dashboard', className: 'terminal-link text-sm' }, 'Open dashboard'), 'Start from macro desk baseline before loading a saved workspace.'],
    [h(Link, { href: '/app/macro-calendar', className: 'terminal-link text-sm' }, 'Open calendar'), 'Save filtered catalyst windows into reusable event-day desks.'],
    [h(Link, { href: '/app/data-sources', className: 'terminal-link text-sm' }, 'Open data sources'), 'Check provider health before persisting a workflow state.'],
    [h(Link, { href: '/app/relationship-map', className: 'terminal-link text-sm' }, 'Open relationship map'), 'Pivot from workspace context into graph-linked entity exploration.'],
   ], dense: true })),
  ]),
 ]))
}
