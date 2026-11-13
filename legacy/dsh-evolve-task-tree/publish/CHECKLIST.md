# 发布清单（dsh-evolve-task-tree）

本目录是 `dsh-evolve-preset` 仓库里的 `packages/dsh-evolve-task-tree`。本包提供会话任务树：侧栏面板、`task-tree` 工具、每轮对齐栏注入，是进化模式的必需依赖。

## 0. 本机验证

```sh
node scripts/smoke.mjs
npm pack --dry-run --workspace packages/dsh-evolve-task-tree
```

冒烟查：package.json 与 `dsh.bundle.patch`、`task-tree` 工具与 `/task-tree` 命令、注入只对 `evolve` 模式生效、`lib/client.js` 外壳 id 等于包名、无环境残留。任一条失败退出码 1。

## 0.5 检查打包内容

`npm pack --dry-run` 里只应出现：`index.js`、`invariant.js`、`cordis.patch.yml`、`assets/task-tree-workflow.md`、`src/`、`lib/client.js`、`README.md`、`LICENSE`、`package.json`。`publish/`、`scripts/`、`node_modules/` 不进包。

**`lib/client.js` 必须提交进 git**：从 GitHub 或 npm 安装时不跑构建，缺了面板不出现。

## 1. 发布顺序

本体插件第一批。`dsh-evolve-preset` 的 dependencies 引用本包，preset 发布前本包必须先在 npm 上。

## 2. 安装位置

本包要写进 profile 的 `dsh.profile.bundles`（客户端半边要进 boot 清单）：

```json
"dsh": { "profile": { "bundles": ["dsh-evolve-task-tree"] } }
```

仓库里的 `scripts/install.mjs` 会自动写；手动装时别漏。

## 3. 填占位符

- `package.json` 的 `repository` / `homepage` / `bugs`：`https://github.com/taoziliyouchong/dsh-evolve-preset`。
- `publish/registry-entry.yml` 的 `url` / `name`。

## 4. 发布到 npm

```sh
npm publish --access public --workspace packages/dsh-evolve-task-tree
```

## 5. 社区目录条目

路径 `data/plugins/taoziliyouchong__dsh-evolve-preset.yml`，内容取本目录 `publish/registry-entry.yml`；一个 PR 最多 3 条，条目只写本包能力，不写同仓其它包。

## 6. 后续版本

1. 改 `package.json` 的 `version`（只升补丁位）。
2. 改了 `src/entry.jsx` 就重新生成 `lib/client.js` 并一起提交（本包未带构建脚本，用 esbuild 按 `--bundle --format=cjs --platform=browser --jsx=automatic --external:react --external:react/jsx-runtime` 打包）。
3. 跑冒烟。
4. `git tag v<版本> && git push --tags`；`npm publish`。
5. 目录条目不用改，市场按 npm 版本或 GitHub HEAD 检查更新。

## 已知注意

- 注入只对 `agentPreset === 'evolve'` 生效：别的模式不注入、不建根；`task-tree` 工具与面板始终可用。要让别的模式也用树，改 `index.js` 里的 `ALIGN_PRESET`。
- 树落在 `$DSH_HOME/task-trees/sessions/<会话id>.json`，卸载插件不删数据。
- 根已有子支时直接改根目标会被拒；纠偏要显式 `force=true`，原句留一行「目标修正前」。
