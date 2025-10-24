import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect as jestExpect } from '@jest/globals'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { ListProjectsPage } from '../ListProjects'
import { InsightZenI18nProvider } from '../../../i18n/I18nProvider'

jest.mock('alertifyjs', () => ({ success: jest.fn(), error: jest.fn() }))

const mockProjectsQuery = jest.fn()
const mockProjectDetailQuery = jest.fn()
const mockCreateProject = jest.fn()
const mockUpdateProject = jest.fn()
const mockArchiveProject = jest.fn()
const mockSyncMemberships = jest.fn()
const mockUsersQuery = jest.fn()

jest.mock('../../../api/projectsApi', () => ({
  useInsightZenProjectsQuery: (params: unknown) => mockProjectsQuery(params),
  useInsightZenProjectQuery: (id: number) => mockProjectDetailQuery(id),
  useCreateInsightZenProjectMutation: () => ({ mutateAsync: mockCreateProject, isPending: false }),
  useUpdateInsightZenProjectMutation: () => ({ mutateAsync: mockUpdateProject, isPending: false }),
  useArchiveInsightZenProjectMutation: () => ({ mutateAsync: mockArchiveProject }),
  exportInsightZenProjects: jest.fn(),
  syncProjectMemberships: (...args: unknown[]) => mockSyncMemberships(...args),
}))

jest.mock('../../../api/usersApi', () => ({
  useInsightZenUsersQuery: (params: unknown) => mockUsersQuery(params),
}))

jest.mock('../../../components/inputs/LookupSelect', () => ({
  UserLookupSelect: ({ label, value, onChange, placeholder }: any) => (
    <label>
      <span>{label}</span>
      <select
        data-testid={`user-lookup-${label}`}
        value={value === '' ? '' : String(value)}
        onChange={(event) => {
          const raw = event.target.value
          const parsed = raw ? Number(raw) : ''
          const option = raw ? { id: Number(raw), label: `User ${raw}` } : undefined
          onChange(parsed, option)
        }}
      >
        <option value=''>{placeholder}</option>
        <option value='5'>User Five</option>
        <option value='6'>User Six</option>
      </select>
    </label>
  ),
  ProjectLookupSelect: ({ label, value, onChange, placeholder }: any) => (
    <label>
      <span>{label}</span>
      <select
        data-testid={`project-lookup-${label}`}
        value={value === '' ? '' : String(value)}
        onChange={(event) => {
          const raw = event.target.value
          const parsed = raw ? Number(raw) : ''
          const option = raw ? { id: Number(raw), label: `Project ${raw}` } : undefined
          onChange(parsed, option)
        }}
      >
        <option value=''>{placeholder}</option>
        <option value='1'>Project One</option>
      </select>
    </label>
  ),
}))

function renderProjectsPage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <InsightZenI18nProvider initialLocale='en'>
        <ListProjectsPage />
      </InsightZenI18nProvider>
    </QueryClientProvider>,
  )
}

describe('ListProjectsPage', () => {
  const project = {
    id: 1,
    code: 'PRJ1',
    name: 'Project One',
    description: '',
    owner: 2,
    owner_username: 'owner',
    types: ['Tracking'],
    status: 'active' as const,
    start_date: null,
    end_date: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    membership_count: 1,
    memberships: [
      {
        id: 10,
        project: 1,
        project_code: 'PRJ1',
        project_name: 'Project One',
        user: 5,
        user_username: 'member',
        user_full_name: 'Member User',
        role: 'admin' as const,
        title: 'Lead',
        panel_permissions: {},
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
    ],
  }

  beforeEach(() => {
    mockProjectsQuery.mockReturnValue({
      data: { count: 1, results: [project] },
      refetch: jest.fn(),
    })
    mockProjectDetailQuery.mockReturnValue({ data: project })
    mockUsersQuery.mockReturnValue({
      data: { count: 1, results: [{ id: 5, username: 'owner', first_name: 'Owner', last_name: 'User' }] },
    })
    mockUpdateProject.mockResolvedValue(project)
    mockCreateProject.mockResolvedValue({ ...project, id: 2 })
    mockSyncMemberships.mockResolvedValue([])
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders project table and allows column toggling', async () => {
    renderProjectsPage()

    const projectRow = await screen.findByText('Project One')
    jestExpect(projectRow).toBeTruthy()
    const table = screen.getByRole('table')
    const statusHeader = within(table).getByRole('columnheader', { name: 'Status' })
    jestExpect(statusHeader).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    const statusColumnToggle = screen.getByLabelText('Status', { selector: 'input[type="checkbox"]' })
    fireEvent.click(statusColumnToggle)

    jestExpect(within(table).queryByRole('columnheader', { name: 'Status' })).toBeNull()
  })

  it('updates an existing project and syncs memberships', async () => {
    const { success } = require('alertifyjs') as { success: jest.Mock }
    renderProjectsPage()

    const { refetch } = mockProjectsQuery.mock.results.at(-1)!.value

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Project' }))

    const [nameInput] = (await screen.findAllByLabelText('Name')) as HTMLInputElement[]
    fireEvent.change(nameInput, { target: { value: 'Project Updated' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => jestExpect(mockUpdateProject).toHaveBeenCalled())
    await waitFor(() => jestExpect(mockSyncMemberships).toHaveBeenCalledWith(1, jestExpect.any(Array)))
    jestExpect(refetch).toHaveBeenCalled()
    jestExpect(success).toHaveBeenCalledWith('Project saved successfully.')
  })
})
