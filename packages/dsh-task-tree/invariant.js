const PACKAGE_NAME = 'dsh-task-tree'

/** Cordis companion plugin name. */
export const name = 'dsh-task-tree-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

const install = () => {}

export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
