import React from 'react'

import classNames from 'classnames'
import { NavLink, Outlet } from 'react-router-dom'

import styles from './moduleLayout.module.scss'

interface ModuleNavItem {
  label: string
  description: string
  to: string
}

interface ModuleLayoutProps {
  title: string
  items: ModuleNavItem[]
  helpText?: string
}

const ModuleLayout: React.FC<ModuleLayoutProps> = ({ title, items, helpText }) => (
  <div className={styles.moduleLayout}>
    <aside className={styles.sidebar}>
      <h1 className={styles.heading}>{title}</h1>

      <ul className={styles.navList}>
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                classNames(styles.navLink, {
                  [styles.active]: isActive,
                })
              }
            >
              <span className={styles.navLabel}>{item.label}</span>
              <span className={styles.navDescription}>{item.description}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      {helpText && <p className={styles.helpText}>{helpText}</p>}
    </aside>

    <section className={styles.content}>
      <Outlet />
    </section>
  </div>
)

export default ModuleLayout
