# 第一阶段已知限制

记录便于第二阶段直接复用当前范围结构化数据，同时避免误用第一阶段能力。

## 产品边界

- 仅读取本地 Git 历史，不展示 diff，不分析未提交改动。
- 仅支持本地分支；不支持远程跟踪分支。
- 不监听文件系统变化；需手动刷新。
- 作者身份严格按 Git `author` 姓名+邮箱区分，不做同一人合并。
- 修改文件数按路径去重；跨 commit 的重命名不会被追踪为同一文件。

## 实现约束

- 依赖本机已安装并可在 PATH 中调用的 `git`；未安装时会提示错误。
- Git 调用通过 `execa` 传参数组执行，避免 shell 拼接；仅使用只读命令。
- 工作台状态保存在 Electron `userData/workbench.json`，版本字段为 `1`。
- 大仓库提交列表使用虚拟列表渲染，但统计始终基于完整当前范围。
- 作者候选项只扫描当前时间窗口内的提交，不扫全历史。

## 第二阶段可复用数据

`repository:query` 成功结果已包含结构化字段，可直接作为周报输入：

- `path` / `name` / `resolvedBranch`
- `timeRange`（含本地时区标签）
- `authors` / `authorsFilter` / `includeMerge`
- `commits[]`（hash、作者、时间、完整 message、files）
- `stats`（提交数、增删行、去重文件数）

Markdown 复制与页面列表共用同一筛选结果，避免范围不一致。

## 尚未做的跨平台验收

- 已在开发机完成 typecheck / unit test / lint。
- Windows / Linux 安装包尚未做完整手工验收；构建脚本已具备（`build:win` / `build:linux` / `build:mac`）。
