/**
 * 给模型一个进入计划模式的入口。
 *
 * 类型：工具；解决：工具表里只有 exit_plan_mode，模型自己开不了计划模式；
 * 作用：暴露 enter_plan_mode，把当前会话切进计划模式——之后只读只规划，
 * 最后用 exit_plan_mode 交计划给用户批。
 */

import { defineTool } from '@deepseek-ai/dsh-tools'

/** Cordis 插件名。 */
export const name = 'dsh-plan-enter'

/** 需要的服务：tools 注册工具，planMode 改计划模式状态（挂在 preset 的 planning 组里才拿得到隔离实例）。 */
export const inject = ['tools', 'planMode']

/** 工具名。 */
const TOOL = 'enter_plan_mode'

const DESCRIPTION
  = 'Switch this session into plan mode before doing the work. In plan mode you only read, search and design, '
  + 'and you finish by calling exit_plan_mode with the complete plan for the user to approve. '
  + 'Use it when the task writes files or configuration, touches the user\'s own files, needs more than one step, '
  + 'or its direction is not settled yet. Do not use it for a request a single reply can answer.'

/**
 * 注册 enter_plan_mode。
 * @param ctx Cordis 上下文。
 */
export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: TOOL,
    description: DESCRIPTION,
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { message: { type: 'string', required: true } },
      },
      render: (_args, value) => [{ type: 'text', text: value.message }],
    },
    execute: async (_args, exec) => {
      const agent = exec.agent
      if (agent === undefined) throw new Error(TOOL + ' requires a calling agent (no session to switch)')
      const outcome = ctx.planMode.set(agent, true)
      const quiet = 'Read and design only, then submit the plan through exit_plan_mode.'
      return {
        message: outcome === 'queued'
          ? 'Plan mode applies from the next step. ' + quiet
          : 'Plan mode is on. ' + quiet,
      }
    },
  }))
}
