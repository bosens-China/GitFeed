import { createElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import type { CommitItem } from '../src/shared/models'
import { CommitRow } from '../src/renderer/src/features/commits/CommitRow'

const { buttons } = vi.hoisted(() => ({
  buttons: [] as Array<{ label: string; onClick: () => void }>
}))

vi.mock('antd', () => {
  const Container = ({ children }: { children: ReactNode }): ReactElement =>
    createElement('div', null, children)
  return {
    Button: ({ children, onClick }: { children: string; onClick: () => void }): ReactElement => {
      buttons.push({ label: children, onClick })
      return createElement('button', null, children)
    },
    Collapse: ({ items }: { items: Array<{ children: ReactNode }> }): ReactElement =>
      createElement(
        'div',
        null,
        items.map((item, index) => createElement('div', { key: index }, item.children))
      ),
    Space: Container,
    Tag: Container,
    Tooltip: Container,
    Typography: { Text: Container }
  }
})
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('../src/renderer/src/components/CursorTooltip', () => ({
  CursorTooltip: ({ children }: { children: ReactNode }) => children
}))

it('opens the selected file in its exact commit while the hash opens the full commit', () => {
  buttons.length = 0
  const commit: CommitItem = {
    hash: 'abcdef1234567890',
    shortHash: 'abcdef1',
    authorName: 'Ann',
    authorEmail: 'ann@example.com',
    authoredAt: '2026-10-08T12:00:00Z',
    message: 'fix: file',
    isMerge: false,
    branch: 'main',
    repoId: 'repo-a',
    files: [{ path: 'src/file.ts', status: 'M', additions: 1, deletions: 1, binary: false }]
  }
  const onSelect = vi.fn()

  renderToStaticMarkup(createElement(CommitRow, { commit, onSelect }))
  buttons.find((button) => button.label === 'src/file.ts')?.onClick()
  buttons.find((button) => button.label === 'abcdef1')?.onClick()

  expect(onSelect.mock.calls).toEqual([[commit, 'src/file.ts'], [commit]])
})
