# dsh-evolve-preset

**中文** | [English](README.en.md)

一个包，装下进化模式整套：模式本体 + 任务树 + 画像注入与面板 + 对齐栏样式 + 自查工具 + 计划模式入口。装它一个，就是全部。

进化模式把「做事顺序」写进 agent：每个任务先对齐成四行（本层目标、基本点、硬需求、软需求），干的时按规则守，回复固定三块（对齐栏、正文、收尾检测），收尾过五项检测。它不替你写代码，它管每一轮怎么想、怎么报、怎么收。

## 一个包装了什么

| 能力 | 形态 | 说明 |
| --- | --- | --- |
| 模式本体 | agent preset | persona 正文（四段工序）＋组合行＋一篇维护技能 |
| 任务树 | 工具 + 侧栏面板 | `task-tree` 工具；每轮对齐栏注入；树文件在 `$DSH_HOME/task-trees/sessions/` |
| 画像注入 | 宿主钩子 | 开场注入 `$DSH_HOME/evolve/user-profile.md` 与任务画像清单；仓库不预置任何画像内容 |
| 画像面板 | 设置页 + 侧栏 | 名册、逐条编辑、结构、设置、原文 |
| 对齐栏样式 | 浏览器半边 | 把对齐栏与收尾检测调小调淡，正文不动 |
| 自查工具 | 工具 | `net-clean-check`、`profile-lint`、`gate-check` |
| 计划模式入口 | 工具 | `enter_plan_mode`；组合里没有 planMode 服务时不注册 |

术语字典 `dsh-term-dict` 是包依赖，安装时自动带上。

## 任务树的写入护栏

连着改节点（`align`／`set`／`move`／`drop`）而期间没有建立新目标（`new`／`add`）时，写入按次数交替拦放：第 1、2 次放行；**第 3 次报提示并拒绝写入**；第 4 次放行但仍提示，第 5 次拒绝，第 6 次放行仍提示——从第 3 次起单数拦、双数放。解除办法：建立一个新目标（`new` 立根或 `add` 挂一支），计数即清零。

## 安装

```sh
dsh plugin --profile desktop add dsh-evolve-preset
```

装完重启 DSH，在 设置 →「模式」里选「进化模式」开新会话。

从仓库装（不想走 npm 时）：

```sh
git clone https://github.com/taoziliyouchong/dsh-evolve-preset
cd dsh-evolve
node scripts/install.mjs --profile desktop
```

## 从 0.1.x 升级

0.1.x 是分包发布（`dsh-task-tree`、`dsh-profile-inject` 等各是一个包）。0.2.0 把能力全部并进本包，**旧的配套包要从 profile 里摘掉**，否则同一个能力会挂两遍：

```sh
dsh plugin --profile desktop remove dsh-task-tree dsh-profile-inject dsh-profile-panel dsh-chat-density dsh-check dsh-plan-enter
dsh plugin --profile desktop add dsh-evolve-preset
```

`dsh-term-dict` 保留——它是依赖，不重复。

## 每轮回复的形状

```markdown
> **本层目标**：……
> **基本点**：①……〔画像〕
> **硬需求**：①……〔原话〕
> **软需求**：①……
> **关卡**：7/7 ✅

（正文）

> **收尾检测**
> ① 画像：无变动\
> ② 归纳：无\
> ③ 待确认：无\
> ④ 词条：无
```

对齐栏四行每轮从任务树注入，收尾检测由本 preset 的正文规定。没装任务树时（本包永远装得上，这块是内置的），正文照样要求模型自己写对齐栏。

## 结构

- `index.js` —— 宿主入口：一个 apply 依次挂载 `host/` 下六块能力，单块失败不拖垮整包
- `host/` —— 六块能力的宿主实现（task-tree、profile-inject、profile-panel、chat-density、check、plan-enter）
- `lib/client.js` —— 浏览器半边：一个入口装三块 UI（任务树面板、画像面板、对齐栏样式）
- `cordis.patch.yml` —— 模式声明＋组合行＋本包宿主行
- `skills/` —— 两篇技能：`evolve-maintenance`（维护细则）、`task-tree-workflow`（任务树用法）
- `assets/` —— 自查工具的三个脚本（随包发布，不引用外部目录）

## 已知限制

- 合包后不能再单独停用某一块能力：不想用画像面板也只能整包留着。要拆开，装 0.1.x 的分包版。
- 任一块的宿主钩子挂载失败不影响其余块，但会在宿主日志里留一行 `[dsh-evolve-preset] <模块> 未挂上`。
- persona 正文约一万字，每个新会话整份读入，是固定开销。
- 收尾检测的「归纳」「词条」两项依赖 `repeat-scan`（`dsh-session-search`）与 `dict`（`dsh-term-dict`）；没装就写「无」。

## 环境坑文档（可选）

想给本机环境问题留个记录（沙箱拒删、大目录搜索卡住、改完不生效），可以写在 `$DSH_HOME/env-pitfalls.md`：开头写主题索引，每节写「现象 → 错方向 → 对的做法」。它不进包、不进每轮上下文。

## 反馈

插件有问题，按这个顺序：

1. 开 Issue：https://github.com/taoziliyouchong/dsh-evolve-preset/issues —— 能留痕、能搜历史；
2. 急着问或不想开 Issue，QQ 号：**2171960697**（加好友请注明装的是哪个包）。

反馈时带上：DSH 版本、插件版本、报错原文、截图。

## 许可

MIT
