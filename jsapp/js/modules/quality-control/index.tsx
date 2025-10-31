import React from 'react'

import ModuleLayout from '#/modules/common/ModuleLayout'
import { QUALITY_CONTROL_ROUTES } from '#/router/routerConstants'

const QualityControlModule = () => (
  <ModuleLayout
    title={t('Quality Control')}
    items={[
      {
        label: t('Data Review'),
        description: t('Configure validation workflows and review pipelines.'),
        to: QUALITY_CONTROL_ROUTES.DATA_REVIEW,
      },
      {
        label: t('Issue Tracking'),
        description: t('Log, prioritize, and resolve data quality issues across teams.'),
        to: QUALITY_CONTROL_ROUTES.ISSUE_TRACKING,
      },
    ]}
    helpText={t('Quality governance features will roll out to organizational accounts in upcoming releases.')}
  />
)

export default QualityControlModule
