export function resolveBranchFallback(
  requested: string | null,
  branches: string[],
  headBranch: string | null,
  detached: boolean
): { branch: string | null; warning: string | null } {
  if (branches.length === 0) {
    return { branch: null, warning: '仓库没有可用的本地分支' }
  }

  if (requested && branches.includes(requested)) {
    return { branch: requested, warning: null }
  }

  if (requested && !branches.includes(requested)) {
    const fallback = pickDefaultBranch(branches, headBranch, detached)
    return {
      branch: fallback,
      warning: `分支「${requested}」已不存在，已回退到「${fallback}」`
    }
  }

  if (detached || !headBranch || !branches.includes(headBranch)) {
    const fallback = pickDefaultBranch(branches, headBranch, true)
    return {
      branch: fallback,
      warning: detached
        ? `当前处于 detached HEAD，已回退到「${fallback}」`
        : `无法确定当前分支，已回退到「${fallback}」`
    }
  }

  return { branch: headBranch, warning: null }
}

function pickDefaultBranch(
  branches: string[],
  headBranch: string | null,
  preferNamedDefaults: boolean
): string {
  if (!preferNamedDefaults && headBranch && branches.includes(headBranch)) {
    return headBranch
  }
  if (branches.includes('main')) return 'main'
  if (branches.includes('master')) return 'master'
  if (headBranch && branches.includes(headBranch)) return headBranch
  return branches[0]
}
