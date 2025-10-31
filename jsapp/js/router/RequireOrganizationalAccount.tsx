import type React from 'react'

import LoadingSpinner from '#/components/common/loadingSpinner'
import AccessDenied from '#/router/accessDenied'
import { useSession } from '#/stores/useSession'

interface Props {
  children: React.ReactNode
}

const RequireOrganizationalAccount = ({ children }: Props) => {
  const session = useSession()

  if (session.isPending) {
    return <LoadingSpinner />
  }

  if (session.currentLoggedAccount?.account_type === 'organizational') {
    return <>{children}</>
  }

  return <AccessDenied errorMessage='403: organizational account required' />
}

export default RequireOrganizationalAccount
