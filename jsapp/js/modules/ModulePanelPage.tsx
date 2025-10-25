import React from 'react'

import cx from 'classnames'
import { observer } from 'mobx-react-lite'
import { Navigate, NavLink } from 'react-router-dom'

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
  const panelLabel = panelDefinition.label

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

  if (
    moduleDefinition.key === 'management' &&
    (panelDefinition.key === 'user-management' || panelDefinition.key === 'project-management')
  ) {
    return (
      <InsightZenI18nProvider>
        <InsightZenLayout activeModuleKey={moduleDefinition.key} activePanelKey={panelDefinition.key}>
          {panelDefinition.key === 'user-management' ? <ListUsersPage /> : <ListProjectsPage />}
        </InsightZenLayout>
      </InsightZenI18nProvider>
    )
  }

  if (moduleDefinition.key === 'collection' && panelDefinition.key === 'telephone-interviewer') {
    return (
      <InsightZenI18nProvider>
        <InsightZenLayout activeModuleKey={moduleDefinition.key} activePanelKey={panelDefinition.key}>
          <TelephoneInterviewerPage />
        </InsightZenLayout>
      </InsightZenI18nProvider>
    )
  }

  if (moduleDefinition.key === 'collection' && panelDefinition.key === 'collection-performance') {
    return (
      <InsightZenI18nProvider>
        <InsightZenLayout activeModuleKey={moduleDefinition.key} activePanelKey={panelDefinition.key}>
          <CollectionPerformancePage />
        </InsightZenLayout>
      </InsightZenI18nProvider>
    )
  }

  if (moduleDefinition.key === 'collection' && panelDefinition.key === 'quota-management') {
    return (
      <InsightZenI18nProvider>
        <InsightZenLayout activeModuleKey={moduleDefinition.key} activePanelKey={panelDefinition.key}>
          <QuotaManagementPage />
        </InsightZenLayout>
      </InsightZenI18nProvider>
    )
  }

  return (
    <div className={styles.moduleRoot}>
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>{moduleLabel}</h2>
        <nav className={styles.sidebarNav}>
          {moduleDefinition.panels.map((panel) => {
            const panelNavLabel = panel.label
            return (
              <NavLink
                key={panel.key}
                to={`${moduleDefinition.route}/${panel.path}`}
                className={({ isActive }) =>
                  cx(styles.navLink, {
                    [styles.navLinkActive]: isActive,
                  })
                }
              >
                {panelNavLabel}
              </NavLink>
            )
          })}
        </nav>
      </aside>
      <main className={styles.content}>
        <h1 className={styles.panelTitle}>{panelLabel}</h1>
        <div className={styles.placeholder}>
          <p>
            {t('Content for this panel will appear here for organizational accounts.')}
          </p>
        </div>
      </main>
    </div>
  )
})

export default ModulePanelPage
