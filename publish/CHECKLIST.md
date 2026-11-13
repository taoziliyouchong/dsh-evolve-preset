# 发布清单（合包版）

本目录是 `dsh-evolve-preset` 仓库里**唯一发布的包**。0.2.0 起，任务树、画像注入与面板、对齐栏样式、自查工具、计划模式入口都并进了这个包，不再逐包发布。

## 0. 本机验证

```sh
node packages/dsh-evolve-preset/scripts/smoke.mjs
npm pack --dry-run --workspace packages/dsh-evolve-preset
```

冒烟查：`package.json`（main/exports/dsh.client/files）、组合行含本包宿主行 `dsh-evolve-preset` 且不含外部插件名、`host/` 六个模块、客户端外壳 id、`assets/` 三个脚本、技能 frontmatter、私有痕迹、`.bak` 残留。

`npm pack --dry-run` 清单应有：`index.js`、`host/` 六个模块、`lib/client.js`、`cordis.patch.yml`、`skills/`（两篇）、`assets/`（三个脚本）、`README.md`、`README.en.md`、`LICENSE`、`package.json`；`publish/`、`scripts/`、`src/` 的取舍见 `files` 字段，`publish/` 与 `scripts/` 不进包。

## 1. 发布

只有一个包：

```sh
npm publish --access public --workspace packages/dsh-evolve-preset
```

`dsh-term-dict` 是它的依赖（版本写 `*`），npm 上已有稳定版即可。

打 tag：`git tag v0.2.0 && git push && git push --tags`。

## 2. 升级路径

0.1.x 是分包发布。0.2.0 装之前要先摘掉旧配套包，否则同一能力挂两遍：

```sh
dsh plugin --profile desktop remove dsh-task-tree dsh-profile-inject dsh-profile-panel dsh-chat-density dsh-check dsh-plan-enter
dsh plugin --profile desktop add dsh-evolve-preset
```

`dsh-term-dict` 保留（依赖，不是重复）。

## 3. GitHub 仓库

- 仓库名＝`dsh-evolve-preset`，公开；monorepo 根整体推送。
- 加 topic：`dsh-plugin`。

## 4. 社区目录条目

- `publish/registry-entry.yml` 是本包条目，描述已按合包改写。
- 不再为六个旧分包各提条目；已合并的条目若指向 `packages/dsh-evolve-task-tree` 这类子包路径，仍能解析（目录保留），无需撤回。

## 已知注意

- `customSkillDirs` 里的 `createRequire(baseUrl).resolve('dsh-evolve-preset/package.json')` 依赖 profile 的 node_modules 能解析到本包；从 GitHub 直装单个子包不可用，安装走 npm 或仓库里的 `scripts/install.mjs`。
- 组合行里 `dsh-evolve-preset` 挂本包自身，本包缺失时该行会让整树挂载失败；发布时包内容必须完整。
