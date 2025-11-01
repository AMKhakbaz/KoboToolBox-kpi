import React from 'react'

import { getPanelConfigById } from '#/navigation/modules.config'

export const createModulePlaceholder = (panelId: string) => {
  const panel = getPanelConfigById(panelId)

  const ModulePlaceholder = () => (
    <section data-test-id={panel.testId}>
      <h1>{t(panel.label)}</h1>
      <p>{t('This page is under construction.')}</p>
    </section>
  )

  ModulePlaceholder.displayName = `ModulePlaceholder(${panelId})`

  return ModulePlaceholder
}

export default createModulePlaceholder
