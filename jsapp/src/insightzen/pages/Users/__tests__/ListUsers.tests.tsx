import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect as jestExpect } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ListUsersPage } from '../ListUsers'
import { InsightZenI18nProvider } from '../../../i18n/I18nProvider'

jest.mock('alertifyjs', () => ({ success: jest.fn(), error: jest.fn() }))

const mockUsersQuery = jest.fn()
const mockDeactivate = jest.fn()
const mockReactivate = jest.fn()

jest.mock('../../../api/usersApi', () => ({
  useInsightZenUsersQuery: (params: unknown) => mockUsersQuery(params),
  useCreateInsightZenUserMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeactivateInsightZenUserMutation: () => ({ mutateAsync: mockDeactivate }),
  useReactivateInsightZenUserMutation: () => ({ mutateAsync: mockReactivate }),
  useInsightZenUserQuery: () => ({ data: undefined }),
  useUpdateInsightZenUserMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
  exportInsightZenUsers: jest.fn(),
}))

jest.mock('../../../components/inputs/LookupSelect', () => ({
  ProjectLookupSelect: ({ label, value, onChange, placeholder }: any) => (
    <label>
      <span>{label}</span>
      <select
        data-testid={`lookup-${label}`}
        value={value === '' ? '' : String(value)}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : '')}
      >
        <option value=''>{placeholder}</option>
        <option value='1'>Demo Project</option>
      </select>
    </label>
  ),
}))

function renderUsersPage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <InsightZenI18nProvider initialLocale='en'>
        <ListUsersPage />
      </InsightZenI18nProvider>
    </QueryClientProvider>,
  )
}

describe('ListUsersPage', () => {
  beforeEach(() => {
    const user = {
      id: 1,
      username: 'jdoe',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      phone: '+1-555',
      preferred_locale: 'en',
      timezone: 'UTC',
      is_active: true,
      is_staff: false,
      memberships_detail: [],
      memberships_brief: [],
    }
    mockUsersQuery.mockReturnValue({ data: { count: 1, results: [user] }, refetch: jest.fn() })
    mockDeactivate.mockResolvedValue(undefined)
    mockReactivate.mockResolvedValue(user)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders user table and allows toggling columns', async () => {
    renderUsersPage()

    const userRow = await screen.findByText('Jane Doe')
    jestExpect(userRow).toBeTruthy()
    const phoneHeader = screen.getByRole('columnheader', { name: 'Phone' })
    jestExpect(phoneHeader).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }))
    fireEvent.click(screen.getByLabelText('Phone'))

    jestExpect(screen.queryByRole('columnheader', { name: 'Phone' })).toBeNull()
  })

  it('deactivates a user through the mutation and refetches data', async () => {
    const { success, error } = require('alertifyjs') as { success: jest.Mock; error: jest.Mock }

    renderUsersPage()

    const { refetch } = mockUsersQuery.mock.results.at(-1)!.value

    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate User' }))

    await waitFor(() => jestExpect(mockDeactivate).toHaveBeenCalledWith(1))
    jestExpect(refetch).toHaveBeenCalled()
    jestExpect(success).toHaveBeenCalledWith('User deactivated.')
    jestExpect(error).not.toHaveBeenCalled()
  })
})
