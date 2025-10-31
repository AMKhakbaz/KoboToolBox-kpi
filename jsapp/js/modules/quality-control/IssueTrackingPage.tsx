import React from 'react'

import ModuleBlankState from '#/modules/common/ModuleBlankState'

const IssueTrackingPage = () => (
  <ModuleBlankState
    heading={t('Issue Tracking')}
    description={t('Log quality issues, coordinate fixes, and keep audit-ready records across teams.')}
    supportText={t('Stay tuned for collaborative queues and automated notifications for organizational accounts.')}
  />
)

export default IssueTrackingPage
