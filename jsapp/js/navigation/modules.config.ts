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
        testId: 'management-project-management-placeholder',
        component: () => import('#/modules/management/ProjectManagementPage'),
      },
      {
        id: 'management.team-oversight',
        label: 'Team Oversight',
        route: MANAGEMENT_ROUTES.TEAM_OVERSIGHT,
        testId: 'management-team-oversight-placeholder',
        component: () => import('#/modules/management/TeamOversightPage'),
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
        id: 'collection.data-planning',
        label: 'Data Planning',
        route: COLLECTION_ROUTES.DATA_PLANNING,
        testId: 'collection-data-planning-placeholder',
        component: () => import('#/modules/collection/DataPlanningPage'),
      },
      {
        id: 'collection.field-operations',
        label: 'Field Operations',
        route: COLLECTION_ROUTES.FIELD_OPERATIONS,
        testId: 'collection-field-operations-placeholder',
        component: () => import('#/modules/collection/FieldOperationsPage'),
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
        id: 'quality-control.data-review',
        label: 'Data Review',
        route: QUALITY_CONTROL_ROUTES.DATA_REVIEW,
        testId: 'quality-control-data-review-placeholder',
        component: () => import('#/modules/quality-control/DataReviewPage'),
      },
      {
        id: 'quality-control.issue-tracking',
        label: 'Issue Tracking',
        route: QUALITY_CONTROL_ROUTES.ISSUE_TRACKING,
        testId: 'quality-control-issue-tracking-placeholder',
        component: () => import('#/modules/quality-control/IssueTrackingPage'),
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
        id: 'mranalysis.workbench',
        label: 'Workbench',
        route: MR_ANALYSIS_ROUTES.WORKBENCH,
        testId: 'mranalysis-workbench-placeholder',
        component: () => import('#/modules/mranalysis/WorkbenchPage'),
      },
      {
        id: 'mranalysis.insights',
        label: 'Insights',
        route: MR_ANALYSIS_ROUTES.INSIGHTS,
        testId: 'mranalysis-insights-placeholder',
        component: () => import('#/modules/mranalysis/InsightsPage'),
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
