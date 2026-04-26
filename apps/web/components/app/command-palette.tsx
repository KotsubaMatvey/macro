'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getJson } from '@/lib/client/api'

interface CommandItem {
 id: string
 group: 'Navigation' | 'Workspaces' | 'Entities' | 'Providers' | 'Graph' | 'Actions'
 title: string
 subtitle: string
 href: string
 keywords: string[]
}

function staticCommands(): CommandItem[] {
 return [
  { id: 'nav-dashboard', group: 'Navigation', title: 'Open Dashboard', subtitle: 'Desk overview and catalyst board', href: '/app/dashboard', keywords: ['dashboard', 'desk', 'overview'] },
  { id: 'nav-calendar', group: 'Navigation', title: 'Open Macro Calendar', subtitle: 'Event tape and catalyst filters', href: '/app/macro-calendar', keywords: ['calendar', 'events', 'catalysts'] },
  { id: 'nav-news', group: 'Navigation', title: 'Open News Wire', subtitle: 'Official and discovery headline feed', href: '/app/news', keywords: ['news', 'wire', 'headlines'] },
  { id: 'nav-geoboard', group: 'Navigation', title: 'Open Geoboard', subtitle: 'Geo + macro map layers', href: '/app/geoboard', keywords: ['geoboard', 'map', 'geo'] },
  { id: 'nav-reactions', group: 'Navigation', title: 'Open Reactions', subtitle: 'Reaction tape by event family and asset', href: '/app/live-reactions', keywords: ['reactions', 'tape', 'event windows'] },
  { id: 'nav-bias', group: 'Navigation', title: 'Open Market Bias', subtitle: 'Cross-asset directional context', href: '/app/market-bias', keywords: ['bias', 'market', 'signals'] },
  { id: 'nav-reports', group: 'Navigation', title: 'Open Reports Archive', subtitle: 'Weekly macro report history', href: '/app/reports', keywords: ['reports', 'archive', 'weekly'] },
  { id: 'nav-alerts', group: 'Actions', title: 'Open Alerts', subtitle: 'Trigger and reminder rules', href: '/app/alerts', keywords: ['alerts', 'trigger', 'rules'] },
  { id: 'nav-watchlists', group: 'Entities', title: 'Open Watchlists', subtitle: 'Desk baskets and linked assets', href: '/app/watchlists', keywords: ['watchlists', 'assets', 'baskets'] },
  { id: 'nav-provider', group: 'Providers', title: 'Open Data Sources', subtitle: 'Provider control room and affected surfaces', href: '/app/data-sources', keywords: ['providers', 'sources', 'control plane', 'affected'] },
  { id: 'nav-graph', group: 'Graph', title: 'Open Relationship Map', subtitle: 'Entity graph console', href: '/app/relationship-map', keywords: ['graph', 'relationship', 'map'] },
  { id: 'nav-workspaces', group: 'Workspaces', title: 'Open Workspaces', subtitle: 'Saved desk presets and layout restore', href: '/app/workspaces', keywords: ['workspace', 'preset', 'layout'] },
  { id: 'action-save-workspace', group: 'Actions', title: 'Save Current View', subtitle: 'Open Workspaces to capture this route into a desk preset', href: '/app/workspaces', keywords: ['save current', 'capture', 'workspace'] },
  { id: 'action-inspect-providers', group: 'Providers', title: 'Inspect Affected Providers', subtitle: 'Open provider control room and degraded/fallback queue', href: '/app/data-sources', keywords: ['inspect affected providers', 'degraded', 'fallback'] },
 ]
}

function eventIdFromPath(pathname: string): string | null {
 const match = pathname.match(/^\/app\/events\/([^/?#]+)/)
 if (!match) return null
 return decodeURIComponent(match[1])
}

function focusNewsIdFromLocation(): string | null {
 try {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('focus')
  return value ? value : null
 } catch {
  return null
 }
}

function focusAssetFromLocation(pathname: string): string | null {
 if (!pathname.startsWith('/app/market-bias')) return null
 try {
  const params = new URLSearchParams(window.location.search)
  const value = params.get('asset')
  return value ? value.toUpperCase() : null
 } catch {
  return null
 }
}

export function CommandPalette() {
 const router = useRouter()
 const pathname = usePathname()
 const [open, setOpen] = useState(false)
 const [query, setQuery] = useState('')
 const [cursor, setCursor] = useState(0)
 const [dynamicCommands, setDynamicCommands] = useState<CommandItem[]>([])
 const [dynamicLoading, setDynamicLoading] = useState(false)
 const [dynamicIssue, setDynamicIssue] = useState('')

 useEffect(function () {
  if (!open) return
  let active = true
  async function loadDynamic() {
   const commands: CommandItem[] = []
   let degraded = false
   setDynamicLoading(true)
   setDynamicIssue('')
   try {
    const events = await getJson('/api/v1/events')
    if (Array.isArray(events)) {
     const highImpact = events.find(function (item: any) { return item && item.id && String(item.impact || '').toLowerCase() === 'high' })
     if (highImpact) {
      commands.push({
       id: 'dynamic-high-impact',
       group: 'Entities',
       title: 'Open Latest High-Impact Event',
       subtitle: String(highImpact.title || highImpact.id),
       href: '/app/events/' + encodeURIComponent(String(highImpact.id)),
       keywords: ['high impact', 'event', 'calendar'],
      })
     }
  }
  } catch (error) {
   degraded = true
  }
  try {
    const geoPayload = await getJson('/api/geoboard/feed?mode=STANDARD')
    const topFeed = geoPayload && Array.isArray(geoPayload.feed) ? geoPayload.feed[0] : null
    if (topFeed && topFeed.id) {
     commands.push({
      id: 'dynamic-geoboard',
      group: 'Entities',
      title: 'Open Top Geoboard Signal',
      subtitle: String(topFeed.title || topFeed.id),
      href: '/app/geoboard',
      keywords: ['geoboard', 'signal', 'top ranked'],
     })
     if (topFeed.linkedEventId) {
      commands.push({
       id: 'dynamic-geoboard-graph',
       group: 'Graph',
       title: 'Open Relationship Map for Top Signal Event',
       subtitle: String(topFeed.linkedEventId),
       href: '/app/relationship-map?entity_type=scheduled_event&ref_id=' + encodeURIComponent(String(topFeed.linkedEventId)),
       keywords: ['graph', 'relationship', 'signal event'],
      })
     }
  }
  } catch (error) {
   degraded = true
  }
  try {
    const newsPayload = await getJson('/api/v1/news?mode=macro&limit=1')
    const newsItem = newsPayload && Array.isArray(newsPayload.items) ? newsPayload.items[0] : null
    if (newsItem && newsItem.id) {
      commands.push({
       id: 'dynamic-news',
       group: 'Entities',
       title: 'Open Latest Macro-Only News',
       subtitle: String(newsItem.title || newsItem.id),
       href: '/app/news?focus=' + encodeURIComponent(String(newsItem.id)),
       keywords: ['news', 'macro only', 'latest'],
      })
  }
  } catch (error) {
   degraded = true
  }
  try {
    const workspaces = await getJson('/api/v1/workspaces')
    if (Array.isArray(workspaces)) {
     workspaces.slice(0, 8).forEach(function (item: any) {
      if (!item || !item.id || !item.name) return
      commands.push({
       id: 'workspace-' + String(item.id),
       group: 'Workspaces',
       title: 'Open Workspace: ' + String(item.name),
       subtitle: String(item.activeRoute || '/app/dashboard'),
       href: String(item.activeRoute || '/app/dashboard'),
       keywords: ['workspace', 'preset', String(item.name).toLowerCase()],
      })
     })
  }
  } catch (error) {
   degraded = true
  }
  const eventId = eventIdFromPath(pathname)
  if (eventId) {
    commands.push({
     id: 'dynamic-current-event-graph',
     group: 'Graph',
     title: 'Open Relationship Map for Current Event',
     subtitle: eventId,
     href: '/app/relationship-map?entity_type=scheduled_event&ref_id=' + encodeURIComponent(eventId),
    keywords: ['graph', 'current event', 'relationship map'],
   })
  }
   const focusNewsId = focusNewsIdFromLocation()
   if (focusNewsId) {
   commands.push({
     id: 'dynamic-focus-news-graph',
     group: 'Graph',
     title: 'Open Relationship Map for Focus News',
     subtitle: focusNewsId,
     href: '/app/relationship-map?entity_type=news_item&ref_id=' + encodeURIComponent(focusNewsId),
     keywords: ['graph', 'news', 'focus'],
    })
   }
   const focusAsset = focusAssetFromLocation(pathname)
   if (focusAsset) {
    commands.push({
     id: 'dynamic-focus-asset-graph',
     group: 'Graph',
     title: 'Open Relationship Map for Focus Asset',
     subtitle: focusAsset,
     href: '/app/relationship-map?entity_type=asset&ref_id=' + encodeURIComponent(focusAsset),
     keywords: ['graph', 'asset', 'bias'],
    })
   }
   if (active) {
    setDynamicCommands(commands)
    setDynamicIssue(degraded ? 'Dynamic desk commands degraded. Static navigation remains available.' : '')
    setDynamicLoading(false)
   }
  }
  loadDynamic()
  return function () { active = false }
 }, [open, pathname])

 const commands = useMemo(function () {
  return staticCommands().concat(dynamicCommands)
 }, [dynamicCommands])

 const filtered = useMemo(function () {
  const needle = query.trim().toLowerCase()
  if (!needle) return commands
   return commands.filter(function (item) {
    const corpus = [item.title, item.subtitle].concat(item.keywords).join(' ').toLowerCase()
    return corpus.includes(needle)
   })
  }, [commands, query])
 const selectedIndex = filtered.length === 0 ? 0 : Math.min(cursor, filtered.length - 1)
 const grouped = useMemo(function () {
  const order = ['Navigation', 'Workspaces', 'Entities', 'Providers', 'Graph', 'Actions']
  return order.map(function (group) {
   return { group: group, items: filtered.filter(function (item) { return item.group === group }) }
  }).filter(function (entry) { return entry.items.length !== 0 })
 }, [filtered])

 useEffect(function () {
  function onKey(event: KeyboardEvent) {
   if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    setOpen(function (state) { return !state })
    return
   }
   if (!open) return
   if (event.key === 'Escape') {
    event.preventDefault()
    setOpen(false)
    return
   }
   if (event.key === 'ArrowDown') {
    event.preventDefault()
    setCursor(function (value) { return filtered.length === 0 ? 0 : Math.min(filtered.length - 1, value + 1) })
    return
   }
   if (event.key === 'ArrowUp') {
    event.preventDefault()
    setCursor(function (value) { return filtered.length === 0 ? 0 : Math.max(0, value - 1) })
    return
   }
  }
  window.addEventListener('keydown', onKey)
  return function () { window.removeEventListener('keydown', onKey) }
 }, [open, filtered.length])

 function run(command: CommandItem) {
  setOpen(false)
  setQuery('')
  setCursor(0)
  router.push(command.href)
 }

 return <>
  <button type='button' className='desk-tab' aria-label='Open command palette' onClick={function () { setOpen(true) }}>Cmd K</button>
  {open ? <div className='cmdk-overlay' role='dialog' aria-modal='true' aria-label='Command palette' onMouseDown={function (event) { if (event.target === event.currentTarget) setOpen(false) }}>
   <div className='cmdk-panel'>
    <div className='cmdk-head'>
     <input
      autoFocus
      value={query}
      onChange={function (event) { setQuery(event.target.value); setCursor(0) }}
      placeholder='Type a command, module, workspace, event, provider...'
      className='cmdk-input'
      aria-label='Command search'
      onKeyDown={function (event) {
       if (event.key === 'Enter') {
        event.preventDefault()
        const selected = filtered[selectedIndex]
        if (selected) run(selected)
       }
     }}
     />
     {dynamicIssue ? <div className='mt-2 text-[10px] uppercase tracking-[0.16em] text-amber-300/80'>{dynamicIssue}</div> : null}
    </div>
    <div className='cmdk-list' role='listbox' aria-label='Command results'>
     {grouped.map(function (entry) {
      return <div key={entry.group}>
       <div className='cmdk-group'>{entry.group}</div>
       {entry.items.map(function (item) {
      const index = filtered.indexOf(item)
      const active = index === selectedIndex
      return <button
       key={item.id + '-' + String(index)}
       type='button'
       role='option'
       aria-selected={active}
       onMouseEnter={function () { setCursor(index) }}
       onClick={function () { run(item) }}
       className={active ? 'cmdk-item cmdk-item-active' : 'cmdk-item'}
      >
       <div className='cmdk-row'>
        <div className='min-w-0'>
         <div className='cmdk-title'>{item.title}</div>
         <div className='cmdk-subtitle'>{item.subtitle}</div>
        </div>
        <span className='cmdk-key'>{active ? 'ENTER' : item.group.toUpperCase().slice(0, 4)}</span>
       </div>
      </button>
     })}
      </div>
     })}
     {dynamicLoading ? <div className='cmdk-empty'>Loading dynamic desk commands...</div> : null}
     {filtered.length === 0 && !dynamicLoading ? <div className='cmdk-empty'>No matching commands. Static navigation, providers, graph, and workspace actions remain available.</div> : null}
    </div>
    <div className='cmdk-foot'>
     <span className='terminal-meta'>Enter to run</span>
     <span className='terminal-meta'>Esc to close</span>
     <span className='terminal-meta'>Ctrl/Cmd+K to open</span>
    </div>
   </div>
  </div> : null}
 </>
}
