# dsh-plan-enter
> **已并入 [`dsh-evolve-preset` 0.2.0](../dsh-evolve-preset/README.md)**：本包不再单独发布——能力已收进那个包的 `host/` 与 `lib/client.js`，装那一个包就是全套。

给模型一个 `enter_plan_mode` 工具：自己把当前会话切进计划模式——之后只读、只搜、只设计，最后用 `exit_plan_mode` 把完整计划交给你批。

DSH 默认只给 `exit_plan_mode`，计划模式要人手动切。长任务、要改文件、方向还没定的活，模型自己先停下来规划更稳。

## 工具

| 工具 | 用途 |
| --- | --- |
| `enter_plan_mode` | 把当前会话切进计划模式；当步生效或从下一步生效，返回当前状态 |

计划模式的行为由 DSH 的 `@deepseek-ai/dsh-plan-mode` 提供：只读工具可用、写操作被规则挡住，结束必须走 `exit_plan_mode`。

## 安装

本包没有发布到 npm，`dsh plugin add dsh-plan-enter` 装不到；preset 也不引用它，装了才生效。从本仓库装（整组装）：

```sh
git clone https://github.com/taoziliyouchong/dsh-evolve-preset
cd dsh-evolve
node scripts/install.mjs --profile desktop
```

`install.mjs` 只把它写进 profile 的 `dependencies`，不写进 `dsh.profile.bundles`。要真的用起来，手动把 `dsh-plan-enter` 加进 profile 的 `bundles`。

装完重启 DSH。要求 DSH >= 0.2.1-alpha.1。

## 许可

MIT
