import React from 'react'

import ModuleLayout from '#/modules/common/ModuleLayout'
import { MANAGEMENT_ROUTES } from '#/router/routerConstants'

const ManagementModule = () => (
  <ModuleLayout
    title={t('Management')}
    items={[
      {
        label: t('Project Management'),
        description: t('Coordinate timelines and ownership across projects.'),
        to: MANAGEMENT_ROUTES.PROJECT_MANAGEMENT,
      },
      {
        label: t('Team Oversight'),
        description: t('Manage organizational teams, roles, and workflows.'),
        to: MANAGEMENT_ROUTES.TEAM_OVERSIGHT,
      },
    ]}
    helpText={t('These spaces will unlock as organizational features are rolled out.')}
  />
)

export default ManagementModule
