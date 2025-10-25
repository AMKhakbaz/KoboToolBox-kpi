import type { IconName } from '#/k-icons'
import { ROUTES } from '#/router/routerConstants'

export type ModuleKey = 'management' | 'collection' | 'quality-control' | 'mranalysis'

export interface ModulePanelDefinition {
  key: string
  path: string
  label: string
  labelKey: string
}

export interface ModuleDefinition {
  key: ModuleKey
  icon: IconName
  route: string
  label: string
  labelKey: string
  panels: ModulePanelDefinition[]
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key: 'management',
    icon: 'settings',
    route: ROUTES.MANAGEMENT,
    label: t('Management'),
    labelKey: 'layout.modules.management',
    panels: [
      {
        key: 'project-management',
        path: 'project-management',
        label: t('Project Management'),
        labelKey: 'panels.management.project-management',
      },
      {
        key: 'user-management',
        path: 'user-management',
        label: t('User Management'),
        labelKey: 'panels.management.user-management',
      },
      {
        key: 'database-management',
        path: 'database-management',
        label: t('Database Management'),
        labelKey: 'panels.management.database-management',
      },
    ],
  },
  {
    key: 'collection',
    icon: 'group',
    route: ROUTES.COLLECTION,
    label: t('Collection'),
    labelKey: 'layout.modules.collection',
    panels: [
      {
        key: 'collection-management',
        path: 'collection-management',
        label: t('Collection Management'),
        labelKey: 'panels.collection.collection-management',
      },
      {
        key: 'collection-performance',
        path: 'collection-performance',
        label: t('Collection Performance'),
        labelKey: 'panels.collection.collection-performance',
      },
      {
        key: 'quota-management',
        path: 'quota-management',
        label: t('Quota Management'),
        labelKey: 'panels.collection.quota-management',
      },
      {
        key: 'telephone-interviewer',
        path: 'telephone-interviewer',
        label: t('Telephone Interviewer'),
        labelKey: 'panels.collection.telephone-interviewer',
      },
      {
        key: 'fieldwork-interviewer',
        path: 'fieldwork-interviewer',
        label: t('Fieldwork Interviewer'),
        labelKey: 'panels.collection.fieldwork-interviewer',
      },
      {
        key: 'focus-group-panel',
        path: 'focus-group-panel',
        label: t('Focus Group Panel'),
        labelKey: 'panels.collection.focus-group-panel',
      },
    ],
  },
  {
    key: 'quality-control',
    icon: 'check',
    route: ROUTES.QUALITY_CONTROL,
    label: t('Quality Control'),
    labelKey: 'layout.modules.quality-control',
    panels: [
      {
        key: 'qc-management',
        path: 'qc-management',
        label: t('QC Management'),
        labelKey: 'panels.quality-control.qc-management',
      },
      {
        key: 'qc-performance',
        path: 'qc-performance',
        label: t('QC Performance'),
        labelKey: 'panels.quality-control.qc-performance',
      },
      {
        key: 'voice-review',
        path: 'voice-review',
        label: t('Voice Review'),
        labelKey: 'panels.quality-control.voice-review',
      },
      {
        key: 'callback-qc',
        path: 'callback-qc',
        label: t('Callback QC'),
        labelKey: 'panels.quality-control.callback-qc',
      },
      {
        key: 'coding',
        path: 'coding',
        label: t('Coding'),
        labelKey: 'panels.quality-control.coding',
      },
      {
        key: 'statistical-health-check',
        path: 'statistical-health-check',
        label: t('Statistical Health Check'),
        labelKey: 'panels.quality-control.statistical-health-check',
      },
    ],
  },
  {
    key: 'mranalysis',
    icon: 'reports',
    route: ROUTES.MRANALYSIS,
    label: t('MRAnalysis'),
    labelKey: 'layout.modules.mranalysis',
    panels: [
      {
        key: 'tabulation',
        path: 'tabulation',
        label: t('Tabulation'),
        labelKey: 'panels.mranalysis.tabulation',
      },
      {
        key: 'statistics',
        path: 'statistics',
        label: t('Statistics'),
        labelKey: 'panels.mranalysis.statistics',
      },
      {
        key: 'funnel-analysis',
        path: 'funnel-analysis',
        label: t('Funnel Analysis'),
        labelKey: 'panels.mranalysis.funnel-analysis',
      },
      {
        key: 'conjoint-analysis',
        path: 'conjoint-analysis',
        label: t('Conjoint Analysis'),
        labelKey: 'panels.mranalysis.conjoint-analysis',
      },
      {
        key: 'segmentation-analysis',
        path: 'segmentation-analysis',
        label: t('Segmentation Analysis'),
        labelKey: 'panels.mranalysis.segmentation-analysis',
      },
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
