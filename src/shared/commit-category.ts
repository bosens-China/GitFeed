export interface CommitCategory {
  key: string
  label: string
  labelEn: string
  emoji: string
  color: string
  order: number
}

export const COMMIT_CATEGORIES: Record<string, CommitCategory> = {
  feat: { key: 'feat', label: '新功能', labelEn: 'Features', emoji: '✨', color: 'blue', order: 1 },
  fix: { key: 'fix', label: '缺陷修复', labelEn: 'Bug Fixes', emoji: '🐛', color: 'red', order: 2 },
  perf: {
    key: 'perf',
    label: '性能优化',
    labelEn: 'Performance',
    emoji: '⚡',
    color: 'cyan',
    order: 3
  },
  refactor: {
    key: 'refactor',
    label: '代码重构',
    labelEn: 'Refactoring',
    emoji: '♻️',
    color: 'purple',
    order: 4
  },
  style: {
    key: 'style',
    label: '样式交互',
    labelEn: 'Style & UI',
    emoji: '🎨',
    color: 'magenta',
    order: 5
  },
  docs: {
    key: 'docs',
    label: '文档维护',
    labelEn: 'Documentation',
    emoji: '📝',
    color: 'geekblue',
    order: 6
  },
  test: { key: 'test', label: '测试用例', labelEn: 'Tests', emoji: '🧪', color: 'green', order: 7 },
  build: {
    key: 'build',
    label: '构建打包',
    labelEn: 'Build',
    emoji: '📦',
    color: 'orange',
    order: 8
  },
  ci: { key: 'ci', label: '持续集成', labelEn: 'CI', emoji: '🤖', color: 'gold', order: 9 },
  chore: {
    key: 'chore',
    label: '工程维护',
    labelEn: 'Maintenance',
    emoji: '🔧',
    color: 'default',
    order: 10
  },
  revert: {
    key: 'revert',
    label: '代码回滚',
    labelEn: 'Revert',
    emoji: '⏪',
    color: 'volcano',
    order: 11
  },
  other: {
    key: 'other',
    label: '其他改动',
    labelEn: 'Other Changes',
    emoji: '📌',
    color: 'default',
    order: 99
  }
}

export function parseCommitCategory(message: string): CommitCategory {
  const trimmed = message.trim()
  // 匹配 Conventional Commits 规范，例如 feat(ui): xxx、fix: xxx、[feat] xxx
  const match = trimmed.match(/^\[?([a-zA-Z]+)(?:\([^)]+\))?[:\s\-/]/)
  if (match) {
    const rawType = match[1].toLowerCase()
    if (COMMIT_CATEGORIES[rawType]) {
      return COMMIT_CATEGORIES[rawType]
    }
  }

  // 中文前缀兼容
  if (trimmed.startsWith('修复') || trimmed.toLowerCase().includes('bug')) {
    return COMMIT_CATEGORIES.fix
  }
  if (trimmed.startsWith('新增') || trimmed.startsWith('支持') || trimmed.startsWith('实现')) {
    return COMMIT_CATEGORIES.feat
  }
  if (trimmed.startsWith('重构')) {
    return COMMIT_CATEGORIES.refactor
  }
  if (trimmed.startsWith('优化') || trimmed.startsWith('提升')) {
    return COMMIT_CATEGORIES.perf
  }
  if (trimmed.startsWith('样式') || trimmed.startsWith('ui')) {
    return COMMIT_CATEGORIES.style
  }
  if (trimmed.startsWith('文档')) {
    return COMMIT_CATEGORIES.docs
  }

  return COMMIT_CATEGORIES.other
}
