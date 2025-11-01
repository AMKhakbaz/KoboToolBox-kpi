import React from 'react'

import { expect as jestExpect } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { PrimaryNavigation } from '#/components/drawer'
import { NAVIGATION_MODULES, ORGANIZATION_ONLY_TOOLTIP } from '#/navigation/modules.config'
import RequireOrganizationalAccount from '#/router/RequireOrganizationalAccount'
import { MANAGEMENT_ROUTES, PROJECTS_ROUTES } from '#/router/routerConstants'
import ProjectManagementPage from '#/modules/management/ProjectManagementPage'
import { useSession } from '#/stores/useSession'
import * as utils from '#/utils'
import '#/bemComponents'

jest.mock('#/stores/useSession')

const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>
let warningSpy: jest.SpyInstance

describe('primary navigation configuration', () => {
  it('marks advanced modules as organizational only', () => {
    const orgOnlyLabels = NAVIGATION_MODULES.filter((link) => link.requiresOrganizational).map(
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
    const alwaysAvailable = NAVIGATION_MODULES.filter((link) => !link.requiresOrganizational).map(
      (link) => link.label,
    )

    expect(alwaysAvailable).to.include.members(['Form Manager', 'Library'])
  })
})

describe('PrimaryNavigation rendering', () => {
  const translate = (value: string) => (global as any).t(value)

  it('disables organizational modules for personal accounts', () => {
    render(
      <MemoryRouter>
        <PrimaryNavigation accountType='personal' />
      </MemoryRouter>,
    )

    const orgTooltip = translate(ORGANIZATION_ONLY_TOOLTIP)

    NAVIGATION_MODULES.filter((module) => module.requiresOrganizational).forEach((module) => {
      const link = screen.getByLabelText(translate(module.label))

      expect(link.getAttribute('aria-disabled')).to.equal('true')
      expect(link.getAttribute('title')).to.equal(orgTooltip)
      expect(link.tagName).to.equal('SPAN')
    })
  })

  it('keeps modules navigable for organizational accounts', () => {
    render(
      <MemoryRouter>
        <PrimaryNavigation accountType='organizational' />
      </MemoryRouter>,
    )

    NAVIGATION_MODULES.forEach((module) => {
      const link = screen.getByLabelText(translate(module.label))

      expect(link.hasAttribute('aria-disabled')).to.equal(false)
      expect(link.getAttribute('title')).to.equal(translate(module.label))
      expect(link.tagName).to.equal('A')
    })
  })
})

describe('RequireOrganizationalAccount', () => {
  beforeEach(() => {
    warningSpy = jest.spyOn(utils.notify, 'warning' as any).mockImplementation(jest.fn())
  })

  afterEach(() => {
    mockedUseSession.mockReset()
    warningSpy.mockRestore()
  })

  it('redirects personal accounts and raises a notice', () => {
    mockedUseSession.mockReturnValue({
      currentLoggedAccount: { account_type: 'personal' } as any,
      isPending: false,
    })

    render(
      <MemoryRouter initialEntries={[MANAGEMENT_ROUTES.PROJECT_MANAGEMENT]}>
        <Routes>
          <Route path={PROJECTS_ROUTES.MY_PROJECTS} element={<div>Projects Home</div>} />
          <Route
            path={MANAGEMENT_ROUTES.PROJECT_MANAGEMENT}
            element={
              <RequireOrganizationalAccount moduleLabel='Management'>
                <ProjectManagementPage />
              </RequireOrganizationalAccount>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Projects Home')).to.exist
    expect(screen.queryByRole('heading', { name: 'Project Management' })).to.not.exist
    jestExpect(warningSpy).toHaveBeenCalledWith(
      jestExpect.stringContaining('Organization accounts'),
    )
  })

  it('allows children for organizational accounts', () => {
    mockedUseSession.mockReturnValue({
      currentLoggedAccount: { account_type: 'organizational' } as any,
      isPending: false,
    })

    render(
      <MemoryRouter initialEntries={[MANAGEMENT_ROUTES.PROJECT_MANAGEMENT]}>
        <Routes>
          <Route path={PROJECTS_ROUTES.MY_PROJECTS} element={<div>Projects Home</div>} />
          <Route
            path={MANAGEMENT_ROUTES.PROJECT_MANAGEMENT}
            element={
              <RequireOrganizationalAccount moduleLabel='Management'>
                <ProjectManagementPage />
              </RequireOrganizationalAccount>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Project Management' })).to.exist
    expect(screen.getByText('This page is under construction.')).to.exist
    jestExpect(warningSpy).not.toHaveBeenCalled()
  })
})
