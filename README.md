# GitFeed

[![CI](https://github.com/bosens-China/GitFeed/actions/workflows/release.yml/badge.svg)](https://github.com/bosens-China/GitFeed/actions/workflows/release.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

GitFeed 是一款跨平台、本地优先的个人 Git 周报桌面工具。它聚合多个本地 Git 仓库中的提交与开发活动，按工程和提交类型自动整理，并一键复制标准格式的 Markdown 周报。

## 核心功能

- **多工程协同管理**：集中管理参与周报的本地 Git 工程，提供仓库可用性诊断和多分支只读分析。
- **开发活动聚合**：按本周、上周、上月或自定义范围聚合提交，统计提交数、活跃天数、修改文件及文本增删行数。
- **确定性周报分类**：直接根据 Conventional Commit 前缀按工程和类型整理提交，不使用 AI，也不引入工作事项中间流程。
- **Markdown 预览与复制**：实时预览单工程或跨工程周报，并一键复制到系统剪贴板。
- **智能作者身份识别**：配置个人 Git 姓名与邮箱，支持从工程提交历史中一键提取作者，跨工程精准归集本人工作。
- **原生双色主题**：基于 Ant Design 原生组件与默认主题规范，支持深色、浅色及跟随系统切换。
- **GitHub 与版本检查**：在设置中访问项目主页，并手动查询最新正式发布版本。

## 下载使用

前往 [Releases](https://github.com/bosens-China/GitFeed/releases) 下载适用于 macOS、Windows 或 Linux 的安装包。

当前发布以个人开源免费工具为定位，只提供主流桌面平台的安装包：

- macOS 提供 Apple 芯片（M 系列，arm64）的 DMG 与 ZIP。
- Windows 提供 x64 安装程序。
- Linux 提供 x64 AppImage 和 DEB。

### macOS 首次打开

macOS 版本未使用 Apple Developer ID 签名，也未经过 Apple 公证。系统在首次打开时会显示安全提示，这不代表安装包已损坏。

1. 将 GitFeed 移动到“应用程序”文件夹并尝试打开。
2. 如果系统阻止打开，进入“系统设置 → 隐私与安全性”。
3. 在 GitFeed 的安全提示旁点击“仍要打开”，然后再次确认。

## 本地开发

运行环境要求：Git、Node.js 22+、pnpm 10+。

```bash
# 安装依赖
pnpm install

# 启动开发环境
pnpm dev
```

运行工程规范检查与测试：

```bash
# 运行单元测试
pnpm test

# 运行 TypeScript 类型检查
pnpm typecheck

# 运行代码规范检查
pnpm lint
```

本地打包对应平台的桌面应用：

```bash
pnpm build:mac
pnpm build:win
pnpm build:linux
```

## 发布流程

项目使用 [Google Release Please](https://github.com/googleapis/release-please-action) 自动化管理版本与 Changelog。提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范；当发布 PR 合并入主分支后，GitHub Actions 将自动触发多平台二进制构建并发布 GitHub Release。

## 许可证

本项目基于 [MIT License](LICENSE) 协议开源。
