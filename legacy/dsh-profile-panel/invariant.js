const PACKAGE_NAME = 'dsh-profile-panel'

/** Cordis companion plugin name. */
export const name = 'dsh-profile-panel-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

const install = () => {}

export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
