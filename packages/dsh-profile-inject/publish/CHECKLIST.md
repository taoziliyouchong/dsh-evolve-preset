# 发布清单（dsh-profile-inject）

本目录是 `dsh-evolve-preset` 仓库里的 `packages/dsh-profile-inject`。本包在会话开场把用户画像注入上下文，是进化模式的必需依赖（没有它，正文说的「画像注入」不会发生）。

## 0. 本机验证

```sh
node scripts/smoke.mjs
npm pack --dry-run --workspace packages/dsh-profile-inject
```

冒烟查：package.json 与 `dsh.bundle.patch`、注入判据（实时 `agentPreset`、`presets` 空＝所有模式）、画像文件缺失时不注入、设置文件损坏时退回默认、无环境残留。

## 0.5 检查打包内容

`npm pack --dry-run` 里只应出现：`index.js`、`cordis.patch.yml`、`README.md`、`LICENSE`、`package.json`。`publish/`、`scripts/` 不进包。

## 1. 发布顺序

本体插件第一批。`dsh-evolve-preset` 的 dependencies 引用本包，preset 发布前本包必须先在 npm 上。

## 2. 安装位置

写进 profile 的 `dsh.profile.bundles`：

```json
"dsh": { "profile": { "bundles": ["dsh-profile-inject"] } }
```

不属于客户端包，但 `scripts/install.mjs` 会一起写进 bundles。

## 3. 填占位符

- `package.json` 的 `repository` / `homepage` / `bugs`。
- `publish/registry-entry.yml` 的 `url` / `name`。

## 4. 发布到 npm

```sh
npm publish --access public --workspace packages/dsh-profile-inject
```

## 5. 社区目录条目

路径 `data/plugins/taoziliyouchong__dsh-evolve.yml`，内容取本目录 `publish/registry-entry.yml`。

## 6. 后续版本

1. 改版本号（只升补丁位）。
2. 跑冒烟。
3. tag 与 `npm publish`。

## 已知注意

- 宿主包 `@deepseek-ai/dsh-llm` 写在 `peerDependencies`（`>=0.2.1-alpha.1`）：profile 的 pnpm 配置 `autoInstallPeers: false` 不会去 npm 装它，DSH 启动时按 peer 校验运行时版本。不要再挪回 `dependencies`——npm 公共源上同名包只有 `0.0.1-rc.1`，会装不上。
- 画像文件不在就什么都不注：`$DSH_HOME/evolve/user-profile.md` 缺省时注入为空是正常行为，不是故障。
- 与画像面板（`dsh-profile-panel`）读同一份 `$DSH_HOME/evolve/user-profile.settings.json`；两个包一起装才改得动注入设置。
