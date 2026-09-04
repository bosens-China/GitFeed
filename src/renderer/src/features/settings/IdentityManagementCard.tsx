import { useState } from 'react'
import { App, Button, Card, Checkbox, Divider, Empty, Form, Input, List, Modal, Space, Switch, Tag } from 'antd'
import { Plus, Search, Sparkles, UserCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AuthorIdentity } from '@shared/models'
import { authorKey, sameAuthor } from '@shared/models'
import { useWorkbench } from '@renderer/hooks/useWorkbench'

interface IdentityManagementCardProps {
  myIdentities: AuthorIdentity[]
}

export function IdentityManagementCard({
  myIdentities
}: IdentityManagementCardProps): React.JSX.Element {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { state: workbench, updateIdentities, updatePreferences } = useWorkbench()

  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [discoverModalOpen, setDiscoverModalOpen] = useState(false)
  const [discoveredAuthors, setDiscoveredAuthors] = useState<AuthorIdentity[]>([])
  const [loadingDiscovered, setLoadingDiscovered] = useState(false)
  const [authorFilterKeyword, setAuthorFilterKeyword] = useState('')
  const [selectedDiscoveredKeys, setSelectedDiscoveredKeys] = useState<Set<string>>(new Set())

  const [manualForm] = Form.useForm()

  const handleRemoveIdentity = async (target: AuthorIdentity): Promise<void> => {
    const next = myIdentities.filter((id) => !sameAuthor(id, target))
    await updateIdentities(next)
    message.success(t('settings.identityRemoved', { defaultValue: '已移除身份' }))
  }

  const handleOpenDiscoverModal = async (): Promise<void> => {
    setDiscoverModalOpen(true)
    setLoadingDiscovered(true)
    try {
      const authors = await window.api.discoverAuthors()
      setDiscoveredAuthors(authors)
      // 预先选出尚未加入 myIdentities 的作者
      setSelectedDiscoveredKeys(new Set())
    } catch {
      message.error(t('settings.discoverFailed', { defaultValue: '扫描仓库作者失败' }))
    } finally {
      setLoadingDiscovered(false)
    }
  }

  const handleConfirmDiscovered = async (): Promise<void> => {
    const toAdd = discoveredAuthors.filter((a) => selectedDiscoveredKeys.has(authorKey(a)))
    const currentKeys = new Set(myIdentities.map(authorKey))
    const merged = [...myIdentities]

    for (const item of toAdd) {
      if (!currentKeys.has(authorKey(item))) {
        merged.push(item)
        currentKeys.add(authorKey(item))
      }
    }

    await updateIdentities(merged)
    message.success(t('settings.identitiesAdded', { defaultValue: '已成功添加选中的身份' }))
    setDiscoverModalOpen(false)
  }

  const handleAddManual = async (): Promise<void> => {
    try {
      const values = await manualForm.validateFields()
      const newIdentity: AuthorIdentity = {
        name: values.name.trim(),
        email: values.email.trim()
      }

      if (myIdentities.some((id) => sameAuthor(id, newIdentity))) {
        message.warning(t('settings.identityExists', { defaultValue: '该身份已在列表中' }))
        return
      }

      await updateIdentities([...myIdentities, newIdentity])
      message.success(t('settings.identityAdded', { defaultValue: '已添加身份' }))
      manualForm.resetFields()
      setManualModalOpen(false)
    } catch {
      // form error
    }
  }

  const filteredDiscovered = discoveredAuthors.filter((a) => {
    if (!authorFilterKeyword.trim()) return true
    const kw = authorFilterKeyword.trim().toLowerCase()
    return a.name.toLowerCase().includes(kw) || a.email.toLowerCase().includes(kw)
  })

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <Space size={8}>
            <UserCheck size={18} className="text-[var(--ant-color-primary)]" />
            <span>{t('settings.myIdentities', { defaultValue: '我的 Git 身份' })}</span>
          </Space>
          <Space size="middle">
            <Button
              icon={<Sparkles size={14} className="text-amber-500" />}
              onClick={() => void handleOpenDiscoverModal()}
            >
              {t('settings.discoverFromRepos', { defaultValue: '从仓库中提取作者' })}
            </Button>
            <Button
              type="primary"
              icon={<Plus size={14} />}
              onClick={() => setManualModalOpen(true)}
            >
              {t('settings.addIdentity', { defaultValue: '手动添加' })}
            </Button>
          </Space>
        </div>
      }
      variant="outlined"
      className="shadow-xs bg-[var(--ant-color-bg-container)]"
    >
      <div className="mb-3 text-xs text-[var(--ant-color-text-secondary)]">
        {t('settings.identityDesc', {
          defaultValue:
            '配置您的 Git 姓名与邮箱，用于跨所有本地仓库自动识别属于您本人的提交（邮箱匹配忽略大小写）。'
        })}
      </div>

      {myIdentities.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-xs text-[var(--ant-color-text-tertiary)]">
              {t('settings.noIdentities', {
                defaultValue: '尚未配置个人身份。未配置时将默认展示所有作者提交。'
              })}
            </span>
          }
          className="my-4"
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {myIdentities.map((identity) => (
            <Tag
              key={authorKey(identity)}
              closable
              onClose={() => void handleRemoveIdentity(identity)}
              className="m-0 flex items-center gap-1.5 py-1 px-2.5 font-mono text-xs"
              color="blue"
            >
              <span className="font-semibold">{identity.name}</span>
              <span className="opacity-75">&lt;{identity.email}&gt;</span>
            </Tag>
          ))}
        </div>
      )}

      {/* 周报分析规则 */}
      <Divider className="my-5" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">
            {t('settings.includeMergeDefault', { defaultValue: '默认包含合并提交' })}
          </div>
          <div className="text-xs text-[var(--ant-color-text-secondary)]">
            {t('settings.includeMergeDesc', {
              defaultValue: '默认关闭。开启后，跨仓库统计与提交列表中将包含分支合并提交。'
            })}
          </div>
        </div>
        <Switch
          checked={workbench?.includeMergeDefault ?? false}
          onChange={(val) => void updatePreferences(val)}
        />
      </div>

      {/* 手动添加弹窗 */}
      <Modal
        title={t('settings.addIdentity', { defaultValue: '手动添加 Git 身份' })}
        open={manualModalOpen}
        onOk={() => void handleAddManual()}
        onCancel={() => setManualModalOpen(false)}
        destroyOnClose
        okText={t('common.add', { defaultValue: '添加' })}
        cancelText={t('common.cancel', { defaultValue: '取消' })}
      >
        <Form form={manualForm} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label={t('settings.authorName', { defaultValue: 'Git 姓名' })}
            rules={[
              {
                required: true,
                message: t('settings.nameRequired', { defaultValue: '请输入姓名' })
              }
            ]}
          >
            <Input placeholder="e.g. yliu" autoFocus />
          </Form.Item>
          <Form.Item
            name="email"
            label={t('settings.authorEmail', { defaultValue: 'Git 邮箱' })}
            rules={[
              {
                required: true,
                message: t('settings.emailRequired', { defaultValue: '请输入邮箱' })
              },
              {
                type: 'email',
                message: t('settings.emailInvalid', { defaultValue: '邮箱格式不合法' })
              }
            ]}
          >
            <Input placeholder="e.g. yangboses@gmail.com" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 从仓库自动提取弹窗 */}
      <Modal
        title={t('settings.discoverAuthorsTitle', { defaultValue: '从工程历史中识别的作者' })}
        open={discoverModalOpen}
        onOk={() => void handleConfirmDiscovered()}
        onCancel={() => setDiscoverModalOpen(false)}
        width={540}
        okText={t('common.confirmAdd', { defaultValue: '添加选中身份' })}
        cancelText={t('common.cancel', { defaultValue: '取消' })}
      >
        <div className="mt-2 flex flex-col gap-3">
          <Input
            prefix={<Search size={14} className="text-gray-400" />}
            placeholder={t('settings.searchAuthors', { defaultValue: '过滤作者姓名或邮箱…' })}
            value={authorFilterKeyword}
            onChange={(e) => setAuthorFilterKeyword(e.target.value)}
            allowClear
          />

          <div className="max-h-72 overflow-auto rounded border border-[var(--ant-color-border-secondary)] bg-[var(--ant-color-bg-container)] p-2">
            <List
              loading={loadingDiscovered}
              dataSource={filteredDiscovered}
              renderItem={(author) => {
                const key = authorKey(author)
                const isAlreadyAdded = myIdentities.some((id) => sameAuthor(id, author))
                const isChecked = selectedDiscoveredKeys.has(key)

                return (
                  <List.Item
                    key={key}
                    className="!py-1.5 cursor-pointer hover:bg-[var(--ant-color-fill-quaternary)] px-2 rounded"
                    onClick={() => {
                      if (isAlreadyAdded) return
                      setSelectedDiscoveredKeys((prev) => {
                        const next = new Set(prev)
                        if (next.has(key)) next.delete(key)
                        else next.add(key)
                        return next
                      })
                    }}
                  >
                    <div className="flex w-full items-center justify-between">
                      <Space size="middle">
                        <Checkbox checked={isAlreadyAdded || isChecked} disabled={isAlreadyAdded} />
                        <div className="font-mono text-xs">
                          <span className="font-semibold text-[var(--ant-color-text)]">
                            {author.name}
                          </span>{' '}
                          <span className="text-[var(--ant-color-text-secondary)]">
                            &lt;{author.email}&gt;
                          </span>
                        </div>
                      </Space>
                      {isAlreadyAdded && (
                        <Tag className="m-0 text-[10px]">
                          {t('settings.alreadyAdded', { defaultValue: '已添加' })}
                        </Tag>
                      )}
                    </div>
                  </List.Item>
                )
              }}
            />
          </div>
        </div>
      </Modal>
    </Card>
  )
}
