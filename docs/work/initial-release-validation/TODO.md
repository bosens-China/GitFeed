# 初始版本验收 TODO

本清单对应[初始版本验收 PRD](./PRD.md)。

- [x] 配置自动化质量检查、Release Please 和三平台发行打包。
- [x] 配置质量检查与三平台打包任务的 pnpm store 缓存。
- [x] 为 Windows 发布同时配置安装程序与一个免安装 ZIP。
- [x] 禁用 electron-builder 的 CI 隐式发布，由独立步骤统一上传 Release 资产。
- [x] 验证 macOS arm64 无签名 DMG/ZIP 构建，并补充 Gatekeeper 使用说明。
- [ ] 在 GitHub Actions 中手动触发一次三平台打包，确认 Windows 同时上传安装程序和一个免安装 ZIP。
- [ ] 验证无 commit 仓库、同名仓库和不可访问路径。
- [ ] 使用较大提交历史验证界面响应性以及取消或重试能力。
- [ ] 验证系统未安装 Git 或 Git 不在 PATH 时只显示错误提示，不执行安装或配置操作。
- [ ] 在 macOS 程序包中完成核心流程验收。
- [ ] 在 Windows 安装程序中验证引导流程、当前用户安装、目录选择和核心流程，并验证免安装 ZIP 可直接运行。
- [ ] 在 Linux 程序包中完成核心流程验收。
- [ ] 对照当前产品 PRD 逐条完成产品验收。
- [ ] 确认验收过程没有改变任何 Git 仓库状态。
