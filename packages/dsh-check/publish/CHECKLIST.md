# 发布清单（dsh-check）

本目录是 `dsh-evolve-preset` 仓库里的 `packages/dsh-check`。本包给「交付前过机器校验」用，提供三条自查工具：`net-clean-check`、`profile-lint`、`gate-check`。

## 0. 本机验证

```sh
node scripts/smoke.mjs
npm pack --dry-run --workspace packages/dsh-check
```

冒烟查：package.json 与 `dsh.bundle.patch`、三个工具名与参数、`assets/` 里的脚本可执行、无环境残留。

## 0.5 检查打包内容

`npm pack --dry-run` 里只应出现：`index.js`、`cordis.patch.yml`、`assets/`（`net-clean-check.mjs`、`profile-lint.mjs`、`gate-check.mjs`）、`README.md`、`LICENSE`、`package.json`。`publish/`、`scripts/` 不进包。

## 1. 发布顺序

本体插件第一批（可选包，不挡 preset 发布）。

## 2. 安装位置

写进 profile 的 `dsh.profile.bundles`：

```json
"dsh": { "profile": { "bundles": ["dsh-check"] } }
```

## 3. 填占位符

- `package.json` 的 `repository` / `homepage` / `bugs`。
- `publish/registry-entry.yml` 的 `url` / `name`。

## 4. 发布到 npm

```sh
npm publish --access public --workspace packages/dsh-check
```

## 5. 社区目录条目

路径 `data/plugins/taoziliyouchong__dsh-evolve.yml`，内容取本目录 `publish/registry-entry.yml`。条目描述按三条工具写。

## 6. 后续版本

1. 改版本号（只升补丁位）。
2. 跑冒烟。
3. tag 与 `npm publish`。

## 已知注意

- `package.json` 的 description 与 README 都按三条工具写（`net-clean-check` / `profile-lint` / `gate-check`），发版前对一眼。
- `gate-check` 的模板在 `$DSH_HOME/gate/<会话id>.md`，7 节（01 原件 … 07 升级与归纳）；校验不删文件，下一次 `init` 覆盖清掉。
- `profile-lint` 读 `$DSH_HOME` 下的画像文件；画像用纯文本框编辑、不渲染 markdown，加粗与缩进按字面噪音报。
