import { Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import type { RepoQueryResult } from '@shared/models'

export function RepositoryQueryErrors({
  repos = []
}: {
  repos?: RepoQueryResult[]
}): React.JSX.Element | null {
  const { t } = useTranslation()
  const failed = repos.filter((repo) => repo.error || !['available', 'empty'].includes(repo.status))
  if (failed.length === 0) return null

  return (
    <Alert
      className="mb-4"
      showIcon
      type={failed.length === repos.length ? 'error' : 'warning'}
      title={t('workbench.incompleteResults', {
        defaultValue: '部分工程读取失败，当前统计和周报不完整。请检查后刷新。'
      })}
      description={
        <ul className="m-0 pl-5">
          {failed.map((repo) => (
            <li key={repo.repoId}>
              {repo.repoName}：{repo.error || t('workbench.loadFailed')}
            </li>
          ))}
        </ul>
      }
    />
  )
}
