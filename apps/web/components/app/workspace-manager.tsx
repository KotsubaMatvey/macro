'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { WorkspaceEntry } from '@macroaccess/types'

import { deleteJson, getJson, patchJson, postJson } from '@/lib/client/api'

function moduleKeysFromRoute(route: string): string[] {
 const clean = route.split('?')[0]
 const parts = clean.split('/').filter(Boolean)
 if (parts.length < 2) return ['dashboard']
 return [parts[1]]
}

function nowRoute(pathname: string, query: string) {
 if (!query) return pathname
 return pathname + '?' + query
}

function graphHrefForRoute(route: string) {
 try {
  const url = new URL(route, 'http://workspace.local')
  const path = url.pathname
  const eventMatch = path.match(/^\/app\/events\/([^/?#]+)/)
  if (eventMatch) return '/app/relationship-map?entity_type=scheduled_event&ref_id=' + encodeURIComponent(decodeURIComponent(eventMatch[1]))
  const focus = url.searchParams.get('focus')
  if (path === '/app/news' && focus) return '/app/relationship-map?entity_type=news_item&ref_id=' + encodeURIComponent(focus)
  const asset = url.searchParams.get('asset')
  if (path === '/app/market-bias' && asset) return '/app/relationship-map?entity_type=asset&ref_id=' + encodeURIComponent(asset.toUpperCase())
  return '/app/relationship-map'
 } catch {
  return '/app/relationship-map'
 }
}

function moduleChip(key: string) {
 return <span key={key} className='rounded-[7px] border border-white/[0.055] bg-white/[0.012] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400'>{key}</span>
}

export function WorkspaceManager(props: { initialWorkspaces: WorkspaceEntry[] }) {
 const [items, setItems] = useState<WorkspaceEntry[]>(props.initialWorkspaces || [])
 const [name, setName] = useState('')
 const [isPending, startTransition] = useTransition()
 const pathname = usePathname()
 const params = useSearchParams()
 const router = useRouter()
 const currentRoute = useMemo(function () {
  return nowRoute(pathname, params.toString())
 }, [pathname, params])

 async function reload() {
  const payload = await getJson('/api/v1/workspaces')
  if (!Array.isArray(payload)) throw new Error('Invalid workspace payload')
  setItems(payload as WorkspaceEntry[])
 }

 function onCreate() {
  const trimmed = name.trim()
  if (trimmed.length < 2) return
  startTransition(function () {
   postJson('/api/v1/workspaces', {
    name: trimmed,
    moduleKeys: moduleKeysFromRoute(currentRoute),
    filters: {},
    layout: { density: 'dense' },
    routes: [currentRoute],
    activeRoute: currentRoute,
   })
    .then(function () {
     setName('')
     return reload()
    })
    .catch(function (error) {
     console.error('Workspace create failed', error)
    })
  })
 }

 function onSaveCurrent() {
  const suggested = window.prompt('Workspace name', 'Desk preset')
  if (!suggested || suggested.trim().length < 2) return
  startTransition(function () {
   postJson('/api/v1/workspaces', {
    name: suggested.trim(),
    moduleKeys: moduleKeysFromRoute(currentRoute),
    filters: { search: params.get('search') || '' },
    layout: { density: 'dense' },
    routes: [currentRoute],
    activeRoute: currentRoute,
   })
    .then(function () { return reload() })
    .catch(function (error) {
     console.error('Workspace save current failed', error)
    })
  })
 }

 function onRename(item: WorkspaceEntry) {
  const next = window.prompt('Rename workspace', item.name)
  if (!next || next.trim().length < 2 || next.trim() === item.name) return
  startTransition(function () {
   patchJson('/api/v1/workspaces/' + encodeURIComponent(item.id), { name: next.trim() })
    .then(function () { return reload() })
    .catch(function (error) {
     console.error('Workspace rename failed', error)
    })
  })
 }

 function onDelete(item: WorkspaceEntry) {
  if (!window.confirm('Delete workspace "' + item.name + '"?')) return
  startTransition(function () {
   deleteJson('/api/v1/workspaces/' + encodeURIComponent(item.id))
    .then(function () { return reload() })
    .catch(function (error) {
     console.error('Workspace delete failed', error)
    })
  })
 }

 function onOpen(item: WorkspaceEntry) {
  router.push(item.activeRoute || '/app/dashboard')
 }

 function onCaptureCurrent(item: WorkspaceEntry) {
  const mergedRoutes = Array.from(new Set([currentRoute].concat(item.routes || [])))
  startTransition(function () {
   patchJson('/api/v1/workspaces/' + encodeURIComponent(item.id), {
    moduleKeys: moduleKeysFromRoute(currentRoute),
    routes: mergedRoutes,
    activeRoute: currentRoute,
    filters: { ...(item.filters || {}), search: params.get('search') || '' },
   })
    .then(function () { return reload() })
    .catch(function (error) {
     console.error('Workspace capture current failed', error)
    })
  })
 }

 return <div className='space-y-3'>
  <div className='terminal-strip'>
   <span className='terminal-meta'><strong>{String(items.length)}</strong> workspaces</span>
   <span className='terminal-meta'><strong>{String(items.filter(function (item) { return item.isPreset }).length)}</strong> presets</span>
   <span className='terminal-meta'><strong>{isPending ? 'Saving' : 'Ready'}</strong> status</span>
  </div>
  <div className='flex flex-wrap items-center gap-2'>
   <input
    value={name}
    onChange={function (event) { setName(event.target.value) }}
    placeholder='New workspace name'
    className='w-full max-w-[320px] rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-400/30'
   />
   <button type='button' onClick={onCreate} className='desk-tab desk-tab-active'>Create</button>
   <button type='button' onClick={onSaveCurrent} className='desk-tab'>Save current view</button>
  </div>
  <div className='grid gap-2.5'>
   {items.map(function (item) {
    const graphHref = graphHrefForRoute(item.activeRoute || '')
    const routeChain = (item.routes || []).slice(0, 3)
    return <div key={item.id} className='ws-link-card group'>
     <div className='flex flex-wrap items-start justify-between gap-3'>
      <div className='min-w-0'>
       <div className='flex flex-wrap items-center gap-1.5'>
        <span className='text-sm font-medium text-white'>{item.name}</span>
        {item.isPreset ? <span className='ws-badge ws-badge-mixed'>preset</span> : null}
        {item.presetKey ? <span className='ws-badge ws-badge-quiet'>{item.presetKey}</span> : null}
       </div>
       <div className='mt-1 ws-mono text-[10px] text-slate-500'>{item.activeRoute}</div>
       <div className='mt-2 flex flex-wrap gap-1.5'>{item.moduleKeys.length !== 0 ? item.moduleKeys.map(moduleChip) : moduleChip('unscoped')}</div>
       <div className='mt-2 grid gap-1'>
        {routeChain.map(function (route, index) {
         return <div key={route + String(index)} className='flex items-center gap-2 text-[10px] text-slate-500'>
          <span className='ws-mono text-slate-600'>{String(index + 1).padStart(2, '0')}</span>
          <span className='truncate ws-mono'>{route}</span>
         </div>
        })}
       </div>
       <div className='mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-600'>{item.isPreset ? 'Default operator workflow' : 'Custom saved desk workflow'} / Last used {item.lastUsedAt.replace('T', ' ').slice(0, 16)}</div>
      </div>
      <div className='flex flex-wrap gap-1.5'>
       <button type='button' onClick={function () { onOpen(item) }} className='desk-tab desk-tab-active'>Open</button>
       <button type='button' onClick={function () { onCaptureCurrent(item) }} className='desk-tab'>Capture current</button>
       <Link href={graphHref} className='desk-tab'>Graph</Link>
       <button type='button' onClick={function () { onRename(item) }} className='desk-tab'>Rename</button>
       {!item.isPreset ? <button type='button' onClick={function () { onDelete(item) }} className='desk-tab'>Delete</button> : null}
      </div>
     </div>
    </div>
   })}
   {items.length === 0 ? <div className='ws-empty-state'><div className='ws-empty-title'>No saved desk workflows</div><p className='ws-empty-body'>Capture the current route to create a reusable operator preset for this module context.</p></div> : null}
  </div>
 </div>
}
