import React from 'react'

import ModuleLayout from '#/modules/common/ModuleLayout'
import { COLLECTION_ROUTES } from '#/router/routerConstants'

const CollectionModule = () => (
  <ModuleLayout
    title={t('Collection')}
    items={[
      {
        label: t('Data Planning'),
        description: t('Design collection campaigns and deployment schedules.'),
        to: COLLECTION_ROUTES.DATA_PLANNING,
      },
      {
        label: t('Field Operations'),
        description: t('Track enumerator activity and on-the-ground progress.'),
        to: COLLECTION_ROUTES.FIELD_OPERATIONS,
      },
    ]}
    helpText={t('Additional collection tooling will appear for organizational accounts once released.')}
  />
)

export default CollectionModule
