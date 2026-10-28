import User from '../models/User.js'
import RefreshToken from '../models/RefreshToken.js'
import { badRequest, conflict, forbidden, notFound } from '../lib/http-error.js'
import Store from '../models/Store.js'
import { parsePagination, parseSort, pageMeta, buildSearch } from '../lib/query.js'

const ROLES = ['Owner', 'Manager', 'Cashier']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SORTABLE = ['name', 'role', 'createdAt']

const assertRole = (role) => {
  if (!ROLES.includes(role)) throw badRequest('Choose a valid role: Owner, Manager or Cashier.')
}

export const teamService = {
  async list(storeId, query = {}) {
    const { page, limit, skip } = parsePagination(query)
    const sort = parseSort(query, SORTABLE, { createdAt: 1 })
    const filter = { store: storeId }
    const search = buildSearch(['name', 'email', 'phone'], query.search)
    if (search) Object.assign(filter, search)
    const [users, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ])
    const owner = await User.findOne({ store: storeId, role: 'Owner' }).select('_id').lean()
    return {
      items: users.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        role: u.role,
        status: u.status,
        lastLoginAt: u.lastLoginAt || null,
        isOwner: Boolean(owner && String(owner._id) === String(u._id)),
      })),
      meta: pageMeta(total, page, limit),
    }
  },

  async create(storeId, payload, actor) {
    const name = String(payload.name || '').trim()
    const email = String(payload.email || '').trim().toLowerCase()
    const role = payload.role || 'Cashier'
    assertRole(role)
    if (name.length < 2) throw badRequest('Enter a name.')
    if (!EMAIL_RE.test(email)) throw badRequest('Enter a valid email address.')
    if (!payload.password || payload.password.length < 8) throw badRequest('Use at least 8 characters for the password.')
    // Only an Owner may create another Owner.
    if (role === 'Owner' && actor?.role !== 'Owner') throw forbidden('Only the owner can add another owner.')

    if (await User.exists({ email })) throw conflict('Someone already uses that email address.')
    const user = new User({ name, email, phone: String(payload.phone || '').trim(), role, store: storeId, status: 'active' })
    await user.setPassword(payload.password)
    try {
      await user.save()
    } catch (err) {
      if (err?.code === 11000) throw conflict('Someone already uses that email address.')
      throw err
    }
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    }
  },

  async update(storeId, id, payload, actor) {
    const user = await User.findOne({ _id: id, store: storeId })
    if (!user) throw notFound('Team member not found.')

    if (payload.role !== undefined) {
      assertRole(payload.role)
      if (actor.role !== 'Owner') throw forbidden('Only the owner can change roles.')
      if (String(user._id) === String(actor.id)) throw badRequest('You cannot change your own role.')
      // Never leave a store without an owner.
      if (user.role === 'Owner' && payload.role !== 'Owner') {
        const owners = await User.countDocuments({ store: storeId, role: 'Owner', status: 'active' })
        if (owners <= 1) throw badRequest('A store must keep at least one active owner.')
      }
      user.role = payload.role
    }
    if (payload.name !== undefined) user.name = String(payload.name).trim()
    if (payload.phone !== undefined) user.phone = String(payload.phone).trim()
    await user.save()
    return user
  },

  /** Disabling a user revokes every refresh session immediately. Owner only. */
  async setStatus(storeId, id, status, actor) {
    if (!['active', 'disabled'].includes(status)) throw badRequest('Status must be active or disabled.')
    if (actor.role !== 'Owner') throw forbidden('Only the store owner can enable or disable a team member.')
    const user = await User.findOne({ _id: id, store: storeId })
    if (!user) throw notFound('Team member not found.')
    if (String(user._id) === String(actor.id)) throw badRequest('You cannot disable your own account.')
    if (user.role === 'Owner' && status === 'disabled') {
      const owners = await User.countDocuments({ store: storeId, role: 'Owner', status: 'active' })
      if (owners <= 1) throw badRequest('A store must keep at least one active owner.')
    }
    user.status = status
    await user.save()
    if (status === 'disabled') {
      await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } })
    }
    return user
  },
}

export const roleOptions = ROLES
export default teamService
