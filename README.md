# dsh-evolve

进化模式，一个包：`dsh-evolve-preset`。模式本体、任务树、画像注入与面板、对齐栏样式、自查工具、计划模式入口，全在里面。装它一个，就是整套。

进化模式把「做事顺序」写进 agent：每个任务先对齐成四行（本层目标、基本点、硬需求、软需求），干的时候按规则守，回复固定三块（对齐栏、正文、收尾检测），收尾过五项检测。它不替你写代码，它管每一轮怎么想、怎么报、怎么收。

## 安装

```sh
dsh plugin --profile desktop add dsh-evolve-preset
```

装完重启 DSH，在 设置 → 模式 里选「进化模式」开新会话。术语字典 `dsh-term-dict` 是依赖，会自动带上。

从仓库装（不想走 npm 时）：

```sh
git clone https://github.com/taoziliyouchong/dsh-evolve-preset
cd dsh-evolve
node scripts/install.mjs --profile desktop
```

要求 DSH >= 0.2.1-alpha.1。

## 从 0.1.x 升级

0.1.x 是分包发布。0.2.0 把能力全部并进 `dsh-evolve-preset`，旧的配套包要先摘掉，否则同一能力挂两遍：

```sh
dsh plugin --profile desktop remove dsh-task-tree dsh-profile-inject dsh-profile-panel dsh-chat-density dsh-check dsh-plan-enter
dsh plugin --profile desktop add dsh-evolve-preset
```

## 仓库结构

| 位置 | 是什么 |
| --- | --- |
| `packages/dsh-evolve-preset/` | **唯一发布的包**：宿主入口、`host/` 六块能力、`lib/client.js` 三块 UI、preset 声明、技能与 assets |
| `packages/dsh-evolve-task-tree/` 等六个目录 | 0.1.x 的分包源码，已并入上面那个包，保留作历史与回退参考，不再单独发布 |
| `scripts/` | 开发脚本：逐包冒烟、依赖审查、桩 ctx 加载、发布顺序 |

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
