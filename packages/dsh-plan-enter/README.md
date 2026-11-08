# dsh-plan-enter

给模型一个 `enter_plan_mode` 工具：自己把当前会话切进计划模式——之后只读、只搜、只设计，最后用 `exit_plan_mode` 把完整计划交给你批。

DSH 默认只给 `exit_plan_mode`，计划模式要人手动切。长任务、要改文件、方向还没定的活，模型自己先停下来规划更稳。

## 工具

| 工具 | 用途 |
| --- | --- |
| `enter_plan_mode` | 把当前会话切进计划模式；当步生效或从下一步生效，返回当前状态 |

计划模式的行为由 DSH 的 `@deepseek-ai/dsh-plan-mode` 提供：只读工具可用、写操作被规则挡住，结束必须走 `exit_plan_mode`。

## 安装

本包是 `dsh-evolve-preset` 的依赖，通常随它一起装：

```sh
dsh plugin --profile desktop add dsh-evolve-preset
```

单独装（不经 preset）时它会作为独立插件挂载；但进化模式里它挂在 preset 的 `planning` 组内（需要那组的 `planMode` 隔离实例），**不要再把本包加进同一个 profile 的 bundles**，否则挂两次。

装完重启 DSH。要求 DSH >= 0.2.1-alpha.1。

## 许可

MIT
