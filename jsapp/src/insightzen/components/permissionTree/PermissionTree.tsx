import React, { useEffect, useMemo, useRef } from 'react'

import { MODULE_DEFINITIONS } from '#/modules/moduleConfig'

import { useInsightZenI18n } from '../../i18n/I18nProvider'
import styles from '../layout/InsightZenLayout.module.scss'

export type PermissionTreeValue = Record<string, Record<string, boolean>>

interface PermissionTreeProps {
  value: PermissionTreeValue
  onChange: (value: PermissionTreeValue) => void
}

export function PermissionTree({ value, onChange }: PermissionTreeProps) {
  const { t } = useInsightZenI18n()
  const moduleDefinitions = useMemo(() => MODULE_DEFINITIONS, [])

  const toggleModule = (moduleKey: string, checked: boolean) => {
    const definition = moduleDefinitions.find((module) => module.key === moduleKey)
    if (!definition) {
      return
    }
    const moduleValue: Record<string, boolean> = {}
    definition.panels.forEach((panel) => {
      moduleValue[panel.key] = checked
    })
    onChange({
      ...value,
      [moduleKey]: moduleValue,
    })
  }

  const togglePanel = (moduleKey: string, panelKey: string, checked: boolean) => {
    const modulePermissions = value[moduleKey] ?? {}
    onChange({
      ...value,
      [moduleKey]: {
        ...modulePermissions,
        [panelKey]: checked,
      },
    })
  }

  return (
    <div className={styles.permissionTree}>
      {moduleDefinitions.map((module) => (
        <PermissionTreeGroup
          key={module.key}
          moduleKey={module.key}
          moduleLabel={t(module.labelKey)}
          panels={module.panels.map((panel) => ({
            key: panel.key,
            label: t(panel.labelKey),
          }))}
          moduleValue={value[module.key] ?? {}}
          onModuleToggle={toggleModule}
          onPanelToggle={togglePanel}
        />
      ))}
    </div>
  )
}

interface PermissionTreeGroupProps {
  moduleKey: string
  moduleLabel: string
  panels: Array<{ key: string; label: string }>
  moduleValue: Record<string, boolean>
  onModuleToggle: (moduleKey: string, checked: boolean) => void
  onPanelToggle: (moduleKey: string, panelKey: string, checked: boolean) => void
}

function PermissionTreeGroup({
  moduleKey,
  moduleLabel,
  panels,
  moduleValue,
  onModuleToggle,
  onPanelToggle,
}: PermissionTreeGroupProps) {
  const moduleCheckboxRef = useRef<HTMLInputElement>(null)
  const totalPanels = panels.length
  const enabledPanels = panels.filter((panel) => moduleValue[panel.key]).length
  const allSelected = totalPanels > 0 && enabledPanels === totalPanels
  const partiallySelected = enabledPanels > 0 && !allSelected

  useEffect(() => {
    if (moduleCheckboxRef.current) {
      moduleCheckboxRef.current.indeterminate = partiallySelected
    }
  }, [partiallySelected])

  return (
    <div className={styles.permissionGroup}>
      <div className={styles.permissionGroupHeader}>
        <input
          ref={moduleCheckboxRef}
          type='checkbox'
          checked={allSelected}
          onChange={(event) => onModuleToggle(moduleKey, event.target.checked)}
        />
        <span>{moduleLabel}</span>
      </div>
      <div className={styles.permissionOptions}>
        {panels.map((panel) => (
          <label key={panel.key} className={styles.permissionCheckbox}>
            <input
              type='checkbox'
              checked={moduleValue[panel.key] ?? false}
              onChange={(event) => onPanelToggle(moduleKey, panel.key, event.target.checked)}
            />
            <span>{panel.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
