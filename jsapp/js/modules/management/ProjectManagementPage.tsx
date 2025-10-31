import React from 'react'

import ModuleBlankState from '#/modules/common/ModuleBlankState'

const ProjectManagementPage = () => (
  <ModuleBlankState
    heading={t('Project Management')}
    description={t('Organizational accounts will soon be able to plan milestones, assign leads, and monitor delivery from this workspace.')}
    supportText={t("We're gathering feedback to shape the first release. Check back after the organizational rollout begins.")}
  />
)

export default ProjectManagementPage
