/**
 * 类型：工具；解决：交付物与画像的合规体检每次靠手敲 node 脚本（路径靠记、输出要人读、忘了跑就没跑）；
 * 作用：两条工具跑完净版校验与画像体检，命中与退出码直接给结论。
 *   - net-clean-check：净版交付物扫「项目推进过程」痕迹词，命中列出文件:行号。
 *   - profile-lint：$DSH_HOME 下画像文件体检（加粗/引用块/行首缩进/跨层重复）。
 * 脚本本体在包内 assets/（随包发布，不引用外部目录）。
 */

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineTool } from '@deepseek-ai/dsh-tools'

/** Cordis 插件名。 */
export const name = 'dsh-check'
/** 需要的服务。 */
export const inject = ['tools', 'shell', 'sandboxPolicy']

/** 包内脚本目录。 */
const ASSETS = join(dirname(fileURLToPath(import.meta.url)), 'assets')
const NET_CLEAN = join(ASSETS, 'net-clean-check.mjs')
const PROFILE_LINT = join(ASSETS, 'profile-lint.mjs')
const GATE_CHECK = join(ASSETS, 'gate-check.mjs')
const TIMEOUT_MS = 60000

/** pwsh 单引号安全引用（命令按 `& <exe> <args>` 语法拼）。 */
function psq(value) {
  return "'" + String(value).replace(/'/g, "''") + "'"
}

/** shell 是「先 execute 拿进程句柄、再 result() 取结果」两步，这里收成一步。 */
async function shellResult(ctx, spec) {
  const handle = await ctx.shell.execute(spec)
  return await handle.result()
}

/** 前台跑一个 node 脚本，统一给 {ok, exitCode, text}。 */
async function runScript(ctx, script, args, exec) {
  if (!existsSync(script)) {
    return { ok: false, exitCode: -1, text: '脚本不存在：' + script + '（包不完整？）' }
  }
  const cmd = '& ' + psq(process.execPath) + ' ' + psq(script) + (args.length > 0 ? ' ' + args.map(psq).join(' ') : '')
  const policy = ctx.sandboxPolicy && exec && exec.agent
    ? ctx.sandboxPolicy.resolve({ session: exec.agent.session })
    : undefined
  const spec = ctx.shell.resolve({
    command: cmd,
    workdir: process.cwd(),
    timeoutMs: TIMEOUT_MS,
    ...(policy ? { sandboxPolicy: policy } : {}),
    ...(exec && exec.signal ? { signal: exec.signal } : {}),
  })
  const res = await shellResult(ctx, spec)
  const out = String((res && res.stdout && res.stdout.text) || '').trim()
  const err = String((res && res.stderr && res.stderr.text) || '').trim()
  const flag = res && res.timedOut ? '（超时）' : res && res.aborted ? '（已中止）' : ''
  return { ok: res.exitCode === 0, exitCode: res.exitCode, text: (out || err || '(无输出)') + flag }
}

/** 两个工具共用的输出契约（ok/exitCode/text 都要声明；schema DSL 不支持顶层 required 数组）。 */
const OUT_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', required: true },
    exitCode: { type: 'number', required: true },
    text: { type: 'string', required: true },
  },
  additionalProperties: false,
}

/** 注册工具。 */
export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'net-clean-check',
    description: '净版交付物的机器校验（净版门禁的判据）：扫「项目推进过程」痕迹词——A 组实测/对照/逐年/口径/已删/试过/扫描/配对/改善占比/不是漏了…（必删），B 组因为/由于/所以/原因是（连词，通常也该删）；命中按「文件: 行号 ＋ 词」列出，干净时退出码 0。落净版后跑一次，别靠眼看。',
    parameters: {
      files: {
        type: 'array',
        items: { type: 'string' },
        required: true,
        description: '要校验的交付物文件路径（1 个或多个）',
      },
    },
    output: {
      schema: OUT_SCHEMA,
      render: (_args, value) => [{
        type: 'text',
        text: (value.ok ? '✅ 净版干净' : '❌ 有命中（退出码 ' + value.exitCode + '）') + '：\n' + value.text,
      }],
    },
    async execute(args, exec) {
      const files = Array.isArray(args.files) ? args.files.map((f) => String(f).trim()).filter(Boolean) : []
      if (files.length === 0) throw new Error('files 至少给一个文件路径')
      const missing = files.filter((f) => !existsSync(f))
      if (missing.length > 0) throw new Error('文件不存在：' + missing.join(' / '))
      return await runScript(ctx, NET_CLEAN, files, exec)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'profile-lint',
    description: '画像文件体检（只读）：扫 $DSH_HOME/evolve/user-profile.md 与 evolve/user-profile.d/*.md 的排版与错层——加粗/引用块/行首缩进（设置栏是纯文本框、不渲染 markdown）、规则口吻混入、跨层重复条目。改完画像跑一次。',
    parameters: {},
    output: {
      schema: OUT_SCHEMA,
      render: (_args, value) => [{
        type: 'text',
        text: (value.ok ? '✅ 画像体检通过' : '❌ 有 FAIL（退出码 ' + value.exitCode + '）') + '：\n' + value.text,
      }],
    },
    async execute(_args, exec) {
      return await runScript(ctx, PROFILE_LINT, [], exec)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'gate-check',
    description: '关卡勾稽校验：把关卡从自报数字变成可核条目。动手前 init=true 生成模板（$DSH_HOME/gate/<id>.md，节名照模板 ## 01 原件 … ## 07 升级与归纳，共 7 节）；前五节动手前填，落盘、升级与归纳先写「回帖前补」，回帖前补完再校验。每节：结论 ≥10 个非空白字符 + 一行 EVID: 指针（文件:行 必须真实存在 / tool:名字{...} / cmd:... / SKIP:理由）；SKIP 超过 2 节判整轮未做；还留着占位的节直接判不过。校验不删文件，下一次 init 覆盖清掉。输出「关卡：7/7 ✅」或「关卡：5/7（③⑥未过）」，照抄进对齐栏。',
    parameters: {
      file: { type: 'string', description: '模板路径；缺省用 $DSH_HOME/gate/<sessionId>.md' },
      init: { type: 'boolean', description: 'true = 生成/重置模板（每次 init 覆盖旧文件）' },
      clean: { type: 'boolean', description: 'true = 删掉本会话的模板与日志（会话结束用）' },
      session: { type: 'string', description: '会话 id（init 或缺省 file 时用）' },
    },
    output: {
      schema: OUT_SCHEMA,
      render: (_args, value) => [{
        type: 'text',
        text: (value.ok ? '✅ 关卡全过' : '❌ 关卡未过（退出码 ' + value.exitCode + '）') + '：\n' + value.text,
      }],
    },
    async execute(args, exec) {
      const sid = String(args.session || exec?.agent?.session?.header?.id || 'session-unknown')
      if (args.clean === true) return await runScript(ctx, GATE_CHECK, ['--clean', '--session', sid], exec)
      if (args.init === true) return await runScript(ctx, GATE_CHECK, ['--init', '--session', sid], exec)
      const file = typeof args.file === 'string' && args.file.trim()
        ? args.file.trim()
        : join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'gate', sid + '.md')
      if (!existsSync(file)) throw new Error('模板不存在：' + file + '（先 init=true 生成）')
      const argv = ['--file', file, '--session', sid]
      return await runScript(ctx, GATE_CHECK, argv, exec)
    },
  }))
}
