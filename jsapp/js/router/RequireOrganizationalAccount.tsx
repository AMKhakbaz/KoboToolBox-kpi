import type React from 'react'
import { useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import LoadingSpinner from '#/components/common/loadingSpinner'
import { ORGANIZATION_ONLY_TOOLTIP } from '#/navigation/modules.config'
import { notify } from '#/utils'
import { PROJECTS_ROUTES } from './routerConstants'
import { useSession } from '#/stores/useSession'

interface Props {
  readonly children: React.ReactNode
  readonly moduleLabel?: string
}

const RequireOrganizationalAccount = ({ children, moduleLabel }: Props) => {
  const session = useSession()
  const location = useLocation()
  const hasWarnedRef = useRef(false)

  useEffect(() => {
    if (session.isPending || session.isOrganizationAccount || hasWarnedRef.current) {
      return
    }

    hasWarnedRef.current = true

    const tooltip = t(ORGANIZATION_ONLY_TOOLTIP)
    const message = moduleLabel ? `${t(moduleLabel)}: ${tooltip}` : tooltip

    notify.warning(message)
  }, [moduleLabel, session.isOrganizationAccount, session.isPending])

  if (session.isPending || !session.currentLoggedAccount) {
    return <LoadingSpinner />
  }

  if (session.isOrganizationAccount) {
    return <>{children}</>
  }

  return (
    <Navigate
      replace
      to={PROJECTS_ROUTES.MY_PROJECTS}
      state={{ from: `${location.pathname}${location.search}${location.hash}` }}
    />
  )
}

export default RequireOrganizationalAccount
