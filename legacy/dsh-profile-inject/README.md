# dsh-profile-inject
> **已并入 [`dsh-evolve-preset` 0.2.0](../dsh-evolve-preset/README.md)**：本包不再单独发布——能力已收进那个包的 `host/` 与 `lib/client.js`，装那一个包就是全套。

开场把用户画像注入上下文：`$DSH_HOME/evolve/user-profile.md` 的正文，加上任务画像类别清单；按设置做模式过滤、截断、会话静音与工作空间绑定。

模型每开一个新会话都没有上一轮的记忆。画像把「用户是什么人、要什么、边界在哪」存成文件，由本插件在会话开场注入，不用模型每次去 read。

## 注入什么

- **通用画像正文**：`$DSH_HOME/evolve/user-profile.md` 全文（超过设置上限就截断，并注明完整版路径）。
- **任务画像类别清单**：`$DSH_HOME/evolve/user-profile.d/*.md` 的 slug 与首行标题，让模型知道有哪几类、该读哪个。
- **绑定的任务画像正文**：设置里给某类绑了工作空间、当前会话 cwd 命中时，连同正文一起注入。

## 什么时候注

- 每个 agent 开场（新建会话、恢复会话）注一次；同一次会话不重复注。
- 判据读 Session 投影的实时 `agentPreset`：设置 `presets` 非空时只在这些模式下注入；空＝所有模式。
- 判不出模式就按「不注」处理（宁缺不漏）。

## 设置

`$DSH_HOME/evolve/user-profile.settings.json`，由画像面板的「设置」页写；也可以手改：

| 字段 | 默认 | 含义 |
| --- | --- | --- |
| `enabled` | `true` | 总开关 |
| `presets` | `[]` | 允许注入的模式 id 列表；空＝所有模式 |
| `maxChars` | `0` | 单段上限字符数；0＝不截断 |
| `injectTaskProfile` | `false` | 保留字段（任务画像按工作空间绑定注入） |
| `bindings` | `{}` | 任务画像 slug → 工作空间路径片段列表 |
| `skipWorkspaces` | `[]` | 这些路径片段下的会话不注 |
| `skipSessions` | `[]` | 这些会话 id 不注 |

文件缺失或损坏一律退回默认值，不影响注入判据。

## 安装

本包没有发布到 npm，`dsh plugin add dsh-profile-inject` 装不到。从本仓库装（整组装）：

```sh
git clone https://github.com/taoziliyouchong/dsh-evolve-preset
cd dsh-evolve-preset
node scripts/install.mjs --profile desktop
```

装完重启 DSH。要求 DSH >= 0.2.1-alpha.1。

画像文件不在就什么都不注；要开面板编辑画像，装同仓库的 `dsh-profile-panel`。

## 许可

MIT
