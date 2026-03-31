import { createElement as h } from 'react'

import { PageShell, Panel } from '@/components/app/chrome'

const guides = [
  { title: 'Using the Macro Calendar', readTime: '5 min', body: 'Rank events by impact, region, and proximity before you open any chart.' },
  { title: 'Reading Market Bias', readTime: '6 min', body: 'Use consensus, recurring themes, and analyst context to frame the base case and the pain trade.' },
  { title: 'Interpreting the Liquidity Regime', readTime: '7 min', body: 'Separate macro liquidity from pure risk appetite so you know whether the tape supports follow through.' },
  { title: 'Working an Event Release', readTime: '8 min', body: 'Move from catalyst, to beat or miss thresholds, to reaction windows, to post-release monitoring.' },
  { title: 'Watching Live Reactions', readTime: '4 min', body: 'Wait, hold, and enter labels should be read together with consistency and the time window, not in isolation.' },
  { title: 'News and Briefings Workflow', readTime: '5 min', body: 'Use headlines for context and briefings for translation into assets, not the other way around.' },
];

export default function EducationPage() {
  return h(PageShell, { title: 'Education', subtitle: 'Short module guides for operating the workstation with discipline and consistent process.', active: 'education' }, h('div', { className: 'space-y-5' }, [
    h(Panel, { key: 'overview', title: 'Operating notes' }, h('p', { className: 'text-sm leading-7 text-slate-300' }, 'These guides are written for active users of the workstation. They focus on workflow, what each module is for, and how the modules fit together around a macro event.' )),
    h('div', { key: 'grid', className: 'grid gap-4 lg:grid-cols-2' }, guides.map(function (item) {
      return h(Panel, { key: item.title, title: item.readTime }, h('div', { className: 'space-y-3 text-sm text-slate-300' }, [
        h('div', { key: 'title', className: 'text-lg font-medium text-white' }, item.title),
        h('p', { key: 'body', className: 'leading-7' }, item.body),
      ]))
    })),
  ]))
}
