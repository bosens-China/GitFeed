import { execa } from 'execa'
import { spawn } from 'node:child_process'

export class GitCommandError extends Error {
  readonly code: 'NO_GIT_BINARY' | 'GIT_ERROR'

  constructor(message: string, code: 'NO_GIT_BINARY' | 'GIT_ERROR' = 'GIT_ERROR') {
    super(message)
    this.name = 'GitCommandError'
    this.code = code
  }
}

function gitEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    GIT_TERMINAL_PROMPT: '0'
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
      env: gitEnv()
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

export async function forEachGitRecord(
  cwd: string,
  args: string[],
  separator: string,
  onRecord: (record: string) => void
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('git', args, { cwd, windowsHide: true, env: gitEnv() })
    let pending = ''
    let stderr = ''
    let settled = false
    const fail = (error: Error): void => {
      if (settled) return
      settled = true
      child.kill()
      reject(error)
    }

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      if (settled) return
      pending += chunk
      try {
        let end: number
        while ((end = pending.indexOf(separator)) !== -1) {
          onRecord(pending.slice(0, end))
          pending = pending.slice(end + separator.length)
        }
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)))
      }
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-16384)
    })
    child.on('error', (error: NodeJS.ErrnoException) => {
      fail(
        error.code === 'ENOENT'
          ? new GitCommandError('未找到可用的系统 Git。', 'NO_GIT_BINARY')
          : new GitCommandError(error.message)
      )
    })
    child.on('close', (code) => {
      if (settled) return
      if (code !== 0) {
        fail(new GitCommandError(stderr.trim() || 'Git 命令执行失败'))
        return
      }
      try {
        if (pending.trim()) onRecord(pending)
        settled = true
        resolve()
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)))
      }
    })
  })
}

export async function runGitLines(cwd: string, args: string[]): Promise<string[]> {
  const { stdout } = await runGit(cwd, args)
  if (!stdout.trim()) {
    return []
  }
  return stdout.split(/\r?\n/)
}
