# dsh-profile-panel
> **已并入 [`dsh-evolve-preset` 0.2.0](../dsh-evolve-preset/README.md)**：本包不再单独发布——能力已收进那个包的 `host/` 与 `lib/client.js`，装那一个包就是全套。

用户画像面板：在设置里读写 `$DSH_HOME/evolve/user-profile.md` 与 `user-profile.d/*.md`，管注入设置，看原文。

画像文件是模型开场读的那份「你是什么人、要什么、边界在哪」。用文本编辑器改容易丢标题、写进加粗和缩进（设置栏是纯文本框、不渲染 markdown）；这个面板把名册、逐条编辑、结构、设置和原文放在一处。

## 面板里有什么

- **左栏**：通用画像与任务画像名册；新建任务画像、改名、删除（改名归到 `.deleted-` 前缀，不直接删）。
- **右栏**：「条目」视图点一条就地改字段；「原文」视图整篇编辑；底部显示文件与保存状态。
- **设置**：注入开关、模式白名单、单段上限、任务画像的工作空间绑定、不灌注的工作空间与会话。
- **结构**：任务画像模块与类型的增删与启停（改动会先扫描影响）。

## 路由

宿主半边在 `/dsh-profile-panel/api` 下注册路由，只接受本机回环地址；改数据的请求还要求同源。路径不外泄给浏览器：客户端只传 id，宿主按 id 拼文件路径。

| 分组 | 路由 |
| --- | --- |
| 名册与文件 | `GET /list`、`GET /read`、`POST /write`、`POST /create`、`POST /rename`、`POST /delete` |
| 设置 | `GET|POST /settings`、`GET /presets`、`GET /workspaces` |
| 会话 | `GET /session-state`、`POST /session-mute` |

写文件前留 `.bak`；`/presets` 列出本机模式供白名单勾选（取不到时手填 id）。

## 与注入插件的关系

画像是 `dsh-profile-inject` 在会话开场注入的；两个包读同一份 `$DSH_HOME/evolve/user-profile.settings.json`。面板只写文件，不参与注入判据。

## 安装

本包没有发布到 npm，`dsh plugin add dsh-profile-panel` 装不到。从本仓库装（整组装）：

```sh
git clone https://github.com/taoziliyouchong/dsh-evolve-preset
cd dsh-evolve-preset
node scripts/install.mjs --profile desktop
```

装完重启 DSH。要求 DSH >= 0.2.1-alpha.1。面板是浏览器半边，`lib/client.js` 已随包提交，不需要构建。

## 许可

MIT
