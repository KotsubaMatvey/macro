import { createElement as h } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(function () {
 return { getWorkspaces: vi.fn() }
})

vi.mock('@/lib/server/api', function () {
 return { getWorkspaces: api.getWorkspaces }
})

vi.mock('@/components/app/workspace-manager', function () {
 return {
  WorkspaceManager: function WorkspaceManager(props: any) {
   return h('div', { 'data-testid': 'workspace-manager' }, String(props.initialWorkspaces ? props.initialWorkspaces.length : 0))
  },
 }
})

vi.mock('@/components/app/chrome', function () {
 return {
  PageShell: function PageShell(props: any) {
   return h('div', { 'data-testid': 'page-shell', 'data-active': props.active }, [h('h1', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)])
  },
  Panel: function Panel(props: any) {
   return h('section', {}, [h('h2', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)])
  },
  MetricGrid: function MetricGrid() {
   return h('div', {}, 'metrics')
  },
  EmptyState: function EmptyState(props: any) {
   return h('div', {}, [h('strong', { key: 'title' }, props.title), h('p', { key: 'body' }, props.body), props.action])
  },
  DataTable: function DataTable(props: any) {
   return h('table', {}, [
    h('thead', { key: 'head' }, h('tr', {}, props.headers.map(function (header: string, index: number) { return h('th', { key: header + String(index) }, header) }))),
    h('tbody', { key: 'body' }, (props.rows || []).map(function (row: any[], rowIndex: number) {
     return h('tr', { key: rowIndex }, row.map(function (cell: any, cellIndex: number) { return h('td', { key: String(rowIndex) + '-' + String(cellIndex) }, cell) }))
    })),
   ])
  },
 }
})

import WorkspacesPage from '@/app/app/workspaces/page'

describe('WorkspacesPage', function () {
 it('renders workspace manager with presets and workflow pivots', async function () {
  api.getWorkspaces.mockResolvedValue([
   {
    id: 'workspace-1',
    name: 'Macro Desk',
    presetKey: 'macro_desk',
    isPreset: true,
    moduleKeys: ['dashboard', 'macro-calendar'],
    filters: {},
    layout: {},
    routes: ['/app/dashboard'],
    activeRoute: '/app/dashboard',
    createdAt: '2026-04-22T07:00:00+00:00',
    updatedAt: '2026-04-22T07:30:00+00:00',
    lastUsedAt: '2026-04-22T07:45:00+00:00',
   },
   {
    id: 'workspace-2',
    name: 'Desk Runbook',
    presetKey: null,
    isPreset: false,
    moduleKeys: ['news', 'macro-calendar'],
    filters: { mode: 'macro' },
    layout: {},
    routes: ['/app/news?mode=macro'],
    activeRoute: '/app/news?mode=macro',
    createdAt: '2026-04-22T07:00:00+00:00',
    updatedAt: '2026-04-22T07:30:00+00:00',
    lastUsedAt: '2026-04-22T07:45:00+00:00',
   },
  ])

  const view = await WorkspacesPage()
  render(view)
  expect(api.getWorkspaces).toHaveBeenCalledTimes(1)
  expect(screen.getByTestId('page-shell')).toHaveAttribute('data-active', 'workspaces')
  expect(screen.getByTestId('workspace-manager')).toHaveTextContent('2')
  expect(screen.getByText('Default desk presets')).toBeInTheDocument()
  expect(screen.getByText('Workspace workflow pivots')).toBeInTheDocument()
  expect(screen.getByText('Macro Desk')).toBeInTheDocument()
 }, 15000)
})
