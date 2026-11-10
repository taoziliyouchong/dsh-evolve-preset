# 发布清单（dsh-plan-enter）

本目录是 `dsh-evolve-preset` 仓库里的 `packages/dsh-plan-enter`。本包给模型一个 `enter_plan_mode` 工具：自己把当前会话切进计划模式，再用 `exit_plan_mode` 把完整计划交给你批。是进化模式的必需依赖。

## 0. 本机验证

```sh
node scripts/smoke.mjs
npm pack --dry-run --workspace packages/dsh-plan-enter
```

冒烟查：package.json 与 `dsh.bundle.patch`、组合行只有一条 insert、工具名 `enter_plan_mode`、README 里的「不要写进 bundles」提醒仍在、无环境残留。

## 0.5 检查打包内容

`npm pack --dry-run` 里只应出现：`index.js`、`cordis.patch.yml`、`README.md`、`LICENSE`、`package.json`。`publish/`、`scripts/` 不进包。

## 1. 发布顺序

本体插件第一批。`dsh-evolve-preset` 的 `planning` 组引用本包，preset 发布前本包必须先在 npm 上。

## 2. 安装位置

- 由 preset 挂载：写进 preset 的 `planning` 组（`name: dsh-plan-enter`），**不要**再写进 profile 的 `dsh.profile.bundles`，否则挂两次。
- 单独使用（不经 preset）：本包未发 npm，从仓库装后手动加进 profile 的 bundles，作为独立插件挂载。

## 3. 填占位符

- `package.json` 的 `repository` / `homepage` / `bugs`。
- `publish/registry-entry.yml` 的 `url` / `name`。

## 4. 发布到 npm

```sh
npm publish --access public --workspace packages/dsh-plan-enter
```

## 5. 社区目录条目

路径 `data/plugins/taoziliyouchong__dsh-evolve.yml`，内容取本目录 `publish/registry-entry.yml`。

## 6. 后续版本

1. 改版本号（只升补丁位）。
2. 跑冒烟。
3. tag 与 `npm publish`。

## 已知注意

- `enter_plan_mode` 依赖 DSH 的 `@deepseek-ai/dsh-plan-mode`；平台没有计划模式时工具照常注册，调用会报错。
- 挂在 preset 的 `planning` 组内时拿到的是该组的 `planMode` 隔离实例；单独装时拿到 profile 的默认实例，行为不同，安装说明里要写清。
