import { useState } from 'react'
import { Select, type SelectProps } from 'antd'

type ClosingMultiSelectProps = Omit<
  SelectProps<string[]>,
  'mode' | 'onDeselect' | 'onOpenChange' | 'onSelect' | 'open'
>

export function ClosingMultiSelect(props: ClosingMultiSelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <Select<string[]>
      {...props}
      mode="multiple"
      open={open}
      onOpenChange={setOpen}
      onSelect={() => setOpen(false)}
      onDeselect={() => setOpen(false)}
    />
  )
}
