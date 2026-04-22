'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getJson } from '@/lib/client/api'

interface CommandItem {
 id: string
 title: string
 subtitle: string
 href: string
 keywords: string[]
}

function staticCommands(): CommandItem[] {
 return [
  { id: 'nav-dashboard', title: 'Open Dashboard', subtitle: 'Desk overview and catalyst board', href: '/app/dashboard', keywords: ['dashboard', 'desk', 'overview'] },
  { id: 'nav-calendar', title: 'Open Macro Calendar', subtitle: 'Event tape and catalyst filters', href: '/app/macro-calendar', keywords: ['calendar', 'events', 'catalysts'] },
  { id: 'nav-news', title: 'Open News Wire', subtitle: 'Official and discovery headline feed', href: '/app/news', keywords: ['news', 'wire', 'headlines'] },
  { id: 'nav-geoboard', title: 'Open Geoboard', subtitle: 'Geo + macro map layers', href: '/app/geoboard', keywords: ['geoboard', 'map', 'geo'] },
  { id: 'nav-reactions', title: 'Open Reactions', subtitle: 'Reaction tape by event family and asset', href: '/app/live-reactions', keywords: ['reactions', 'tape', 'event windows'] },
  { id: 'nav-bias', title: 'Open Market Bias', subtitle: 'Cross-asset directional context', href: '/app/market-bias', keywords: ['bias', 'market', 'signals'] },
  { id: 'nav-reports', title: 'Open Reports Archive', subtitle: 'Weekly macro report history', href: '/app/reports', keywords: ['reports', 'archive', 'weekly'] },
  { id: 'nav-alerts', title: 'Open Alerts', subtitle: 'Trigger and reminder rules', href: '/app/alerts', keywords: ['alerts', 'trigger', 'rules'] },
  { id: 'nav-watchlists', title: 'Open Watchlists', subtitle: 'Desk baskets and linked assets', href: '/app/watchlists', keywords: ['watchlists', 'assets', 'baskets'] },
  { id: 'nav-provider', title: 'Open Data Sources', subtitle: 'Provider control plane', href: '/app/data-sources', keywords: ['providers', 'sources', 'control plane'] },
  { id: 'nav-graph', title: 'Open Relationship Map', subtitle: 'Entity graph explorer', href: '/app/relationship-map', keywords: ['graph', 'relationship', 'map'] },
  { id: 'nav-workspaces', title: 'Open Workspaces', subtitle: 'Saved desk presets and layout restore', href: '/app/workspaces', keywords: ['workspace', 'preset', 'layout'] },
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

 useEffect(function () {
  if (!open) return
  let active = true
  async function loadDynamic() {
   const commands: CommandItem[] = []
   try {
    const events = await getJson('/api/v1/events')
    if (Array.isArray(events)) {
     const highImpact = events.find(function (item: any) { return item && item.id && String(item.impact || '').toLowerCase() === 'high' })
     if (highImpact) {
      commands.push({
       id: 'dynamic-high-impact',
       title: 'Open Latest High-Impact Event',
       subtitle: String(highImpact.title || highImpact.id),
       href: '/app/events/' + encodeURIComponent(String(highImpact.id)),
       keywords: ['high impact', 'event', 'calendar'],
      })
     }
   }
  } catch (error) {
   console.error('Command palette events load failed', error)
  }
  try {
    const geoPayload = await getJson('/api/geoboard/feed?mode=STANDARD')
    const topFeed = geoPayload && Array.isArray(geoPayload.feed) ? geoPayload.feed[0] : null
    if (topFeed && topFeed.id) {
     commands.push({
      id: 'dynamic-geoboard',
      title: 'Open Top Geoboard Signal',
      subtitle: String(topFeed.title || topFeed.id),
      href: '/app/geoboard',
      keywords: ['geoboard', 'signal', 'top ranked'],
     })
     if (topFeed.linkedEventId) {
      commands.push({
       id: 'dynamic-geoboard-graph',
       title: 'Open Relationship Map for Top Signal Event',
       subtitle: String(topFeed.linkedEventId),
       href: '/app/relationship-map?entity_type=scheduled_event&ref_id=' + encodeURIComponent(String(topFeed.linkedEventId)),
       keywords: ['graph', 'relationship', 'signal event'],
      })
     }
   }
  } catch (error) {
   console.error('Command palette geoboard load failed', error)
  }
  try {
    const newsPayload = await getJson('/api/v1/news?mode=macro&limit=1')
    const newsItem = newsPayload && Array.isArray(newsPayload.items) ? newsPayload.items[0] : null
    if (newsItem && newsItem.id) {
      commands.push({
       id: 'dynamic-news',
       title: 'Open Latest Macro-Only News',
       subtitle: String(newsItem.title || newsItem.id),
       href: '/app/news?focus=' + encodeURIComponent(String(newsItem.id)),
       keywords: ['news', 'macro only', 'latest'],
      })
   }
  } catch (error) {
   console.error('Command palette news load failed', error)
  }
  try {
    const workspaces = await getJson('/api/v1/workspaces')
    if (Array.isArray(workspaces)) {
     workspaces.slice(0, 8).forEach(function (item: any) {
      if (!item || !item.id || !item.name) return
      commands.push({
       id: 'workspace-' + String(item.id),
       title: 'Open Workspace: ' + String(item.name),
       subtitle: String(item.activeRoute || '/app/dashboard'),
       href: String(item.activeRoute || '/app/dashboard'),
       keywords: ['workspace', 'preset', String(item.name).toLowerCase()],
      })
     })
   }
  } catch (error) {
   console.error('Command palette workspace load failed', error)
  }
  const eventId = eventIdFromPath(pathname)
  if (eventId) {
    commands.push({
     id: 'dynamic-current-event-graph',
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
     title: 'Open Relationship Map for Focus Asset',
     subtitle: focusAsset,
     href: '/app/relationship-map?entity_type=asset&ref_id=' + encodeURIComponent(focusAsset),
     keywords: ['graph', 'asset', 'bias'],
    })
   }
   if (active) setDynamicCommands(commands)
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
  <button type='button' className='desk-tab' onClick={function () { setOpen(true) }}>Cmd K</button>
  {open ? <div className='cmdk-overlay' role='dialog' aria-modal='true'>
   <div className='cmdk-panel'>
    <div className='cmdk-head'>
     <input
      autoFocus
      value={query}
      onChange={function (event) { setQuery(event.target.value); setCursor(0) }}
      placeholder='Type a command, module, workspace, event, provider...'
      className='cmdk-input'
      onKeyDown={function (event) {
       if (event.key === 'Enter') {
        event.preventDefault()
        const selected = filtered[selectedIndex]
        if (selected) run(selected)
       }
      }}
     />
    </div>
    <div className='cmdk-list'>
     {filtered.map(function (item, index) {
      const active = index === selectedIndex
      return <button
       key={item.id + '-' + String(index)}
       type='button'
       onMouseEnter={function () { setCursor(index) }}
       onClick={function () { run(item) }}
       className={active ? 'cmdk-item cmdk-item-active' : 'cmdk-item'}
      >
       <div className='cmdk-title'>{item.title}</div>
       <div className='cmdk-subtitle'>{item.subtitle}</div>
      </button>
     })}
     {filtered.length === 0 ? <div className='cmdk-empty'>No matching commands.</div> : null}
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
