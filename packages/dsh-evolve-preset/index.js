/**
 * dsh-evolve-preset 宿主半边（合包版）。
 *
 * 一个包里装下进化模式的全部宿主能力：任务树工具与路由、画像注入、画像面板路由、
 * 自查工具、计划模式入口。每一块原来是一个独立包，现按模块收进 host/，
 * 在一个 apply 里依次挂载，靠 inject 拿公共的 tools / commands / shell / sandboxPolicy。
 * 单块挂载失败不拖垮整包：捕获后打一行警告，其余照常挂上。
 */

import * as taskTree from './host/task-tree.js'
import * as profileInject from './host/profile-inject.js'
import * as profilePanel from './host/profile-panel.js'
import * as chatDensity from './host/chat-density.js'
import * as check from './host/check.js'
import * as planEnter from './host/plan-enter.js'

/** Cordis 插件名：与包名一致。 */
export const name = 'dsh-evolve-preset'

/** 并集：任务树要 tools/commands，自查要 tools/shell/sandboxPolicy。 */
export const inject = ['tools', 'commands', 'shell', 'sandboxPolicy']

/** 挂载顺序固定；plan-enter 内部自己判 planMode 在不在。 */
const MODULES = [
  ['task-tree', taskTree],
  ['profile-inject', profileInject],
  ['profile-panel', profilePanel],
  ['chat-density', chatDensity],
  ['check', check],
  ['plan-enter', planEnter],
]

/**
 * 依次挂载各模块。
 * @param ctx Cordis 上下文。
 */
export function apply(ctx) {
  for (const [label, mod] of MODULES) {
    try {
      mod.apply(ctx)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[dsh-evolve-preset] ${label} 未挂上：${message}`)
    }
  }
}
