export const TEAM_MEMBERS = ['Aman', 'Anurag', 'Kunal', 'Harshita', 'External']
export const MEMBER_ROLE_LABELS = {
  admin: 'Admin',
  member: 'Member',
}
export const MEMBER_ROLES = { admin: 'admin', member: 'member' }

export const STATUS_OPTIONS = [
  { value: 'running', label: 'Ongoing' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'stuck', label: 'Stuck' },
  { value: 'onhold', label: 'On Hold' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'done', label: 'Done' },
]

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export const STATUS_LABELS = {
  running: 'Ongoing', pending: 'Pending', under_review: 'Under Review', stuck: 'Stuck',
  onhold: 'On Hold', upcoming: 'Upcoming', done: 'Done', overdue: 'Overdue'
}

export const KEYWORD_RULES = [
  { words: ['done','complete','kar diya','finish','delivered','ho gaya','khatam','submit','sent','bhej diya','cleared','approved'], status: 'done', label: 'Done' },
  { words: ['stuck','atka','block','ruk gaya','issue','problem','nahi ho raha','delay ho raha'], status: 'stuck', label: 'Stuck' },
  { words: ['hold','roko','wait','rok do','pause','baad mein'], status: 'onhold', label: 'On Hold' },
  { words: ['start','shuru','begin','chal raha','underway','in progress','chal rahe'], status: 'running', label: 'Ongoing' },
  { words: ['pending','awaiting','wait kar','waiting','nahi mila','reply nahi'], status: 'pending', label: 'Pending' },
]

export const AVATAR_COLORS = {
  Aman: 'avatar-blue', Anurag: 'avatar-green', Kunal: 'avatar-amber',
  Harshita: 'avatar-red', External: 'avatar-gray', Me: 'avatar-blue', Admin: 'avatar-blue'
}

export function extractMentions(text, names = []) {
  if (!text) return []
  const matches = text.match(/@([A-Za-z0-9_]+)/g) || []
  const normalizedNames = names.map(n => n.trim()).filter(Boolean)
  const lowerMap = new Map(normalizedNames.map(n => [n.toLowerCase(), n]))
  const seen = new Set()
  const mentions = []

  for (const raw of matches) {
    const candidate = raw.slice(1).toLowerCase()
    const found = lowerMap.get(candidate)
    if (found && !seen.has(found)) {
      seen.add(found)
      mentions.push(found)
    }
  }

  return mentions
}

export function isOverdue(deadline, status) {
  if (!deadline || status === 'done' || status === 'onhold') return false
  return new Date(deadline) < new Date(new Date().toDateString())
}

export function displayStatus(task) {
  if (isOverdue(task.deadline, task.status)) return 'overdue'
  return task.status
}

export function initials(name) {
  return name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
}

export function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
