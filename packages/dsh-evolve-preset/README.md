# dsh-evolve-preset

**中文** | [English](README.en.md)

同一个模型，接活方式决定它懂不懂你。进化模式把「每一次怎么想、怎么报、怎么收」固定下来：每轮先对齐你的目标和边界，做的过程中守住约定，回复完落盘；重复劳动交给配套插件，偏好与口径沉淀成长期画像。效果是三件事——需求理解更准、能够用相同的花费实现明显更好的效果（即使只有一句话）、用得越久越贴合你的习惯。它不替你写代码。所有内容只在进化模式里生效，切到别的模式，行为与没装时一样。

## 四段工序

| 段 | 做什么 |
| --- | --- |
| ① 动手前 | 解码要求、查现成原件、还原对象＋目标态、列计划、做需求分析（硬需求要走反推）、落盘对齐栏、交接任务树 |
| ② 干的时候 | 每步开动前过一遍基本点与软硬需求；清单同步；发现重复劳动当场记、能转插件就转 |
| ③ 回复前 | 三块结构；结论先给；交付物分给人看与给 AI 看两版；成品跑机器校验 |
| ④ 收尾 | 五项检测（画像／归纳／同频／待确认／词条）＋文件落地；说「总结一下」只对账 |

## 每轮回复的形状

```markdown
> **本层目标**：……
> **基本点**：①……〔画像〕
> **硬需求**：①……〔原话〕
> **软需求**：①……
> **关卡**：16/16 ✅

（正文）

> **收尾检测**
> ① 画像：无变动\
> ② 归纳：无\
> ③ 待确认：无\
> ④ 词条：无\
> ⑤ 插件：无
```

对齐栏四行由 `dsh-task-tree` 每轮从树里注入，收尾检测由本 preset 的正文规定。没有装任务树时，正文照样要求模型自己写对齐栏，只是没有注入与存档。

## 它依赖什么

| 包 | 作用 | 必需 |
| --- | --- | --- |
| `dsh-task-tree` | 任务树、每轮对齐栏注入、align/read 工具 | 是 |
| `dsh-term-dict` | 术语字典：查／写／体检，词条首次出现自动注入 | 是 |
| `dsh-profile-inject` | 开场把用户画像注入上下文 | 是 |
| `dsh-plan-enter` | 让模型自己把会话切进计划模式（已不被 preset 引用，单独装才有） | 否 |
| `dsh-profile-panel` | 画像与设置面板（宿主路由＋客户端） | 否 |
| `dsh-chat-density` | 把对齐栏与收尾检测调小调淡，正文不动 | 否 |
| `dsh-check` | 画像排版体检（`profile-lint`）、净版校验 | 否 |

可选配套（各自独立仓库）：`dsh-at-menu`（@ 菜单分组）、`dsh-prompt-shelf`（常用提示词）、`dsh-reload-buttons`（刷新／重启按钮）、`dsh-session-autarchive`（会话自动归档）。

## 技能

本包自带一篇技能 `evolve-maintenance`：归纳怎么落地、画像怎么写、模式怎么改、收尾五项怎么做。正文说「做什么」，技能说「怎么做」。官方创造模式的四个技能（造插件、做界面、改组合、工具描述）由 DSH 自带，不复制。

## 安装

本包只声明一个依赖：字典 `dsh-term-dict`，装 preset 时会一起装上。其余插件可选：

```sh
dsh plugin --profile desktop add dsh-evolve-preset
# 可选的功能插件，按需装：
dsh plugin --profile desktop add dsh-task-tree dsh-profile-inject
```

没有任务树时，正文要求模型自己写对齐栏；没有画像注入时正文不读画像。

从本仓库直接装（npm 发布之前）：

```sh
git clone https://github.com/taoziliyouchong/dsh-evolve-preset
cd dsh-evolve
node scripts/install.mjs --profile desktop
```

装完还要把本体插件写进 profile 的 `dsh.profile.bundles`——它们的客户端半边要进 boot 清单。`install.mjs` 会自动完成；手动装时按这个顺序写：

```json
"dsh": { "profile": { "bundles": [
  "@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app",
  "dsh-evolve-preset",
  "dsh-task-tree", "dsh-term-dict", "dsh-profile-inject",
  "dsh-profile-panel", "dsh-chat-density", "dsh-check"
] } }
```

`dsh-plan-enter` 不写进 bundles：它由本 preset 的 `planning` 组挂载（需要那组的 `planMode` 隔离实例），写进 bundles 会挂两次。

装完重启 DSH，在设置 →「模式」里选「进化模式」开新会话。

要求 DSH >= 0.2.1-alpha.1。

## 结构

- `cordis.patch.yml` —— 模式声明：persona 正文（四段工序）＋组合行（官方创造模式同构）＋本体插件行
- `skills/evolve-maintenance/SKILL.md` —— 维护细则
- 组合里的 `customSkillDirs` 用 `createRequire(baseUrl)` 解析本包 `package.json` 再取同目录 `skills/`，换安装位置不用改配置

## 已知限制

- persona 正文约一万字，每个新会话整份读入，是固定开销；嫌长就删「关卡」与「需求调整」两节，不影响其余规则。
- 组合行不引用外部插件包，缺哪个插件都不会导致 preset 挂载失败；缺任务树/字典/画像注入时按正文的降级写法运行。
- 收尾检测的「归纳」「词条」两项依赖 `repeat-scan`（`dsh-session-search`）与 `dict`（`dsh-term-dict`）；没装就写「无」。

## 环境坑文档（可选）

想给本机环境问题留个记录（沙箱拒删、大目录搜索卡住、改完不生效），可以写在 `$DSH_HOME/env-pitfalls.md`：开头写主题索引，每节写「现象 → 错方向 → 对的做法」。它不进包、不进每轮上下文，模式不自动读；不建也能用。

## 反馈

插件有问题，按这个顺序：

1. 开 Issue：https://github.com/taoziliyouchong/dsh-evolve-preset/issues —— 能留痕、能搜历史；
2. 急着问或不想开 Issue，QQ 号：**2171960697**（加好友请注明装的是哪个包）。

反馈时带上：DSH 版本、插件版本、报错原文、截图。

## 许可

MIT
