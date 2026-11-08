# 发布清单

本目录是 `dsh-evolve-preset` 仓库里的 `packages/dsh-evolve-preset`。整个仓库一个 GitHub 仓库，npm 逐包发布。

## 0. 本机验证

```sh
node packages/dsh-evolve-preset/scripts/smoke.mjs
npm pack --dry-run --workspace packages/dsh-evolve-preset
```

冒烟查：`package.json` 结构、preset 声明（id / order / persona）、组合行只挂 `dsh-plan-enter`、三个本体包不在组合行里（它们在 profile bundles）、技能目录自解析表达式、技能 frontmatter、私有痕迹残留、`.bak` 残留。任一条失败退出码 1。

`npm pack --dry-run` 清单里只应有：`cordis.patch.yml`、`skills/`、`README.md`、`README.en.md`、`LICENSE`、`package.json`；`publish/`、`scripts/`、`node_modules/` 都不该进包。

## 1. 发布顺序

同一个仓库内逐包发布，顺序固定：

1. 本体插件包（`dsh-task-tree`、`dsh-term-dict`、`dsh-profile-inject`、`dsh-profile-panel`、`dsh-chat-density`、`dsh-check`、`dsh-plan-enter`）先发；
2. 最后发 `dsh-evolve-preset`。它依赖 `dsh-term-dict`（任意版本），字典要先在 npm 上；其余插件可按任意顺序发，组合行不引用它们。

## 2. GitHub 仓库

- 仓库名＝`dsh-evolve-preset`，公开；本目录的上一级（monorepo 根）整体推送。
- 加 topic：`dsh-plugin`。
- 仓库满 24 小时才能进社区目录。

## 3. 社区目录条目

- `packages/dsh-evolve-preset/publish/registry-entry.yml` 是本包条目。
- 其它包各写一条，路径 `data/plugins/<owner>__<repo>.yml`；一个 PR 最多 3 条。
- 仓库地址都指向同一个 monorepo，`name` 用 `taoziliyouchong/dsh-evolve-preset`；条目里的描述写各自的包。

## 4. 每次发版

1. 改对应包 `package.json` 的 `version`（只升补丁位）。
2. 跑本包冒烟。
3. `node scripts/publish-all.mjs --publish` 或手动 `npm publish --access public --workspace packages/<包>`。
4. 打 tag：`git tag v<版本> && git push --tags`。

## 已知注意

- `customSkillDirs` 里的 `createRequire(baseUrl).resolve('dsh-evolve-preset/package.json')` 依赖 profile 的 node_modules 能解析到本包；从 GitHub 直装单个子包不可用，安装走 npm 或仓库里的 `scripts/install.mjs`。
- preset 引用的本体插件行在包缺失时会让整树挂载失败——发布顺序不能反。
