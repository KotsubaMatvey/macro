import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getWorkstation } from '@/lib/server/api'

export default async function CommunityPage() {
  const payload = await getWorkstation()
  return h(PageShell, { title: 'Community', subtitle: 'Professional macro discussion with posts, comments, and likes.', active: 'community' }, h(Panel, { title: 'Discussions' }, h(DataTable, { headers: ['Title', 'Author', 'Role', 'Likes'], rows: payload.posts.map(function (item: any) { return [item.title, item.authorName, item.authorRole, String(item.likes)] }) })))
}
