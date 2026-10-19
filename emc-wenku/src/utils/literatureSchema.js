import { categories, periods } from './constants'

export const LITERATURE_SCHEMA_VERSION = 1

export const verificationStatuses = [
  { id: 'unverified', name: '待核实' },
  { id: 'needs-review', name: '需要复核' },
  { id: 'verified', name: '已核实' },
]

export const visibilityOptions = [
  { id: 'public', name: '公开' },
  { id: 'internal', name: '内部' },
]

export function createEmptySource() {
  return {
    name: '',
    identifier: '',
    url: '',
    note: '',
    verificationStatus: 'unverified',
    visibility: 'public',
  }
}

export function normalizeLiteratureRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('文献记录必须是对象。')
  }

  const source =
    record.source && typeof record.source === 'object' && !Array.isArray(record.source)
      ? record.source
      : {}

  return {
    id: String(record.id ?? '').trim(),
    title: String(record.title ?? '').trim(),
    author: String(record.author ?? '').trim(),
    period: String(record.period ?? '').trim(),
    category: String(record.category ?? '').trim(),
    summary: String(record.summary ?? '').trim(),
    content: String(record.content ?? ''),
    views: Number(record.views ?? 0),
    date: String(record.date ?? '').trim(),
    source: {
      name: String(source.name ?? '').trim(),
      identifier: String(source.identifier ?? '').trim(),
      url: String(source.url ?? '').trim(),
      note: String(source.note ?? '').trim(),
      verificationStatus: String(source.verificationStatus ?? 'unverified'),
      visibility: String(source.visibility ?? 'public'),
    },
  }
}

function isRealDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

export function validateLiteratureRecord(rawRecord, index = 0) {
  const prefix = `第 ${index + 1} 条文献`
  let item
  try {
    item = normalizeLiteratureRecord(rawRecord)
  } catch (error) {
    throw new Error(`${prefix}：${error.message}`)
  }

  for (const field of ['id', 'title', 'author', 'summary', 'content']) {
    if (!item[field].trim()) throw new Error(`${prefix}缺少${field}。`)
  }
  if (!categories.some((entry) => entry.id === item.category)) {
    throw new Error(`${prefix}的分类编号无效：${item.category || '空'}。`)
  }
  if (!periods.some((entry) => entry.id === item.period)) {
    throw new Error(`${prefix}的时期编号无效：${item.period || '空'}。`)
  }
  if (!Number.isSafeInteger(item.views) || item.views < 0) {
    throw new Error(`${prefix}的浏览量必须是非负整数。`)
  }
  if (!isRealDate(item.date)) throw new Error(`${prefix}的日期无效，请使用真实日期 YYYY-MM-DD。`)
  if (!verificationStatuses.some((entry) => entry.id === item.source.verificationStatus)) {
    throw new Error(`${prefix}的来源核实状态无效。`)
  }
  if (!visibilityOptions.some((entry) => entry.id === item.source.visibility)) {
    throw new Error(`${prefix}的可见范围无效。`)
  }
  if (item.source.url) {
    try {
      const url = new URL(item.source.url)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      throw new Error(`${prefix}的来源链接必须是有效的 HTTP 或 HTTPS 地址。`)
    }
  }

  return item
}

export function validateLiteratureCollection(input) {
  const rows = Array.isArray(input) ? input : input?.literature
  if (!Array.isArray(rows)) throw new Error('JSON 顶层必须是文献数组，或包含 literature 数组。')

  const ids = new Set()
  return rows.map((row, index) => {
    const item = validateLiteratureRecord(row, index)
    if (ids.has(item.id)) throw new Error(`第 ${index + 1} 条文献的 ID 重复：${item.id}。`)
    ids.add(item.id)
    return item
  })
}
