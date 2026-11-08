# 发布清单（dsh-chat-density）

本目录是 `dsh-evolve-preset` 仓库里的 `packages/dsh-chat-density`。本包是纯浏览器半边：把聊天区里「对齐栏」与「收尾检测」两块的字号、行距、颜色调小调淡，正文不动。

## 0. 本机验证

```sh
node scripts/smoke.mjs
npm pack --dry-run --workspace packages/dsh-chat-density
```

冒烟查：package.json 与 `dsh.bundle.patch`、`dsh.client` 声明、`lib/client.js` 外壳 id 等于包名、块判定按文本（`本层目标：`／`收尾检测`）而非类名、无环境残留。

## 0.5 检查打包内容

`npm pack --dry-run` 里只应出现：`index.js`、`cordis.patch.yml`、`src/`、`lib/client.js`、`README.md`、`LICENSE`、`package.json`。`publish/`、`scripts/` 不进包。

**`lib/client.js` 必须提交进 git**：从 GitHub 或 npm 安装时不跑构建，缺了样式不生效。

## 1. 发布顺序

本体插件第一批（可选包，不挡 preset 发布）。宿主半边是空壳，只负责客户端包接线。

## 2. 安装位置

写进 profile 的 `dsh.profile.bundles`（客户端半边要进 boot 清单）：

```json
"dsh": { "profile": { "bundles": ["dsh-chat-density"] } }
```

## 3. 填占位符

- `package.json` 的 `repository` / `homepage` / `bugs`。
- `publish/registry-entry.yml` 的 `url` / `name`。

## 4. 发布到 npm

```sh
npm publish --access public --workspace packages/dsh-chat-density
```

## 5. 社区目录条目

路径 `data/plugins/taoziliyouchong__dsh-evolve.yml`，内容取本目录 `publish/registry-entry.yml`。

## 6. 后续版本

1. 改版本号（只升补丁位）。
2. 改了 `src/entry.jsx` 就重新生成 `lib/client.js` 并一起提交（本包未带构建脚本，用 esbuild 按浏览器目标打包）。
3. 跑冒烟。
4. tag 与 `npm publish`。

## 已知注意

- 只认 `blockquote`，排除代码块里的引用；判定按块内文本，不绑打包后的类名。
- 同一页面加载两次时，新实例先停掉旧实例的扫描器；补标不摘标，重渲染后下一帧补回来。
- 没有配置项：装了就对所有会话生效，不按模式收口。
