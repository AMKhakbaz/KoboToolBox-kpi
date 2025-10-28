import React from 'react'

import { observer } from 'mobx-react-lite'
import { Navigate } from 'react-router-dom'

import sessionStore from '#/stores/session'
import { resolveAccountAccess } from './accountAccess'
import {
  getModuleDefinition,
  getPanelDefinition,
  type ModuleKey,
} from './moduleConfig'
import styles from './moduleLayout.module.scss'
import { InsightZenI18nProvider } from '../../src/insightzen/i18n/I18nProvider'
import { InsightZenLayout } from '../../src/insightzen/components/layout/InsightZenLayout'
import { ListUsersPage } from '../../src/insightzen/pages/Users/ListUsers'
import { ListProjectsPage } from '../../src/insightzen/pages/Projects/ListProjects'
import { TelephoneInterviewerPage } from '../../src/insightzen/pages/Collection/TelephoneInterviewer/TelephoneInterviewerPage'
import { QuotaManagementPage } from '../../src/insightzen/pages/Collection/QuotaManagement/QuotaManagementPage'
import { CollectionPerformancePage } from '../../src/insightzen/pages/Collection/CollectionPerformance/CollectionPerformancePage'

interface ModulePanelPageProps {
  moduleKey: ModuleKey
  panelKey: string
}

const ModulePanelPage = observer((props: ModulePanelPageProps) => {
  const moduleDefinition = getModuleDefinition(props.moduleKey)
  if (!moduleDefinition) {
    return <Navigate to='/' replace />
  }

  const panelDefinition = getPanelDefinition(props.moduleKey, props.panelKey)
  if (!panelDefinition) {
    const fallbackPanel = moduleDefinition.panels[0]
    if (!fallbackPanel) {
      return <Navigate to='/' replace />
    }
    return <Navigate to={`${moduleDefinition.route}/${fallbackPanel.path}`} replace />
  }

  const accountSnapshot = sessionStore.currentAccount
  const extraDetails =
    accountSnapshot && typeof accountSnapshot === 'object' && 'extra_details' in accountSnapshot
      ? accountSnapshot.extra_details
      : undefined
  const accessInfo = resolveAccountAccess(extraDetails)
  const hasModuleAccess = accessInfo.allowedModules.has(moduleDefinition.key)
  const moduleLabel = moduleDefinition.label

  if (!hasModuleAccess) {
    return (
      <div className={styles.moduleUnavailable}>
        <h1 className={styles.moduleUnavailableTitle}>{moduleLabel}</h1>
        <p className={styles.moduleUnavailableDescription}>
          {t('This module is available only to organizational accounts with full access.')}
        </p>
      </div>
    )
  }

  let panelContent: React.ReactNode = null

  if (
    moduleDefinition.key === 'management' &&
    (panelDefinition.key === 'user-management' || panelDefinition.key === 'project-management')
  ) {
    panelContent = panelDefinition.key === 'user-management' ? <ListUsersPage /> : <ListProjectsPage />
  } else if (moduleDefinition.key === 'collection' && panelDefinition.key === 'telephone-interviewer') {
    panelContent = <TelephoneInterviewerPage />
  } else if (moduleDefinition.key === 'collection' && panelDefinition.key === 'collection-performance') {
    panelContent = <CollectionPerformancePage />
  } else if (moduleDefinition.key === 'collection' && panelDefinition.key === 'quota-management') {
    panelContent = <QuotaManagementPage />
  } else {
    panelContent = (
      <div className={styles.placeholder}>
        <p>{t('Content for this panel will appear here for organizational accounts.')}</p>
      </div>
    )
  }

  return (
    <InsightZenI18nProvider>
      <InsightZenLayout activeModuleKey={moduleDefinition.key} activePanelKey={panelDefinition.key}>
        {panelContent}
      </InsightZenLayout>
    </InsightZenI18nProvider>
  )
})

export default ModulePanelPage
