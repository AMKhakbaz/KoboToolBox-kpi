import React from 'react'

import { getPanelConfigById } from '#/navigation/modules.config'

const panel = getPanelConfigById('collection.data-planning')

const DataPlanningPage = () => (
  <section data-test-id={panel.testId}>
    <h1>{t(panel.label)}</h1>
    <p>{t('This page is under construction.')}</p>
  </section>
)

export default DataPlanningPage
