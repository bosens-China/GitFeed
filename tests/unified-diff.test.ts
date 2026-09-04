import { describe, expect, it } from 'vitest'
import { defaultSelectedAuthorKeys } from '../src/shared/models'
import { parseUnifiedDiff } from '../src/shared/unified-diff'

describe('parseUnifiedDiff', () => {
  it('aligns replacement lines and preserves context line numbers', () => {
    const files = parseUnifiedDiff(`diff --git a/src/app.ts b/src/app.ts
index 1111111..2222222 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -2,3 +2,3 @@
 keep
-old value
+new value
 tail`)

    expect(files).toHaveLength(1)
    expect(files[0]).toMatchObject({ oldPath: 'src/app.ts', newPath: 'src/app.ts' })
    expect(files[0].hunks[0].rows).toEqual([
      {
        oldLine: { lineNumber: 2, content: 'keep', kind: 'context' },
        newLine: { lineNumber: 2, content: 'keep', kind: 'context' }
      },
      {
        oldLine: { lineNumber: 3, content: 'old value', kind: 'deletion' },
        newLine: { lineNumber: 3, content: 'new value', kind: 'addition' }
      },
      {
        oldLine: { lineNumber: 4, content: 'tail', kind: 'context' },
        newLine: { lineNumber: 4, content: 'tail', kind: 'context' }
      }
    ])
  })

  it('recognizes new and binary files', () => {
    const files = parseUnifiedDiff(`diff --git a/new.txt b/new.txt
new file mode 100644
--- /dev/null
+++ b/new.txt
@@ -0,0 +1 @@
+hello
diff --git a/logo.png b/logo.png
Binary files a/logo.png and b/logo.png differ`)

    expect(files[0].oldPath).toBeNull()
    expect(files[0].newPath).toBe('new.txt')
    expect(files[0].hunks[0].rows[0]).toEqual({
      oldLine: null,
      newLine: { lineNumber: 1, content: 'hello', kind: 'addition' }
    })
    expect(files[1].binary).toBe(true)
  })
})

describe('defaultSelectedAuthorKeys', () => {
  const authors = [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' }
  ]

  it('uses matching global identities as the default', () => {
    expect(
      defaultSelectedAuthorKeys(authors, [{ name: 'Alias', email: 'ALICE@example.com' }])
    ).toEqual(['Alice\u0000alice@example.com'])
  })

  it('falls back to all authors when no global identity is configured or matched', () => {
    expect(defaultSelectedAuthorKeys(authors, [])).toEqual([])
    expect(
      defaultSelectedAuthorKeys(authors, [{ name: 'Nobody', email: 'nobody@example.com' }])
    ).toEqual([])
  })
})
