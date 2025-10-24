import type { IconName } from '#/k-icons'
import { ROUTES } from '#/router/routerConstants'

export type ModuleKey = 'management' | 'collection' | 'quality-control' | 'mranalysis'

export interface ModulePanelDefinition {
  key: string
  label: string
  path: string
}

export interface ModuleDefinition {
  key: ModuleKey
  label: string
  icon: IconName
  route: string
  panels: ModulePanelDefinition[]
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key: 'management',
    label: t('Management'),
    icon: 'settings',
    route: ROUTES.MANAGEMENT,
    panels: [
      { key: 'project-management', label: t('Project Management'), path: 'project-management' },
      { key: 'user-management', label: t('User Management'), path: 'user-management' },
      { key: 'database-management', label: t('Database Management'), path: 'database-management' },
    ],
  },
  {
    key: 'collection',
    label: t('Collection'),
    icon: 'group',
    route: ROUTES.COLLECTION,
    panels: [
      { key: 'collection-management', label: t('Collection Management'), path: 'collection-management' },
      { key: 'collection-performance', label: t('Collection Performance'), path: 'collection-performance' },
      { key: 'quota-management', label: t('Quota Management'), path: 'quota-management' },
      { key: 'telephone-interviewer', label: t('Telephone Interviewer'), path: 'telephone-interviewer' },
      { key: 'fieldwork-interviewer', label: t('Fieldwork Interviewer'), path: 'fieldwork-interviewer' },
      { key: 'focus-group-panel', label: t('Focus Group Panel'), path: 'focus-group-panel' },
    ],
  },
  {
    key: 'quality-control',
    label: t('Quality Control'),
    icon: 'check',
    route: ROUTES.QUALITY_CONTROL,
    panels: [
      { key: 'qc-management', label: t('QC Management'), path: 'qc-management' },
      { key: 'qc-performance', label: t('QC Performance'), path: 'qc-performance' },
      { key: 'voice-review', label: t('Voice Review'), path: 'voice-review' },
      { key: 'callback-qc', label: t('Callback QC'), path: 'callback-qc' },
      { key: 'coding', label: t('Coding'), path: 'coding' },
      { key: 'statistical-health-check', label: t('Statistical Health Check'), path: 'statistical-health-check' },
    ],
  },
  {
    key: 'mranalysis',
    label: t('MRAnalysis'),
    icon: 'reports',
    route: ROUTES.MRANALYSIS,
    panels: [
      { key: 'tabulation', label: t('Tabulation'), path: 'tabulation' },
      { key: 'statistics', label: t('Statistics'), path: 'statistics' },
      { key: 'funnel-analysis', label: t('Funnel Analysis'), path: 'funnel-analysis' },
      { key: 'conjoint-analysis', label: t('Conjoint Analysis'), path: 'conjoint-analysis' },
      { key: 'segmentation-analysis', label: t('Segmentation Analysis'), path: 'segmentation-analysis' },
    ],
  },
]

export const MODULE_DEFINITION_MAP: Record<ModuleKey, ModuleDefinition> = MODULE_DEFINITIONS.reduce(
  (acc, definition) => {
    acc[definition.key] = definition
    return acc
  },
  {} as Record<ModuleKey, ModuleDefinition>,
)

export function getModuleDefinition(moduleKey: ModuleKey): ModuleDefinition | undefined {
  return MODULE_DEFINITION_MAP[moduleKey]
}

export function getPanelDefinition(moduleKey: ModuleKey, panelKey: string): ModulePanelDefinition | undefined {
  const moduleDefinition = getModuleDefinition(moduleKey)
  if (!moduleDefinition) {
    return undefined
  }
  return moduleDefinition.panels.find((panel) => panel.key === panelKey)
}

export function getPanelRoute(moduleKey: ModuleKey, panelKey: string): string | undefined {
  const moduleDefinition = getModuleDefinition(moduleKey)
  const panelDefinition = getPanelDefinition(moduleKey, panelKey)
  if (!moduleDefinition || !panelDefinition) {
    return undefined
  }
  return `${moduleDefinition.route}/${panelDefinition.path}`
}

export const MODULE_KEYS: ModuleKey[] = MODULE_DEFINITIONS.map((definition) => definition.key)
