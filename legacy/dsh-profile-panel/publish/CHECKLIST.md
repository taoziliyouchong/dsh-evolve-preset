# 发布清单（dsh-profile-panel）

本目录是 `dsh-evolve-preset` 仓库里的 `packages/dsh-profile-panel`。本包是设置里的用户画像面板：名册、条目逐条编辑、结构、注入设置与原文；宿主半边提供本机读写路由。

## 0. 本机验证

```sh
node scripts/smoke.mjs
npm pack --dry-run --workspace packages/dsh-profile-panel
```

冒烟查：package.json 与 `dsh.bundle.patch`、`dsh.client` 声明与 `exports["./client"]`、宿主路由前缀与条数、`lib/client.js` 外壳 id 等于包名、无环境残留。

## 0.5 检查打包内容

`npm pack --dry-run` 里只应出现：`index.js`、`invariant.js`、`cordis.patch.yml`、`src/`、`lib/client.js`、`README.md`、`LICENSE`、`package.json`。`publish/`、`scripts/` 不进包。

**`lib/client.js` 必须提交进 git**：从 GitHub 或 npm 安装时不跑构建，缺了面板不出现。

## 1. 发布顺序

本体插件第一批（可选包，不挡 preset 发布）。`dsh-evolve-preset` 的 README 把它列为可选配套，从 npm 单独安装。

## 2. 安装位置

写进 profile 的 `dsh.profile.bundles`（客户端半边要进 boot 清单）：

```json
"dsh": { "profile": { "bundles": ["dsh-profile-panel"] } }
```

## 3. 填占位符

- `package.json` 的 `repository` / `homepage` / `bugs`。
- `publish/registry-entry.yml` 的 `url` / `name`。

## 4. 发布到 npm

```sh
npm publish --access public --workspace packages/dsh-profile-panel
```

## 5. 社区目录条目

路径 `data/plugins/taoziliyouchong__dsh-evolve-preset.yml`，内容取本目录 `publish/registry-entry.yml`。

## 6. 后续版本

1. 改版本号（只升补丁位）。
2. 改了界面就重新生成 `lib/client.js` 并一起提交（本包未带构建脚本，用 esbuild 按浏览器目标打包）。
3. 跑冒烟。
4. tag 与 `npm publish`。

## 已知注意

- 宿主路由在 `/dsh-profile-panel/api`，只接受本机回环地址；改数据的请求要求同源。远程访问的 DSH 上面板会 403。
- 与 `dsh-profile-inject` 读同一份 `$DSH_HOME/evolve/user-profile.settings.json`：面板只写文件，不参与注入判据；两个包都装才能改注入设置。
- 写文件前留 `.bak`；删除任务画像走 `.deleted-` 前缀，不直接删文件。
