---
name: apply-yliu-product-development-practices
description: "Apply Yliu's product development practices when creating or changing applications across product clarification, project setup, architecture, frontend, backend, data, UI, testing, deployment, and validation. Use for new projects and incremental work in existing projects."
---

# Apply Yliu Product Development Practices

使用 Yliu 的方法完成产品开发。它覆盖开发前确认、项目初始化、技术选型、前后端实现、页面交互、测试和交付前验证。

这套方法提供默认选择，但不会覆盖用户要求，也不会强迫旧项目全面迁移。

## 决策顺序

遇到不同做法时，按以下顺序决定：

1. 先按用户本次的明确要求执行。
2. 用户没有指定时，沿用项目已经稳定使用的方案。
3. 前两项都没有答案时，再采用本技能的默认做法。

新项目可以直接采用本技能。旧项目采用渐进方式：新代码使用新做法；本次需要修改的旧代码可以顺手调整；其他旧代码保持不动。只有用户明确提出全面重构时，才进行统一迁移。

## 工作流程

1. 先查看任务、现有代码、依赖、脚本和配置，了解项目当前的做法。
2. 找出真正影响实现的未知信息。能从项目中确认的内容直接沿用，不要重复询问。
3. 根据任务范围，读取下方对应的规范。
4. 写代码前先看项目里能否复用，再评估成熟的社区方案。
5. 只完成当前任务需要的改动，不顺手迁移无关代码。
6. 完成后根据改动范围和风险运行检查。

## 按需读取规范

- 涉及目标用户、设备与主题范围、项目初始化、端口、包管理、Monorepo、技术选型、别名或社区方案时，读取 [project-and-architecture.md](references/project-and-architecture.md)。
- 涉及 TypeScript、注释、Hook、Composable、组件抽象或代码复用时，读取 [implementation-practices.md](references/implementation-practices.md)。
- 涉及接口、请求、路由、页面数据、Loading、错误反馈、危险操作或样式时，读取 [requests-routing-and-ui.md](references/requests-routing-and-ui.md)。
- 涉及数据库、ORM、数据验证、统一响应、Swagger、时间、环境变量、后端日志或生产编排时，读取 [backend-data-and-runtime.md](references/backend-data-and-runtime.md)。
- 涉及测试、类型检查、Lint、构建或完成后的验证时，读取 [testing-and-validation.md](references/testing-and-validation.md)。

一个任务涉及多个方面时，读取所有相关规范。普通任务不需要为了了解全貌而加载全部文件。

## 核心原则

- 新项目直接采用新做法，旧项目只在修改时逐步适配。
- 先复用项目已有能力，再评估成熟社区方案。两者都不合适时，才自行实现。
- 同构项目优先复用语言、类型和验证规则，减少重复维护。
- 页面只管理自己的请求。跨页面的核心状态优先放入 URL。
- 请求失败必须进入错误流程。Loading 尽量只影响对应区域。
- 抽象要让代码更容易理解，不能只增加一层包装。
- 只测试重要且稳定的行为。检查力度与改动风险保持一致。
