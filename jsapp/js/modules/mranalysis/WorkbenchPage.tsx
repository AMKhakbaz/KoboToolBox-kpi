import React from 'react'

import ModuleBlankState from '#/modules/common/ModuleBlankState'

const WorkbenchPage = () => (
  <ModuleBlankState
    heading={t('Analysis Workbench')}
    description={t('Combine datasets, annotate findings, and collaborate on advanced analyses in one place.')}
    supportText={t('We are prototyping workflows for organizational analysts—stay tuned for beta access.')}
  />
)

export default WorkbenchPage
