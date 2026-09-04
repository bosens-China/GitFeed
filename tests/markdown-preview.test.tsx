import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { CommitItem } from '../src/shared/models'
import { CursorTooltipProvider } from '../src/renderer/src/components/CursorTooltip'
import { MarkdownReportPreview } from '../src/renderer/src/features/this-week/MarkdownReportPreview'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key
  })
}))

const commit: CommitItem = {
  hash: 'a10cb4abcdef1234567890',
  shortHash: 'a10cb4a',
  authorName: 'Ann',
  authorEmail: 'ann@example.com',
  authoredAt: '2026-09-04T08:00:00.000Z',
  message: 'feat(web): support energy_system',
  isMerge: false,
  branch: 'main',
  repoId: '/tmp/energy_system',
  repoName: 'energy_system',
  files: []
}

describe('MarkdownReportPreview', () => {
  it('renders escaped Markdown characters as text and commit hashes as buttons', () => {
    const html = renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(
          CursorTooltipProvider,
          null,
          createElement(MarkdownReportPreview, {
            markdown: '## energy\\_system\n\n- feat\\(web\\): support (`a10cb4a`)',
            commits: [commit]
          })
        )
      )
    )

    expect(html).toContain('energy_system')
    expect(html).toContain('feat(web): support')
    expect(html).not.toContain('energy\\_system')
    expect(html).toContain('<button')
    expect(html).toContain('a10cb4a')
    expect(html).toContain('aria-describedby="gitfeed-cursor-tooltip"')
    expect(html).toContain('class="cursor-tooltip"')
  })
})
