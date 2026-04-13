import { createElement as h } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/app/chrome', function () {
 return {
  PageShell: function PageShell(props: any) {
   return h('div', { 'data-testid': 'page-shell', 'data-title': props.title, 'data-active': props.active }, props.children)
  },
 }
})

vi.mock('@/components/geoboard/GeoboardShell', function () {
 return {
  GeoboardShell: function GeoboardShell() {
   return h('div', { 'data-testid': 'geoboard-shell' }, 'geoboard-shell')
  },
 }
})

import GeoboardPage from '@/app/app/geoboard/page'

describe('GeoboardPage', function () {
 it('renders geoboard page shell and geoboard shell component', function () {
  render(h(GeoboardPage))
  expect(screen.getByTestId('page-shell')).toHaveAttribute('data-title', 'GEOBOARD // GLOBAL MACRO AOR')
  expect(screen.getByTestId('page-shell')).toHaveAttribute('data-active', 'geoboard')
  expect(screen.getByTestId('geoboard-shell')).toBeInTheDocument()
 })
})
