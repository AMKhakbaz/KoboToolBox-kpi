import type { ComponentType } from 'react'

import {
  COLLECTION_ROUTES,
  MANAGEMENT_ROUTES,
  MR_ANALYSIS_ROUTES,
  PROJECTS_ROUTES,
  QUALITY_CONTROL_ROUTES,
  ROUTES,
} from '#/router/routerConstants'

export interface NavigationPanelConfig {
  readonly id: string
  readonly label: string
  readonly route: string
  readonly testId?: string
  readonly component?: () => Promise<{ default: ComponentType }>
}

export interface NavigationModuleConfig {
  readonly id: string
  readonly label: string
  readonly icon: string
  readonly route: string
  readonly requiresOrganizational: boolean
  readonly panels?: readonly NavigationPanelConfig[]
}

export const ORGANIZATION_ONLY_TOOLTIP = 'Available for Organization accounts.'

export const NAVIGATION_MODULES: readonly NavigationModuleConfig[] = [
  {
    id: 'form-manager',
    label: 'Form Manager',
    icon: 'projects',
    route: PROJECTS_ROUTES.MY_PROJECTS,
    requiresOrganizational: false,
    panels: [
      {
        id: 'form-manager.home',
        label: 'Form Manager home',
        route: PROJECTS_ROUTES.MY_PROJECTS,
      },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    icon: 'project-overview',
    route: ROUTES.MANAGEMENT,
    requiresOrganizational: true,
    panels: [
      {
        id: 'management.project-management',
        label: 'Project Management',
        route: MANAGEMENT_ROUTES.PROJECT_MANAGEMENT,
        testId: 'page-management-project-management',
        component: () => import('#/modules/management/ProjectManagementPage'),
      },
      {
        id: 'management.user-management',
        label: 'User Management',
        route: MANAGEMENT_ROUTES.USER_MANAGEMENT,
        testId: 'page-management-user-management',
        component: () => import('#/modules/management/UserManagementPage'),
      },
      {
        id: 'management.database-management',
        label: 'Database Management',
        route: MANAGEMENT_ROUTES.DATABASE_MANAGEMENT,
        testId: 'page-management-database-management',
        component: () => import('#/modules/management/DatabaseManagementPage'),
      },
      {
        id: 'management.quota-management',
        label: 'Quota Management',
        route: MANAGEMENT_ROUTES.QUOTA_MANAGEMENT,
        testId: 'page-management-quota-management',
        component: () => import('#/modules/management/QuotaManagementPage'),
      },
    ],
  },
  {
    id: 'collection',
    label: 'Collection',
    icon: 'folder',
    route: ROUTES.COLLECTION,
    requiresOrganizational: true,
    panels: [
      {
        id: 'collection.collection-management',
        label: 'Collection Management',
        route: COLLECTION_ROUTES.COLLECTION_MANAGEMENT,
        testId: 'page-collection-collection-management',
        component: () => import('#/modules/collection/CollectionManagementPage'),
      },
      {
        id: 'collection.collection-performance',
        label: 'Collection Performance',
        route: COLLECTION_ROUTES.COLLECTION_PERFORMANCE,
        testId: 'page-collection-collection-performance',
        component: () => import('#/modules/collection/CollectionPerformancePage'),
      },
      {
        id: 'collection.telephone-interviewer',
        label: 'Telephone Interviewer',
        route: COLLECTION_ROUTES.TELEPHONE_INTERVIEWER,
        testId: 'page-collection-telephone-interviewer',
        component: () => import('#/modules/collection/TelephoneInterviewerPage'),
      },
      {
        id: 'collection.fieldwork-interviewer',
        label: 'Fieldwork Interviewer',
        route: COLLECTION_ROUTES.FIELDWORK_INTERVIEWER,
        testId: 'page-collection-fieldwork-interviewer',
        component: () => import('#/modules/collection/FieldworkInterviewerPage'),
      },
      {
        id: 'collection.focus-group-panel',
        label: 'Focus Group Panel',
        route: COLLECTION_ROUTES.FOCUS_GROUP_PANEL,
        testId: 'page-collection-focus-group-panel',
        component: () => import('#/modules/collection/FocusGroupPanelPage'),
      },
    ],
  },
  {
    id: 'quality-control',
    label: 'Quality Control',
    icon: 'reports',
    route: ROUTES.QUALITY_CONTROL,
    requiresOrganizational: true,
    panels: [
      {
        id: 'quality-control.qc-management',
        label: 'QC Management',
        route: QUALITY_CONTROL_ROUTES.QC_MANAGEMENT,
        testId: 'page-quality-control-qc-management',
        component: () => import('#/modules/quality-control/QcManagementPage'),
      },
      {
        id: 'quality-control.qc-performance',
        label: 'QC Performance',
        route: QUALITY_CONTROL_ROUTES.QC_PERFORMANCE,
        testId: 'page-quality-control-qc-performance',
        component: () => import('#/modules/quality-control/QcPerformancePage'),
      },
      {
        id: 'quality-control.voice-review',
        label: 'Voice Review',
        route: QUALITY_CONTROL_ROUTES.VOICE_REVIEW,
        testId: 'page-quality-control-voice-review',
        component: () => import('#/modules/quality-control/VoiceReviewPage'),
      },
      {
        id: 'quality-control.callback-qc',
        label: 'Callback QC',
        route: QUALITY_CONTROL_ROUTES.CALLBACK_QC,
        testId: 'page-quality-control-callback-qc',
        component: () => import('#/modules/quality-control/CallbackQcPage'),
      },
      {
        id: 'quality-control.coding',
        label: 'Coding',
        route: QUALITY_CONTROL_ROUTES.CODING,
        testId: 'page-quality-control-coding',
        component: () => import('#/modules/quality-control/CodingPage'),
      },
      {
        id: 'quality-control.statistical-health-check',
        label: 'Statistical Health Check',
        route: QUALITY_CONTROL_ROUTES.STATISTICAL_HEALTH_CHECK,
        testId: 'page-quality-control-statistical-health-check',
        component: () => import('#/modules/quality-control/StatisticalHealthCheckPage'),
      },
    ],
  },
  {
    id: 'mranalysis',
    label: 'MRAnalysis',
    icon: 'heatmap',
    route: ROUTES.MR_ANALYSIS,
    requiresOrganizational: true,
    panels: [
      {
        id: 'mranalysis.tabulation',
        label: 'Tabulation',
        route: MR_ANALYSIS_ROUTES.TABULATION,
        testId: 'page-mranalysis-tabulation',
        component: () => import('#/modules/mranalysis/TabulationPage'),
      },
      {
        id: 'mranalysis.statistics',
        label: 'Statistics',
        route: MR_ANALYSIS_ROUTES.STATISTICS,
        testId: 'page-mranalysis-statistics',
        component: () => import('#/modules/mranalysis/StatisticsPage'),
      },
      {
        id: 'mranalysis.funnel-analysis',
        label: 'Funnel Analysis',
        route: MR_ANALYSIS_ROUTES.FUNNEL_ANALYSIS,
        testId: 'page-mranalysis-funnel-analysis',
        component: () => import('#/modules/mranalysis/FunnelAnalysisPage'),
      },
      {
        id: 'mranalysis.conjoint-analysis',
        label: 'Conjoint Analysis',
        route: MR_ANALYSIS_ROUTES.CONJOINT_ANALYSIS,
        testId: 'page-mranalysis-conjoint-analysis',
        component: () => import('#/modules/mranalysis/ConjointAnalysisPage'),
      },
      {
        id: 'mranalysis.segmentation-analysis',
        label: 'Segmentation Analysis',
        route: MR_ANALYSIS_ROUTES.SEGMENTATION_ANALYSIS,
        testId: 'page-mranalysis-segmentation-analysis',
        component: () => import('#/modules/mranalysis/SegmentationAnalysisPage'),
      },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    icon: 'library',
    route: ROUTES.LIBRARY,
    requiresOrganizational: false,
    panels: [
      {
        id: 'library.home',
        label: 'Library home',
        route: ROUTES.LIBRARY,
      },
    ],
  },
] as const

export const getPanelConfigById = (panelId: string): NavigationPanelConfig => {
  for (const module of NAVIGATION_MODULES) {
    const panel = module.panels?.find((candidate) => candidate.id === panelId)
    if (panel) {
      return panel
    }
  }

  throw new Error(`Unknown navigation panel id: ${panelId}`)
}
