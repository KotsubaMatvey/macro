import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getNews } from '@/lib/server/api'

export default async function NewsPage() {
  const items = await getNews()
  return h(PageShell, { title: 'News', subtitle: 'Macro linked headlines connected to catalysts and asset sensitivity.', active: 'news' }, h(Panel, { title: 'News feed' }, h(DataTable, { headers: ['Headline', 'Source', 'Category', 'Sentiment'], rows: items.map(function (item: any) { return [item.title, item.source, item.category, item.sentiment] }) })))
}
