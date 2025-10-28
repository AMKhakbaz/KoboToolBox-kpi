import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect as jestExpect } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { InsightZenI18nProvider } from '../../../../i18n/I18nProvider'
import { QuotaManagementPage } from '../QuotaManagementPage'

jest.mock('alertifyjs', () => ({ success: jest.fn(), error: jest.fn() }))

const mockSchemesQuery = jest.fn()
const mockCellsQuery = jest.fn()
const mockStatsQuery = jest.fn()
const mockCreateMutation = jest.fn()
const mockPublishMutation = jest.fn()
const mockArchiveMutation = jest.fn()
const mockBulkMutation = jest.fn()

const buildMutation = (mockFn: jest.Mock) => ({
  mutateAsync: jest.fn(async (payload: unknown) => {
    mockFn(payload)
    return {}
  }),
  isPending: false,
})

jest.mock('../../../../api/quotasApi', () => {
  const actual = jest.requireActual('../../../../api/quotasApi')
  return {
    ...actual,
    useQuotaSchemesQuery: (params: unknown) => mockSchemesQuery(params),
    useQuotaSchemeCellsQuery: (_schemeId: number | null, _filters: unknown) => mockCellsQuery(_schemeId, _filters),
    useQuotaSchemeStatsQuery: (_schemeId: number | null) => mockStatsQuery(_schemeId),
    useCreateQuotaSchemeMutation: () => buildMutation(mockCreateMutation),
    usePublishQuotaSchemeMutation: () => buildMutation(mockPublishMutation),
    useArchiveQuotaSchemeMutation: () => buildMutation(mockArchiveMutation),
    useBulkUpsertQuotaCellsMutation: () => buildMutation(mockBulkMutation),
  }
})

jest.mock('../../../../components/inputs/LookupSelect', () => ({
  ProjectLookupSelect: ({ label, value, onChange, placeholder }: any) => (
    <label>
      <span>{label}</span>
      <select
        data-testid='project-select'
        value={value === '' ? '' : String(value)}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : '')}
      >
        <option value=''>{placeholder}</option>
        <option value='1'>Project One</option>
      </select>
    </label>
  ),
}))

jest.mock('../../../../components/inputs/SelectInput', () => ({
  SelectInput: ({ label, value, onChange, options }: any) => (
    <label>
      <span>{label}</span>
      <select data-testid={`select-${label}`} value={value} onChange={onChange}>
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}))

jest.mock('../../../../components/inputs/TextInput', () => ({
  TextInput: ({ label, value, onChange }: any) => (
    <label>
      <span>{label}</span>
      <input data-testid={`input-${label}`} value={value} onChange={onChange} />
    </label>
  ),
}))

jest.mock('../../../../components/inputs/ToggleInput', () => ({
  ToggleInput: ({ label, checked, onChange }: any) => (
    <label>
      <span>{label}</span>
      <input type='checkbox' checked={checked} onChange={onChange} />
    </label>
  ),
}))

jest.mock('../../../../components/projectTypesInput/ProjectTypesInput', () => ({
  ProjectTypesInput: ({ values, onChange }: any) => (
    <div>
      <span>Values</span>
      <button type='button' onClick={() => onChange([...values, 'new'])}>
        add
      </button>
    </div>
  ),
}))

function renderQuotaPage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <InsightZenI18nProvider initialLocale='en'>
        <QuotaManagementPage />
      </InsightZenI18nProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSchemesQuery.mockReturnValue({
    data: {
      results: [
        {
          id: 10,
          project: 1,
          name: 'Wave-1',
          version: 1,
          status: 'published',
          overflow_policy: 'strict',
          priority: 0,
          is_default: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          published_at: '2024-01-02T00:00:00Z',
          dimensions: [],
        },
      ],
    },
    isLoading: false,
    isError: false,
  })
  mockCellsQuery.mockReturnValue({
    data: [
      {
        id: 1,
        scheme: 10,
        selector: { gender: 'female' },
        label: 'F / 25-34',
        target: 10,
        soft_cap: 12,
        weight: 1.2,
        achieved: 4,
        in_progress: 2,
        reserved: 1,
        remaining: 6,
        capacity: 12,
      },
    ],
    isLoading: false,
    isError: false,
  })
  mockStatsQuery.mockReturnValue({
    data: {
      target_total: 10,
      achieved_total: 4,
      in_progress_total: 2,
      remaining_total: 4,
      by_dimension: {},
    },
    isLoading: false,
    isError: false,
  })
})

it('renders quota stats and cells after selecting a project', async () => {
  renderQuotaPage()

  fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })

  await waitFor(() => jestExpect(mockSchemesQuery).toHaveBeenCalled())
  jestExpect(screen.getAllByText('Wave-1').length).toBeGreaterThan(0)
  jestExpect(screen.getAllByText('Target').length).toBeGreaterThan(0)
  jestExpect(screen.getAllByText('10').length).toBeGreaterThan(0)
  jestExpect(screen.getAllByText('F / 25-34').length).toBeGreaterThan(0)
})

it('allows adding a new quota cell when a scheme is selected', async () => {
  renderQuotaPage()

  fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })

  await waitFor(() => jestExpect(mockSchemesQuery).toHaveBeenCalled())

  fireEvent.change(screen.getByTestId('input-Target'), { target: { value: '5' } })
  fireEvent.change(screen.getByTestId('input-Selector key'), { target: { value: 'gender' } })
  fireEvent.change(screen.getByTestId('input-Selector value'), { target: { value: 'male' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save cell' }))

  await waitFor(() => jestExpect(mockBulkMutation).toHaveBeenCalled())
})
