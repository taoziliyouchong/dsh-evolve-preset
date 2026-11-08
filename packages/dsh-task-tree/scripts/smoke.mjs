// dsh-task-tree 冒烟：一会话一棵树 / 方向图 / 平级 / serves 校验 / 改挂父 / 移除 / 未归位 / 注入
import { mkdtempSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = mkdtempSync(join(tmpdir(), 'tt-test-'))
process.env.DSH_HOME = join(root, 'dsh-home')
mkdirSync(process.env.DSH_HOME, { recursive: true })
const ws = join(root, 'ws')
mkdirSync(ws, { recursive: true })

const mod = await import(new URL('../index.js', import.meta.url).href)
const reg = []
const handlers = {}
mod.apply({
  tools: { register: (t) => reg.push(t) },
  commands: { register: () => {} },
  skills: { registerProvider: () => {} },
  inject: () => {},
  on: (name, fn) => { handlers[name] = fn },
})
// 2026-11-08：工具改成按 agent 注册（agent/created 里判 preset 才挂）——桩要能触发那个事件。
const agent = {
  session: { id: 'test-session-1', header: { cwd: ws, agentPreset: 'evolve' } },
  ctx: { tools: { register: (t) => { reg.push(t); return () => {} } } },
}
if (typeof handlers['agent/created'] === 'function') handlers['agent/created']({ agent })
const tool = reg[0]
const exec = { agent: { session: { id: 'test-session-1', header: { cwd: ws } } } }
const withGate = (args) => (args.action === 'align' && args.gate === undefined ? { ...args, gate: '15/15 ✅' } : args)
const call = (args) => tool.execute(withGate(args), exec)

const results = []
const check = (name, ok, detail) => results.push({ name, ok, detail })
async function expectThrow(name, args, needle) {
  try { await call(args); check(name, false, '本应报错但通过了') }
  catch (e) { const m = String(e.message); check(name, !needle || m.includes(needle), m) }
}
async function expectOk(name, args, needle) {
  try { const r = await call(args); const ok = !needle || r.text.includes(needle); check(name, ok, ok ? '' : r.text.slice(0, 400)) }
  catch (e) { check(name, false, String(e.message)) }
}

await expectOk('没树时 read 给按需立树引导', { action: 'read' }, '还没有任务树')
await expectOk('没立树时也能同步对齐栏', { action: 'align', goal: '做完让你一眼看到方向', points: '点开就能看｜点卡片看详情', hard: '只读', soft: '配色可调' }, '已同步对齐栏')
check('无树时 read 显示对齐栏', (await call({ action: 'read' })).text.includes('对齐栏｜'), '')
await expectOk('new 立树', { action: 'new', title: '本会话的根任务', goal: '做完让你看到方向' }, '[n1·根]')
await expectOk('align 同步到当前层节点', { action: 'align', goal: '做完让你看到方向', points: '跑通主流程｜保留回退' }, '[n1]')
await expectThrow('根无子支时也不许逐轮改根目标（先 add 挂支）', { action: 'align', goal: '换个目标' }, '不许逐轮换活')
const alignBlock = await call({ action: 'align', goal: '格式测试', points: '甲｜乙', hard: '硬〔原话〕｜二硬〔反推〕', soft: '软', force: true })
check('align 返回可照抄的块（四样、序号＋缩进对齐，不写层号）',
  alignBlock.text.includes('**本层目标**：格式测试')
  && !alignBlock.text.includes('第一层')
  && !alignBlock.text.includes('验收＝')
  && !alignBlock.text.includes('根本目标')
  && alignBlock.text.includes('**基本点**：①甲')
  && alignBlock.text.includes('②乙')
  && alignBlock.text.includes('**硬需求**：①硬')
  && alignBlock.text.includes('②二硬')
  && alignBlock.text.includes('**软需求**：①软'),
  alignBlock.text.slice(0, 240))
const alignLines = alignBlock.text.split('\n').filter((l) => l.trim() !== '')
check('续行缩进到与第一条左缘对齐（四个全角空格）', alignLines.some((l) => l.startsWith('> 　　　　②')), alignLines.join(' | '))
const replyPart = alignBlock.text.split('【回帖第一块原样用这段，别重排——侧栏卡片就是同一份】\n')[1] || ''
const blockOnly = replyPart.split('\n\n')[0]
check('整块已带引用块前缀与行末反斜杠（回帖照抄不改字）',
  blockOnly.split('\n').filter((l) => l.trim() !== '').every((l) => l.startsWith('> ') && l.endsWith('\\')),
  blockOnly.slice(0, 240))
check('关卡行由工具渲染在最后', blockOnly.trim().split('\n').pop() === '> **关卡**：15/15 ✅\\', blockOnly.trim().split('\n').pop())
let gateErr = ''
try { await tool.execute({ action: 'align', goal: '缺关卡行' }, exec) } catch (e) { gateErr = String(e.message) }
check('align 缺 gate 被拒（关卡行不能少）', gateErr.includes('gate'), gateErr)
const execAccept = { agent: { session: { id: 'test-session-accept', header: { cwd: ws } } } }
await tool.execute({ action: 'align', goal: '甲目标', accept: '验收甲', gate: '15/15 ✅' }, execAccept)
const keepAccept = await tool.execute({ action: 'align', goal: '乙目标', force: true, gate: '15/15 ✅' }, execAccept)
check('accept 传了也不显示（验收已从对齐栏移除）', !keepAccept.text.includes('验收'), keepAccept.text.slice(0, 200))
await expectThrow('new 撞树被拒并提示先判联系', { action: 'new', title: '另一棵' }, '没有联系')
await expectThrow('add 缺 serves 被拒', { action: 'add', parent: 'n1', title: '子A' }, '必须写 serves')
await expectOk('add 带 serves：同级 ① + 替父', { action: 'add', parent: 'n1', title: '子A', serves: 'n1 第①条：跑通' }, '① [n2]')
await expectOk('add 第二个子：同级 ②', { action: 'add', parent: 'n1', title: '子B', serves: 'n1 第②条：双语' }, '② [n3]')
await expectOk('给子节点写目标（挂孙之前父要有目标）', { action: 'set', id: 'n2', goal: '子A 这一层要拿到的效果' }, '已更新')
await expectOk('add 孙节点：再下一级', { action: 'add', parent: 'n2', title: '孙C', serves: 'n2 拿到资料' }, '[n4]')
await expectOk('给子B写目标（改挂之前父要有目标）', { action: 'set', id: 'n3', goal: '子B 这一层要拿到的效果' }, '已更新')
await expectThrow('move 到自己子孙下被拒', { action: 'move', id: 'n2', parent: 'n4' }, '成环')
await expectOk('move 改挂父成功', { action: 'move', id: 'n4', parent: 'n3', serves: 'n3 拿到英文列' }, '已改挂')
await expectThrow('set 找不到节点被拒', { action: 'set', id: 'nx', status: 'done' }, '找不到节点')
await expectOk('set 标已定', { action: 'set', id: 'n2', status: 'done' }, '已更新')
const obsoleteOut = mod._internals.updateNode('test-session-1', { id: 'n4', status: 'obsolete' })
check('节点可标已废', obsoleteOut.node.status === 'obsolete', '')
check('当前层改已废后不再算进行中', mod._internals.currentLayerNode(mod._internals.loadTree('test-session-1').root).id !== 'n4', '')
const revived = mod._internals.updateNode('test-session-1', { id: 'n4', status: 'active', goal: '回到进行中' })
check('已废可恢复', revived.node.status === 'active', '')
// 工具 set 与侧栏改共用 updateNode：source 跟调用方走——工具改的不能冒充“用户刚改过”，
// 否则下一轮 align 会被「用户刚在侧栏改过」挡掉（2026-10-20 实测踩到）。
const srcSession = 'test-session-source'
mod._internals.autoCreateRoot(srcSession, ws)
const srcRoot = mod._internals.loadTree(srcSession).root
mod._internals.updateNode(srcSession, { id: srcRoot.id, status: 'active', source: 'user' })
const agentSet = mod._internals.updateNode(srcSession, { id: srcRoot.id, goal: '工具 set 写的目标', source: 'agent' })
check('工具 set 写的对齐栏 source=agent（不冒充用户改过）', agentSet.rec.align && agentSet.rec.align.source === 'agent', JSON.stringify(agentSet.rec.align && agentSet.rec.align.source))
const userSet = mod._internals.updateNode(srcSession, { id: srcRoot.id, goal: '侧栏改的目标', source: 'user' })
check('侧栏卡片改的对齐栏 source=user', userSet.rec.align && userSet.rec.align.source === 'user', JSON.stringify(userSet.rec.align && userSet.rec.align.source))
let badStatus = false
try {
  mod._internals.updateNode('test-session-1', { id: 'n4', status: 'dropped' })
} catch (e) {
  badStatus = String(e.message).includes('status 只能是')
}
check('非法状态被拒', badStatus, '')
const userWrite = mod._internals.applyAlign('test-session-1', { goal: '用户从侧栏改的目标', points: ['甲', '乙'] }, 'user', ws)
check('侧栏写入标记 source=user', userWrite.align.source === 'user', JSON.stringify(userWrite.align).slice(0, 160))
const injUser = mod._internals.renderInject(mod._internals.loadTree('test-session-1'))
check('注入提示以用户改写版为准', injUser.includes('用户刚在侧栏直接改过'), injUser.split('\n')[0])
check('注入不再写层号（用户改写版也不写）', !injUser.includes('本层＝') && !injUser.includes('（第'), injUser.split('\n').find((l) => l.includes('[对齐栏')) || '')
let guarded = false
try {
  mod._internals.applyAlign('test-session-1', { goal: '会话想改的目标' }, 'agent', ws)
} catch (e) {
  guarded = String(e.message).includes('用户刚在侧栏改过')
}
check('用户改过的版本不被会话静默覆盖', guarded, '')
const forced = mod._internals.applyAlign('test-session-1', { goal: '会话改的目标', force: true }, 'agent', ws)
check('带 force 才能覆盖', forced.align.goal === '会话改的目标' && forced.align.source === 'agent', JSON.stringify(forced.align).slice(0, 160))
await expectOk('read 有「现在做到哪」行', { action: 'read' }, '现在做到哪')
await expectOk('drop 带子节点：整支移除并报数', { action: 'drop', id: 'n3' }, '共 2 个')
await expectOk('unplaced 登记', { action: 'unplaced', title: '没想清的那件' }, '不进任何树')
await expectOk('unplaced 列表', { action: 'unplaced' }, '没想清的那件')
await expectOk('check 报告', { action: 'check' }, '体检')
await expectOk('export 写工作区', { action: 'export' }, '任务树.md')
check('export 文件真的落了', existsSync(join(ws, '任务树.md')) && readFileSync(join(ws, '任务树.md'), 'utf8').includes('本会话的根任务'), '')
await expectOk('list 列出各会话树', { action: 'list' }, '会话记录共')
// 2026-11-01：三问落地——父没有目标不许挂子、同父目标重复要报、衍生另立带 from、换根留痕。
const execQ = { agent: { session: { id: 'test-session-threeq', header: { cwd: ws } } } }
const callQ = (args) => tool.execute(withGate(args), execQ)
async function expectThrowQ(name, args, needle) {
  try { await callQ(args); check(name, false, '本应报错但通过了') }
  catch (e) { const m = String(e.message); check(name, !needle || m.includes(needle), m) }
}
async function expectOkQ(name, args, needle) {
  try { const r = await callQ(args); const ok = !needle || r.text.includes(needle); check(name, ok, ok ? '' : r.text.slice(0, 400)) }
  catch (e) { check(name, false, String(e.message)) }
}
await callQ({ action: 'new', title: '三问的根' })
await expectThrowQ('父没有目标时挂子被拒', { action: 'add', parent: 'n1', title: '子', serves: '替父拿下目标' }, '还没有目标')
await callQ({ action: 'set', id: 'n1', goal: '根这一层要拿到的效果' })
await expectOkQ('父有目标后挂子', { action: 'add', parent: 'n1', title: '子甲', serves: '根目标里的第①条', goal: '子甲的效果' }, '[n2]')
await expectOkQ('同父第二个子', { action: 'add', parent: 'n1', title: '子乙', serves: '根目标里的第②条', goal: '子甲的效果' }, '[n3]')
const dup = await callQ({ action: 'check' })
check('体检报同父目标一字不差', dup.text.includes('重复') && dup.text.includes('一字不差'), dup.text.slice(0, 300))
const rooted = await callQ({ action: 'align', id: 'n1', goal: '换过的根目标', force: true, why: '方向不对' })
check('纠偏返回：原目标留着、不默认拆支', rooted.text.includes('根目标已修正') && rooted.text.includes('不默认拆支'), rooted.text.slice(0, 300))
await expectThrowQ('根目标不许用 set 悄悄改（要走纠偏带 force）', { action: 'set', id: 'n1', goal: '偷偷换掉' }, '要走纠偏')
const setForce = await callQ({ action: 'set', id: 'n1', goal: '纠偏后的目标', force: true, why: '表述偏了' })
check('set 带 force 纠偏成功', setForce.text.includes('已更新'), setForce.text.slice(0, 200))
await expectThrowQ('衍生节点带 serves 被拒', { action: 'add', title: '衍生的子', from: 'n2', serves: '根目标里的第③条' }, '不写 serves')
await expectOkQ('衍生的挂成源节点的平级（不写 serves）', { action: 'add', title: '衍生出来的事', from: 'n2' }, '衍生自')
const derivedRec = mod._internals.loadTree('test-session-threeq')
const derivedNode = mod._internals.rootsOf(derivedRec)[0].children.find((c) => c.title === '衍生出来的事')
check('衍生节点与源节点同父（平级）', !!(derivedNode && derivedNode.from === 'n2'), JSON.stringify(derivedNode && { from: derivedNode.from, serves: derivedNode.serves }))
const derivedCheck = await callQ({ action: 'check' })
check('衍生节点不被报断链', !derivedCheck.text.includes('断链'), derivedCheck.text.slice(0, 300))
const injQ = mod._internals.renderInject(derivedRec)
check('注入带「目标已修正」行', injQ.includes('[目标已修正]'), injQ.split('\n').find((l) => l.includes('目标已修正')) || '')
check('注入带三问提示', injQ.includes('往上一层问'), '')
check('注入里衍生节点标来路', injQ.includes('衍生自「子甲」'), injQ.split('\n').find((l) => l.includes('衍生自')) || '')
await callQ({ action: 'set', id: derivedNode.id, status: 'active' })
const pathText = (await callQ({ action: 'read' })).text
check('进行中路径里衍生节点标「（衍生）」', pathText.includes('（衍生）'), pathText.split('\n').find((l) => l.startsWith('现在做到哪')) || '')
await callQ({ action: 'set', id: 'n1', status: 'done' })
const doneCheck = await callQ({ action: 'check' })
check('父已定、衍生还在做不算状态倒挂', !doneCheck.text.includes('状态倒挂'), doneCheck.text.slice(0, 300))
await callQ({ action: 'drop', id: 'n2' })
const orphan = await callQ({ action: 'check' })
check('源被移除后体检报「来路断了」', orphan.text.includes('来路断了'), orphan.text.slice(0, 300))
await expectOkQ('源是根时另立一棵并列的树', { action: 'new', title: '根衍生的一棵', unrelated: true, from: 'n1' }, '衍生自')
// 注入按 preset 分模式（2026-10-19 门控）：只有 evolve 自动建根、注对齐栏；
// 其它模式什么都不注（有真树时只给树）。这里走真实注册路径，顺带覆盖「投影拿不到」的退化。
const sections = []
const fakeCtx = (preset) => ({
  tools: { register: () => {} },
  commands: { register: () => {} },
  skills: { registerProvider: () => {} },
  inject: (deps, fn) => {
    if (Array.isArray(deps) && deps.includes('systemPrompt')) {
      fn({ systemPrompt: { section: (def) => sections.push(def) } })
    }
  },
  get: (name) => (name === 'sessionProjections' && preset !== undefined
    ? { stateOf: (_s, k) => (k === 'agentPreset' ? preset : undefined) }
    : undefined),
})
mod.apply(fakeCtx('evolve'))
mod.apply(fakeCtx('standard'))
mod.apply(fakeCtx(undefined))
const ctxOf = (id) => ({ agent: { session: { id, header: { cwd: ws } } } })
const markerOf = (id) => {
  try { return readFileSync(join(process.env.DSH_HOME, 'task-trees', 'sessions', `${id}.preset`), 'utf8') } catch { return '<none>' }
}
const inj = sections[0].text(ctxOf('test-session-1'))
check('进化模式写入运行态 preset 标记', markerOf('test-session-1') === 'evolve', markerOf('test-session-1'))
check('进化模式注入含对齐栏', inj.includes('[对齐栏'), inj.split('\n')[0])
check('注入含平级序号与替父', inj.includes('①') && inj.includes('替父'), inj.split('\n')[0])
check('注入不写层号（退回 2026-10-20）', !inj.includes('本层＝') && !inj.includes('（第'), inj.split('\n').find((l) => l.includes('[对齐栏')) || '')
check('注入里的基本点与回帖块同一套序号', inj.includes('**基本点**：①甲') && !inj.includes('基本点：1 甲'), inj.split('\n').find((l) => l.includes('[对齐栏')) || '')
check('注入给的是整块（四样、序号缩进同回帖块）',
  inj.includes('**本层目标**：格式测试')
  && inj.includes('**基本点**：①甲')
  && inj.includes('②乙')
  && inj.includes('**硬需求**：①硬')
  && inj.includes('**软需求**：①软')
  && inj.includes('这一轮的活还是原来那个节点的活吗'),
  inj.split('\n').slice(0, 8).join(' | '))
const inj2 = sections[0].text(ctxOf('test-session-OTHER'))
check('进化模式新会话自动长出占位根', inj2.includes('本会话任务') && inj2.includes('[任务树（本会话）]'), inj2.slice(0, 80))
const injStd = sections[1].text(ctxOf('test-session-STD'))
check('标准模式不建根、不注对齐栏', injStd === '', JSON.stringify(injStd.slice(0, 80)))
check('标准模式写入 other 标记（对齐提醒不漏给别的模式）', markerOf('test-session-STD') === 'other', markerOf('test-session-STD'))
const injStdTree = sections[1].text(ctxOf('test-session-1'))
check('标准模式有真树也一个字都不注入（树与对齐栏都只属插件进化）', injStdTree === '', JSON.stringify(injStdTree.slice(0, 80)))
// 上面那一调用把 test-session-1 的标记写成了 other；同一会话在真实使用里不会中途换模式，
// 这里把它还原成进化模式，后面的工具/注入用例才是在本模式的语境里跑。
mod._internals.markPresetMode('test-session-1', true)
const injNoProj = sections[2].text(ctxOf('test-session-NOPROJ'))
check('拿不到 preset 投影时不建根、不注对齐栏', injNoProj === '', JSON.stringify(injNoProj.slice(0, 80)))
// 工具闸（2026-10-20）：非进化模式的会话里，任务树工具整体拒绝——标准会话不建树、不写对齐栏。
const stdTools = []
const stdHandlers = {}
mod.apply({
  tools: { register: (t) => stdTools.push(t) },
  commands: { register: () => {} },
  skills: { registerProvider: () => {} },
  inject: () => {},
  on: (name, fn) => { stdHandlers[name] = fn },
  get: (name) => (name === 'sessionProjections'
    ? { stateOf: (session) => ((session && session.id === 'test-session-STD2') ? 'standard' : 'evolve') }
    : undefined),
})
// 工具按 agent 注册：先让一个「进化模式」的 agent 把工具挂出来，再拿它执行标准模式会话的事。
if (typeof stdHandlers['agent/created'] === 'function') {
  stdHandlers['agent/created']({
    agent: {
      session: { id: 'test-session-PE', header: { cwd: ws } },
      ctx: { tools: { register: (t) => { stdTools.push(t); return () => {} } } },
    },
  })
}
let stdToolRefused = false
try {
  await stdTools[0].execute({ action: 'align', goal: '标准会话里不该写得进', gate: '15/15 ✅' },
    { agent: { session: { id: 'test-session-STD2', header: { cwd: ws } } } })
} catch (e) {
  stdToolRefused = String(e.message).includes('不是进化模式')
}
check('标准模式下任务树工具拒绝（不建树、不写对齐栏）', stdToolRefused, '')
check('占位根可被 new 直接替换', (() => {
  try {
    mod._internals.autoCreateRoot('test-session-OTHER2')
    const rec = mod._internals.loadTree('test-session-OTHER2')
    return rec && rec.root && rec.root.auto === true
  } catch (e) { return false }
})(), '')
// 侧栏改状态：点谁谁就是当前层；下一轮注入提醒「任务有变动」，只提醒一次
const s3 = 'test-session-current'
mod._internals.autoCreateRoot(s3, ws)
const rec3 = mod._internals.loadTree(s3)
rec3.root.children = [
  { id: 'n2', title: '先做的', serves: '替根拿①', goal: '先做的目标', points: [], hard: '', soft: '', status: 'done', children: [] },
  { id: 'n3', title: '后做的', serves: '替根拿②', goal: '后做的目标', points: [], hard: '', soft: '', status: 'active', children: [] },
]
mod._internals.saveTree(rec3)
check('默认当前层取树序靠后的进行中节点', mod._internals.alignOf(mod._internals.loadTree(s3)).goal === '后做的目标', '')
mod._internals.updateNode(s3, { id: 'n2', status: 'active', source: 'user' })
const al3 = mod._internals.alignOf(mod._internals.loadTree(s3))
check('用户点谁，谁就是当前层（不看树序）', al3.goal === '先做的目标', JSON.stringify(al3).slice(0, 120))
const inj3 = mod._internals.injectTextForSession(s3, ws, true)
check('注入提醒「任务有变动」', inj3.includes('任务有变动'), inj3.slice(0, 100))
const inj3b = mod._internals.injectTextForSession(s3, ws, true)
check('任务有变动只提醒一次', !inj3b.includes('任务有变动'), inj3b.slice(0, 100))
const alignOnlyId = 'test-session-alignonly'
mod._internals.applyAlign(alignOnlyId, { goal: '没有树的活' }, 'agent', ws)
check('没有树时也不写层号',
  !mod._internals.injectTextForSession(alignOnlyId, ws, true).includes('本层＝'),
  mod._internals.injectTextForSession(alignOnlyId, ws, true).split('\n').slice(0, 2).join(' | '))
check('align 返回块不写层号（节点在第 2 层时）',
  mod._internals.renderAlignBlock(mod._internals.loadTree(s3), { id: 'n2' }, mod._internals.alignOf(mod._internals.loadTree(s3))).startsWith('**本层目标**：'),
  mod._internals.renderAlignBlock(mod._internals.loadTree(s3), { id: 'n2' }, mod._internals.alignOf(mod._internals.loadTree(s3))).split('\n')[0])
mod._internals.applyAlign(s3, { goal: '会话回写的新目标', force: true }, 'agent', ws)
const n2b = mod._internals.walkNodes(mod._internals.loadTree(s3).root).map((w) => w.node).find((n) => n.id === 'n2')
check('agent 回写也落在用户点的当前层', n2b.goal === '会话回写的新目标', n2b.goal)
check('显示不带修改日期', !/\d{4}-\d{2}-\d{2}/.test(mod._internals.renderTree(mod._internals.loadTree('test-session-1'))), '')
await expectOk('确认无联系另立新根（unrelated）', { action: 'new', title: '无联系的新根', unrelated: true }, '无联系的新根')
const afterSplit = mod._internals.loadTree('test-session-1')
const splitRoots = mod._internals.rootsOf(afterSplit)
check('另立新根不归档：两棵并存', splitRoots.length === 2, String(splitRoots.length))
check('旧树还在（没被顶掉）', splitRoots.some((r) => r.title === '本会话的根任务'), splitRoots.map((r) => r.title).join('＋'))
check('当前根切到新立的那棵', afterSplit.root && afterSplit.root.title === '无联系的新根', afterSplit.root && afterSplit.root.title)
check('注入里两棵都列出来', (() => { const t = mod._internals.injectTextForSession('test-session-1', ws, true) || ''; return t.includes('本会话的根任务') && t.includes('无联系的新根') })(), '')
const preDrop = mod._internals.loadTree('test-session-1')
const oldRoot = mod._internals.rootsOf(preDrop).find((r) => r.title === '本会话的根任务')
await expectOk('整棵树可移除（挪进 archived）', { action: 'drop', id: oldRoot.id }, '移出本会话')
const afterDrop = mod._internals.loadTree('test-session-1')
check('移除后只剩一棵', mod._internals.rootsOf(afterDrop).length === 1, String(mod._internals.rootsOf(afterDrop).length))

// 回归：父级排队、子级进行中时，align 不该落回根（实测踩到：第一层被逐轮改掉）
const s4 = 'test-session-deep'
mod._internals.autoCreateRoot(s4, ws)
const rec4 = mod._internals.loadTree(s4)
rec4.root.goal = '根目标'
rec4.root.children = [
  {
    id: 'n2', title: '中段', serves: '替根拿①', goal: '中段目标', points: [], hard: '', soft: '', status: 'pending',
    children: [
      { id: 'n3', title: '深处', serves: '替中段拿①', goal: '深处目标', points: [], hard: '', soft: '', status: 'active', children: [] },
    ],
  },
]
mod._internals.saveTree(rec4)
check('父级排队、子级进行中时，当前层取子级不取根',
  mod._internals.currentLayerNode(mod._internals.loadTree(s4).root).id === 'n3', '')
let rootGuarded = false
try {
  mod._internals.applyAlign(s4, { id: mod._internals.loadTree(s4).root.id, goal: '想直接改根的目标' }, 'agent', ws)
} catch (e) { rootGuarded = String(e.message).includes('根是整棵树的目的') }
check('根有子支时直接改根目标被拒（要先 add 挂支或 force）', rootGuarded, '')
const forcedRoot = mod._internals.applyAlign(s4, { id: mod._internals.loadTree(s4).root.id, goal: '确认换根', force: true }, 'agent', ws)
check('带 force 才可换根', forcedRoot.align.goal === '确认换根', JSON.stringify(forcedRoot.align).slice(0, 120))
// 显示口径：全树只有一个「运行中」（当前在跑的那颗），其余没做完的一律「排队中」。
const dispText = mod._internals.renderTree(mod._internals.loadTree(s4))
check('显示口径：全树只有一个运行中，其余没做完的排队中',
  (dispText.match(/运行中/g) || []).length === 1 && dispText.includes('排队中'),
  dispText.split('\n').filter((l) => l.includes('[')).join(' | '))
// 对齐栏两行目标（2026-10-25 定）：根本目标＝上一级，本层目标＝这一层（验收跟本层目标）。
const s5 = 'test-session-twoline'
mod._internals.autoCreateRoot(s5, ws)
const rec5 = mod._internals.loadTree(s5)
rec5.root.goal = '上一级的目标'
rec5.root.children = [{
  id: 'n2', title: '子', serves: '替根拿①', goal: '这一层的目标', accept: '做完你能核',
  points: ['甲'], hard: '', soft: '', status: 'active', children: [],
}]
mod._internals.saveTree(rec5)
const child5 = mod._internals.loadTree(s5).root.children[0]
const blk5 = mod._internals.renderAlignBlock(mod._internals.loadTree(s5), child5, {
  goal: '这一层的目标', accept: '做完你能核', points: ['甲'], hard: '', soft: '',
})
check('有上一层时也只出本层目标一行（根本目标不进对齐栏）',
  blk5.split('\n')[0] === '**本层目标**：这一层的目标'
  && !blk5.includes('根本目标')
  && !blk5.includes('验收＝'),
  blk5.split('\n').slice(0, 2).join(' | '))
const root5 = mod._internals.loadTree(s5).root
const blkRoot5 = mod._internals.renderAlignBlock(mod._internals.loadTree(s5), root5, {
  goal: '上一级的目标', accept: '', points: ['甲'], hard: '', soft: '',
})
check('当前节点就是根时只出一行本层目标（不出根本目标）',
  blkRoot5.startsWith('**本层目标**：上一级的目标') && !blkRoot5.includes('根本目标'), blkRoot5.split('\n')[0])
const parsed5 = mod._internals.parseAlignBlock('根本目标：上一级的目标\n本层目标：这一层的目标。验收＝做完你能核\n基本点：①甲')
check('回帖解析优先取「本层目标」，不拿上一级的目标回写节点',
  parsed5 && parsed5.goal === '这一层的目标' && parsed5.accept === '做完你能核',
  JSON.stringify(parsed5).slice(0, 160))
const parsedBold = mod._internals.parseAlignBlock('> **根本目标**：上一级的目标  \n> **本层目标**：这一层的目标。验收＝做完你能核  \n> **基本点**：①甲  ')
check('加粗版回帖（新格式）也能解析回写', parsedBold && parsedBold.goal === '这一层的目标' && parsedBold.accept === '做完你能核' && parsedBold.points[0] === '甲', JSON.stringify(parsedBold).slice(0, 160))
const bs = String.fromCharCode(92)
const parsedBackslash = mod._internals.parseAlignBlock([
  '> **本层目标**：做出可核的目标',
  '> **基本点**：①甲',
  '> 　　　　②乙',
  '> **硬需求**：①硬〔原话〕',
  '> **软需求**：无',
  '> **关卡**：15/15 ✅',
].map((l) => l + bs).join('\n'))
check('行末反斜杠不进字段（目标／基本点／硬需求都剥掉）',
  parsedBackslash && parsedBackslash.goal === '做出可核的目标'
  && parsedBackslash.points[0] === '甲' && parsedBackslash.points[1] === '乙'
  && parsedBackslash.hard === '硬〔原话〕' && parsedBackslash.soft === '',
  JSON.stringify(parsedBackslash))

// 2026-11-08：捕获回路原来只收「硬需求：」那一行，续行（②③…）全丢 → 每轮回写后只剩第一条。
const parsedMulti = mod._internals.parseAlignBlock([
  '> **本层目标**：做出可核的目标',
  '> **硬需求**：①硬一〔原话〕',
  '> 　　　　②硬二〔反推〕',
  '> 　　　　③硬三〔硬事实〕',
  '> **软需求**：①软一',
  '> 　　　　②软二',
  '> **关卡**：15/15 ✅',
].map((l) => l + bs).join('\n'))
check('硬需求/软需求的续行也收（不再只剩第一条）',
  parsedMulti && parsedMulti.hard === '硬一〔原话〕｜硬二〔反推〕｜硬三〔硬事实〕'
  && parsedMulti.soft === '软一｜软二',
  JSON.stringify(parsedMulti))

// 反推闸门（2026-11-05）：新立或 force 纠偏时，硬需求要留下走过反推的痕迹（〔反推〕标记或「反推无新增」）
const gateExec = { agent: { session: { id: 'test-session-gate', header: { cwd: ws } } } }
const gateCall = (args) => tool.execute(args, gateExec)
let gateNewErr = ''
try { await gateCall({ action: 'new', title: '闸门根', goal: '把事做成', hard: '只写原话〔原话〕' }) }
catch (e) { gateNewErr = String(e.message) }
check('new 立树时硬需求缺反推标记被拒', gateNewErr.includes('反推无新增'), gateNewErr)
await gateCall({ action: 'new', title: '闸门根', goal: '把事做成', hard: '只写原话〔原话〕｜反推无新增' })
let gateAddErr = ''
try { await gateCall({ action: 'add', parent: 'n1', title: '子', serves: '把事做成', hard: '只写原话〔原话〕' }) }
catch (e) { gateAddErr = String(e.message) }
check('add 挂支时硬需求缺反推标记被拒', gateAddErr.includes('反推'), gateAddErr)
const gateAddOk = await gateCall({ action: 'add', parent: 'n1', title: '子', serves: '把事做成', hard: '保留原样〔反推·关键：撤了原样没了〕' })
check('add 带〔反推〕标记可通过', gateAddOk.text.includes('[n2]'), gateAddOk.text.slice(0, 200))
let gateForceErr = ''
try { await gateCall({ action: 'align', goal: '把事做成', hard: '只写原话〔原话〕', force: true, gate: '15/15 ✅' }) }
catch (e) { gateForceErr = String(e.message) }
check('force 纠偏时硬需求缺反推标记被拒', gateForceErr.includes('反推'), gateForceErr)
const gateForceOk = await gateCall({ action: 'align', goal: '把事做成', hard: '只写原话〔原话〕｜反推无新增', force: true, gate: '15/15 ✅' })
check('force 纠偏写「反推无新增」可通过', gateForceOk.text.includes('已同步对齐栏'), gateForceOk.text.slice(0, 200))

// 根只装一件事（2026-11-08）：根目标用「；」并列两件事 → 当场拒（本会话出过这个错，事后才拆）
const oneExec = { agent: { session: { id: 'test-session-onegoal', header: { cwd: ws } } } }
let twoEffectsErr = ''
try {
  await tool.execute({ action: 'new', title: '两件事', goal: '把卡片改好；把画像判据写清', hard: '甲〔原话〕｜反推无新增' }, oneExec)
} catch (e) { twoEffectsErr = String(e.message) }
check('根目标用「；」并列两件事被拒', twoEffectsErr.includes('根只装一件事'), twoEffectsErr)
const singleExtra = await tool.execute({ action: 'new', title: '一件事', goal: '把卡片改好', hard: '甲〔原话〕｜反推无新增' }, oneExec)
check('单件事的根照常能立', singleExtra.text.includes('已立'), singleExtra.text.slice(0, 120))
let alignTwoErr = ''
try {
  await tool.execute({ action: 'align', goal: '把卡片改好；把画像写清', gate: '15/15 ✅' }, oneExec)
} catch (e) { alignTwoErr = String(e.message) }
check('align 落在根上并列两件事也被拒', alignTwoErr.includes('根只装一件事'), alignTwoErr)

// 会话分支（2026-11-08）：DSH 分支＝把父会话档复制到新 id；树要跟着过来，不能从零开始
const zlib = await import('node:zlib')
const parentId = 'session-11111111-1111-1111-1111-111111111111'
const childId = 'session-22222222-2222-2222-2222-222222222222'
const sessRoot = join(process.env.DSH_HOME, 'sessions')
const frameOf = (obj) => zlib.zstdCompressSync(Buffer.from(JSON.stringify(obj) + '\n', 'utf8'))
mkdirSync(join(sessRoot, 'ws', childId), { recursive: true })
writeFileSync(join(sessRoot, 'ws', childId, 'session.v4.jsonl.zstd'), Buffer.concat([
  frameOf({ type: 'session', version: 4, id: childId, cwd: ws, agentPreset: 'evolve' }),
  frameOf({ type: 'session-log-deepseek/delivery-accepted', data: { sessionId: parentId } }),
]))
mod._internals.saveTree({
  version: 3,
  sessionId: parentId,
  cwd: ws,
  roots: [{
    id: 'n1', title: '父会话的任务', serves: '', goal: '父会话的目标', accept: '',
    points: ['甲'], hard: '', soft: '', status: 'active', auto: false, children: [],
  }],
  currentRootId: 'n1',
  dropped: [],
  unplaced: [],
})
const adopted = mod._internals.autoCreateRoot(childId, ws)
check('分支会话自动继承父会话的树（不再从空树开始）',
  !!(adopted && adopted.root && adopted.root.title === '父会话的任务'
    && adopted.inheritedFrom === parentId && adopted.root.points[0] === '甲'),
  JSON.stringify(adopted && adopted.root && adopted.root.title))

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : '  ← ' + r.detail}`)
const failed = results.filter((r) => !r.ok).length
console.log(`\n合计 ${results.length} 项，失败 ${failed} 项`)
rmSync(root, { recursive: true, force: true })
process.exit(failed === 0 ? 0 : 1)
