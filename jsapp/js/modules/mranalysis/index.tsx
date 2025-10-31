import React from 'react'

import ModuleLayout from '#/modules/common/ModuleLayout'
import { MR_ANALYSIS_ROUTES } from '#/router/routerConstants'

const MRAnalysisModule = () => (
  <ModuleLayout
    title={t('MRAnalysis')}
    items={[
      {
        label: t('Analysis Workbench'),
        description: t('Blend quantitative and qualitative insights in a unified workspace.'),
        to: MR_ANALYSIS_ROUTES.WORKBENCH,
      },
      {
        label: t('Insights'),
        description: t('Summarize findings and share reports with organizational stakeholders.'),
        to: MR_ANALYSIS_ROUTES.INSIGHTS,
      },
    ]}
    helpText={t('Mixed-method analysis tools will unlock for organizational accounts soon.')}
  />
)

export default MRAnalysisModule
