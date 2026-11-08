# dsh-evolve

进化模式整套发布件：一个模式本体，加任务树侧栏、纯净用户画像、术语字典三件配套，以及为它们服务的显示与体检插件。

进化模式把「做事顺序」写进 agent：每个任务先对齐成四行（本层目标、基本点、硬需求、软需求），干的时候按规则守，回复固定三块（对齐栏、正文、收尾检测），收尾过五项检测。它不替你写代码，它管每一轮怎么想、怎么报、怎么收。

## 包里有什么

| 包 | 作用 |
| --- | --- |
| `dsh-evolve-preset` | 模式本体：persona 正文（四段工序）＋组合行＋一篇维护技能 |
| `dsh-task-tree` | 任务树侧栏＋每轮对齐栏注入＋任务树工具 |
| `dsh-profile-inject` | 开场把用户画像注入上下文（**不预置任何画像内容**） |
| `dsh-profile-panel` | 画像与设置面板：名册、条目编辑、结构、原文 |
| `dsh-term-dict` | 术语字典：查／写／体检＋首次出现自动注入 |
| `dsh-plan-enter` | 让模型自己把会话切进计划模式 |
| `dsh-chat-density` | 把对齐栏与收尾检测调小调淡，正文不动 |
| `dsh-check` | 画像排版体检（`profile-lint`）、净版校验、关卡勾稽（`gate-check`） |

## 「纯净」体现在哪

- 画像：仓库里没有任何画像文件。`dsh-profile-inject` 只在 `$DSH_HOME/user-profile.md` 存在时注入；`dsh-profile-panel` 提供编辑入口，首次打开是空名册。内容由使用者自己写。
- 词典：`dsh-term-dict` 首次运行只预置两条词典自身的词条（「词条」「词典」的称谓），不预置任何领域词。
- 发布件里没有项目内容、案例与实测数据；技能正文只写规则。

## 安装

从本仓库直接装（npm 发布之前）：

```sh
git clone https://github.com/taoziliyouchong/dsh-evolve-preset
cd dsh-evolve
node scripts/install.mjs --profile desktop
```

从 npm 装（发布后）：`dsh plugin --profile desktop add dsh-evolve-preset`——会带上字典依赖；任务树、画像注入等按需再装，组合行不引用外部插件。

装完重启 DSH，在 设置 → 模式 里选「进化模式」开新会话。

要求 DSH >= 0.2.1-alpha.1。

可选配套（各自独立仓库）：`dsh-at-menu`、`dsh-prompt-shelf`、`dsh-reload-buttons`、`dsh-session-autarchive`、`dsh-pdf-jump`、`dsh-premise-trace`。

## 开发

```sh
node scripts/smoke-all.mjs        # 逐包冒烟
node scripts/audit-deps.mjs       # 依赖与包结构审查
node scripts/load-test.mjs        # 桩 ctx 加载测试
node scripts/publish-all.mjs      # 看发布顺序（不执行）
```

## 反馈

开 Issue：https://github.com/taoziliyouchong/dsh-evolve-preset/issues

## 许可

MIT
