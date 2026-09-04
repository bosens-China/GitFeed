import { useEffect } from 'react'
import { App, Form, Input, Modal, Select, Switch } from 'antd'
import { useTranslation } from 'react-i18next'
import type { RepositoryRecord } from '@shared/models'
import { useWorkbench } from '@renderer/hooks/useWorkbench'

interface EditRepoModalProps {
  open: boolean
  onClose: () => void
  repo: RepositoryRecord | null
}

export function EditRepoModal({ open, onClose, repo }: EditRepoModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { updateRepo } = useWorkbench()
  const [form] = Form.useForm()

  useEffect(() => {
    if (repo && open) {
      form.setFieldsValue({
        name: repo.name,
        enabledForReport: repo.enabledForReport,
        selectedBranches: repo.selectedBranches || []
      })
    }
  }, [repo, open, form])

  const handleOk = async (): Promise<void> => {
    if (!repo) return
    try {
      const values = await form.validateFields()
      await updateRepo(repo.id, {
        name: values.name.trim(),
        enabledForReport: values.enabledForReport,
        selectedBranches: values.selectedBranches
      })
      message.success(t('settings.updateSuccess', { defaultValue: '工程配置已更新' }))
      onClose()
    } catch {
      // Form validation error
    }
  }

  return (
    <Modal
      open={open}
      destroyOnClose
      title={t('settings.editRepoTitle', {
        name: repo?.name,
        defaultValue: `编辑工程：${repo?.name || ''}`
      })}
      onOk={() => void handleOk()}
      onCancel={onClose}
      okText={t('common.confirm', { defaultValue: '确定' })}
      cancelText={t('common.cancel', { defaultValue: '取消' })}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          name="name"
          label={t('settings.repoName', { defaultValue: '工程显示名称' })}
          rules={[
            {
              required: true,
              message: t('settings.repoNameRequired', { defaultValue: '请输入工程名称' })
            }
          ]}
        >
          <Input placeholder="工程名称" />
        </Form.Item>

        <Form.Item
          name="enabledForReport"
          label={t('settings.participateReport', { defaultValue: '参与周报' })}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="selectedBranches"
          label={t('settings.branchesTracked', { defaultValue: '分析分支' })}
          tooltip={t('settings.branchesTooltip', {
            defaultValue: '输入或选择需要统计和分析的分支，默认为主分支'
          })}
        >
          <Select
            mode="tags"
            placeholder={t('settings.branchesPlaceholder', { defaultValue: '主分支' })}
            className="w-full"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
