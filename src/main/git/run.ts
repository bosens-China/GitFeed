import { execa } from 'execa'

export class GitCommandError extends Error {
  readonly code: 'NO_GIT_BINARY' | 'GIT_ERROR'

  constructor(message: string, code: 'NO_GIT_BINARY' | 'GIT_ERROR' = 'GIT_ERROR') {
    super(message)
    this.name = 'GitCommandError'
    this.code = code
  }
}

export async function runGit(
  cwd: string,
  args: string[],
  options?: { reject?: boolean; stripFinalNewline?: boolean }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execa('git', args, {
      cwd,
      reject: options?.reject ?? true,
      stripFinalNewline: options?.stripFinalNewline ?? true,
      windowsHide: true,
      env: {
        ...process.env,
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
        GIT_TERMINAL_PROMPT: '0'
      }
    })
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode ?? 0
    }
  } catch (error) {
    const err = error as {
      code?: string
      shortMessage?: string
      stderr?: string
      stdout?: string
      exitCode?: number
      message?: string
    }

    if (err.code === 'ENOENT') {
      throw new GitCommandError(
        '未找到可用的系统 Git。GitFeed 需要系统已提供 `git` 命令，请自行处理 Git 环境。',
        'NO_GIT_BINARY'
      )
    }

    if (options?.reject === false) {
      return {
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? '',
        exitCode: err.exitCode ?? 1
      }
    }

    const detail = (err.stderr || err.shortMessage || err.message || 'Git 命令执行失败').trim()
    throw new GitCommandError(detail, 'GIT_ERROR')
  }
}

export async function runGitLines(cwd: string, args: string[]): Promise<string[]> {
  const { stdout } = await runGit(cwd, args)
  if (!stdout.trim()) {
    return []
  }
  return stdout.split(/\r?\n/)
}
