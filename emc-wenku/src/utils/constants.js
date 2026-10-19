export const categories = [
  { id: '01', name: '教程攻略' },
  { id: '02', name: '报刊杂志' },
  { id: '03', name: '历史传记' },
  { id: '04', name: '政论文书' },
  { id: '05', name: '规则制度' },
  { id: '06', name: '文艺创作' },
  { id: '07', name: '数据统计' },
  { id: '08', name: '声像资料' },
]

export const periods = [
  { id: '01', name: '【Nova】早期拓荒与社群形成' },
  { id: '02', name: '【Aurora】开荒与建国' },
  { id: '03', name: '【Aurora】明联邦秩序' },
  { id: '04', name: '【Aurora】大滇崛起与护国战争' },
  { id: '05', name: '【Aurora】华夏联盟与抗韩战争' },
  { id: '06', name: '【Aurora】中华合众国统合' },
  { id: '07', name: '【Aurora】周目末期与多极化' },
  { id: '08', name: '【Nostra】周目初开与建国潮' },
  { id: '09', name: '【Nostra】中日战争' },
  { id: '10', name: '【Nostra】多极竞争' },
]

export const STORAGE_KEYS = {
  literature: 'emc_literature',
  favorites: 'emc_favorites',
  theme: 'emc_theme',
  adminStatus: 'emc_admin_status',
}

export const getCategoryName = (id) => categories.find((item) => item.id === id)?.name ?? '未分类'
export const getPeriodName = (id) => periods.find((item) => item.id === id)?.name ?? '时期未标注'

export const DEMO_ADMIN = {
  username: 'admin',
  password: 'emc-wenku',
}
