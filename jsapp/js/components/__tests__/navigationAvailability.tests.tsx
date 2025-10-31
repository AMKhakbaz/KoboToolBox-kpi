import React from 'react'

import { render, screen } from '@testing-library/react'

import { PRIMARY_NAV_LINKS } from '#/components/drawer'
import RequireOrganizationalAccount from '#/router/RequireOrganizationalAccount'
import { useSession } from '#/stores/useSession'

jest.mock('#/stores/useSession')

const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>

describe('primary navigation configuration', () => {
  it('marks advanced modules as organizational only', () => {
    const orgOnlyLabels = PRIMARY_NAV_LINKS.filter((link) => link.requiresOrganizational).map(
      (link) => link.label,
    )

    expect(orgOnlyLabels).to.include.members([
      'Management',
      'Collection',
      'Quality Control',
      'MRAnalysis',
    ])
  })

  it('keeps core modules available to all accounts', () => {
    const alwaysAvailable = PRIMARY_NAV_LINKS.filter((link) => !link.requiresOrganizational).map(
      (link) => link.label,
    )

    expect(alwaysAvailable).to.include.members(['Form Manager', 'Library'])
  })
})

describe('RequireOrganizationalAccount', () => {
  afterEach(() => {
    mockedUseSession.mockReset()
  })

  it('renders a denial message for personal accounts', () => {
    mockedUseSession.mockReturnValue({
      currentLoggedAccount: { account_type: 'personal' } as any,
      isPending: false,
    })

    render(
      <RequireOrganizationalAccount>
        <div>Restricted content</div>
      </RequireOrganizationalAccount>,
    )

    expect(screen.getByText(/Access Denied/i)).to.exist
  })

  it('allows children for organizational accounts', () => {
    mockedUseSession.mockReturnValue({
      currentLoggedAccount: { account_type: 'organizational' } as any,
      isPending: false,
    })

    render(
      <RequireOrganizationalAccount>
        <div>Restricted content</div>
      </RequireOrganizationalAccount>,
    )

    expect(screen.getByText('Restricted content')).to.exist
  })
})
