import React, { useEffect, useMemo, useState } from 'react'

import cx from 'classnames'
import Icon from '#/components/common/icon'
import { MODULE_DEFINITIONS, type ModuleKey } from '#/modules/moduleConfig'
import { NavLink } from 'react-router-dom'

import { useInsightZenI18n } from '../../i18n/I18nProvider'
import styles from './InsightZenLayout.module.scss'

interface InsightZenLayoutProps {
  activeModuleKey: ModuleKey
  activePanelKey: string
  children: React.ReactNode
}

const moduleIconFallback: Record<ModuleKey, string> = {
  management: 'settings',
  collection: 'group',
  'quality-control': 'check',
  mranalysis: 'reports',
}

export function InsightZenLayout({ activeModuleKey, activePanelKey, children }: InsightZenLayoutProps) {
  const { t, locale, setLocale, direction } = useInsightZenI18n()
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false)
  const [openModuleKey, setOpenModuleKey] = useState<ModuleKey>(activeModuleKey)

  useEffect(() => {
    setOpenModuleKey(activeModuleKey)
  }, [activeModuleKey])

  const moduleDefinitions = useMemo(() => MODULE_DEFINITIONS, [])
  const activeModuleDefinition = useMemo(
    () => moduleDefinitions.find((definition) => definition.key === activeModuleKey),
    [moduleDefinitions, activeModuleKey],
  )
  const activePanelDefinition = useMemo(
    () => activeModuleDefinition?.panels.find((panel) => panel.key === activePanelKey),
    [activeModuleDefinition, activePanelKey],
  )
  const activePanelLabel = activePanelDefinition
    ? t(activePanelDefinition.labelKey)
    : t(`panels.${activeModuleKey}.${activePanelKey}`)

  return (
    <div className={styles.layoutRoot} dir={direction} lang={locale}>
      <aside className={cx(styles.menuColumn, { [styles.menuColumnCollapsed]: isMenuCollapsed })}>
        <div className={styles.menuContainer} aria-label={t('layout.toggleMenu')}>
          <div className={styles.menuHeader}>
            {!isMenuCollapsed && <div className={styles.menuTitle}>{t('app.title')}</div>}
            <button
              type='button'
              className={styles.collapseButton}
              onClick={() => setIsMenuCollapsed((value) => !value)}
            >
              {isMenuCollapsed ? t('layout.expand') : t('layout.collapse')}
            </button>
          </div>
          <div className={styles.menuSections}>
            {moduleDefinitions.map((moduleDefinition) => {
              const isActiveModule = moduleDefinition.key === activeModuleKey
              const isOpen = openModuleKey === moduleDefinition.key
              const moduleLabel = t(moduleDefinition.labelKey)
              return (
                <div
                  key={moduleDefinition.key}
                  className={cx(styles.menuSection, {
                    [styles.menuSectionActive]: isActiveModule,
                  })}
                >
                  <button
                    type='button'
                    className={cx(styles.sectionHeader, {
                      [styles.sectionHeaderActive]: isActiveModule,
                    })}
                    onClick={() => setOpenModuleKey(moduleDefinition.key)}
                  >
                    <span className={styles.sectionIcon}>
                      <Icon
                        name={moduleDefinition.icon || moduleIconFallback[moduleDefinition.key]}
                        size='m'
                      />
                    </span>
                    {!isMenuCollapsed && <span className={styles.sectionLabel}>{moduleLabel}</span>}
                    {!isMenuCollapsed && (
                      <span
                        className={cx(styles.sectionCaret, {
                          [styles.sectionCaretOpen]: isOpen,
                        })}
                      >
                        ›
                      </span>
                    )}
                  </button>
                  <div
                    className={cx(styles.menuLinks, {
                      [styles.menuLinksCollapsed]: isMenuCollapsed || !isOpen,
                    })}
                  >
                    {moduleDefinition.panels.map((panel) => {
                      const panelLabel = t(panel.labelKey)
                      return (
                        <NavLink
                          key={panel.key}
                          to={`${moduleDefinition.route}/${panel.path}`}
                          className={({ isActive }) =>
                            cx(styles.menuLink, {
                              [styles.menuLinkActive]: isActive,
                            })
                          }
                        >
                          <span className={styles.linkBullet} aria-hidden />
                          {!isMenuCollapsed && <span>{panelLabel}</span>}
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </aside>
      <main className={styles.mainColumn}>
        <header className={styles.header}>
          <div className={styles.headerTexts}>
            <h1 className={styles.headerTitle}>{activePanelLabel}</h1>
            <p className={styles.headerSubtitle}>{t('app.subtitle')}</p>
          </div>
          <div className={styles.languageToggle} role='group' aria-label={t('layout.language')}>
            <button
              type='button'
              className={cx({ [styles.languageActive]: locale === 'fa' })}
              onClick={() => setLocale('fa')}
            >
              {t('layout.language.fa')}
            </button>
            <span>•</span>
            <button
              type='button'
              className={cx({ [styles.languageActive]: locale === 'en' })}
              onClick={() => setLocale('en')}
            >
              {t('layout.language.en')}
            </button>
          </div>
        </header>
        <section className={styles.contentCard}>{children}</section>
      </main>
    </div>
  )
}
