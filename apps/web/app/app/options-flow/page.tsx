import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'

const rows = [['SPX', 'Call sweep', '4.2M', '5850'], ['QQQ', 'Put sweep', '2.1M', '468'], ['BTC', 'Call block', '1.4M', '92000']]

export default function OptionsFlowPage() {
  return h(PageShell, { title: 'Options Flow', subtitle: 'Demo backed flow tape kept provider ready for a future institutional options feed.', active: 'options-flow' }, h(Panel, { title: 'Flow tape' }, h(DataTable, { headers: ['Symbol', 'Side', 'Premium', 'Strike'], rows: rows })))
}
