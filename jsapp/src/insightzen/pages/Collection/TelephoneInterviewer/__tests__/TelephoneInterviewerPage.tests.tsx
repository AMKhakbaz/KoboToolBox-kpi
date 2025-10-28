import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect as jestExpect } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TelephoneInterviewerPage } from '../TelephoneInterviewerPage'
import { InsightZenI18nProvider } from '../../../../i18n/I18nProvider'

jest.mock('alertifyjs', () => ({ success: jest.fn(), error: jest.fn() }))

const mockAssignmentsQuery = jest.fn()
const mockRequestNext = jest.fn()
const mockStart = jest.fn()
const mockComplete = jest.fn()
const mockFail = jest.fn()
const mockExpire = jest.fn()
const mockCancel = jest.fn()

const assignment = {
  id: 42,
  project: 1,
  project_code: 'PRJ',
  scheme: 3,
  scheme_name: 'Quota A',
  cell: 5,
  cell_label: 'Cell A',
  cell_selector: { gender: 'female' },
  cell_target: 10,
  cell_achieved: 4,
  cell_in_progress: 1,
  interviewer: 7,
  interviewer_username: 'agent1',
  interviewer_full_name: 'Agent Smith',
  sample: 11,
  sample_phone_number: '+98-912-000-0000',
  sample_full_name: 'Respondent',
  sample_gender: 'female',
  sample_age_band: '25-34',
  sample_province_code: '01',
  sample_city_code: '0101',
  sample_attributes: { region: 'Tehran' },
  sample_status: 'claimed',
  sample_attempt_count: 1,
  sample_last_attempt_at: '2024-01-01T00:00:00Z',
  status: 'reserved',
  reserved_at: '2024-01-01T00:00:00Z',
  expires_at: '2024-01-01T01:00:00Z',
  completed_at: null,
  outcome_code: null,
  meta: {},
  interview: {
    id: 99,
    assignment: 42,
    start_form: null,
    end_form: null,
    status: 'not_started',
    outcome_code: null,
    meta: {},
  },
}

const buildMutation = (mockFn: jest.Mock, result: unknown = assignment) => ({
  mutateAsync: jest.fn(async (variables: unknown) => {
    mockFn(variables)
    return result
  }),
  isPending: false,
  variables: undefined as unknown,
})

jest.mock('../../../../api/assignmentsApi', () => {
  const actual = jest.requireActual('../../../../api/assignmentsApi')
  return {
    ...actual,
    useInsightZenAssignmentsQuery: (params: unknown) => mockAssignmentsQuery(params),
    useRequestNextAssignmentMutation: () => buildMutation(mockRequestNext, assignment),
    useStartInterviewMutation: () => buildMutation(mockStart),
    useCompleteAssignmentMutation: () => buildMutation(mockComplete),
    useFailAssignmentMutation: () => buildMutation(mockFail),
    useExpireAssignmentMutation: () => buildMutation(mockExpire),
    useCancelAssignmentMutation: () => buildMutation(mockCancel),
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
  TextInput: ({ label, value, onChange, placeholder }: any) => (
    <label>
      <span>{label}</span>
      <input data-testid={`input-${label}`} value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  ),
}))

function renderTelephonePage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <InsightZenI18nProvider initialLocale='en'>
        <TelephoneInterviewerPage />
      </InsightZenI18nProvider>
    </QueryClientProvider>,
  )
}

describe('TelephoneInterviewerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAssignmentsQuery.mockReturnValue({
      data: { count: 1, results: [assignment] },
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    })
  })

  it('renders assignments after selecting a project and triggers start action', async () => {
    renderTelephonePage()

    fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })

    await screen.findByRole('button', { name: 'Start' })

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    await waitFor(() => jestExpect(mockStart).toHaveBeenCalledWith({ id: 42 }))
  })

  it('requests the next assignment and shows success toast', async () => {
    const { success } = require('alertifyjs') as { success: jest.Mock }
    renderTelephonePage()

    fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })

    await screen.findByRole('button', { name: 'Start' })

    fireEvent.click(screen.getByRole('button', { name: 'Assign next number' }))

    await waitFor(() => jestExpect(mockRequestNext).toHaveBeenCalledWith({ project: 1 }))
    jestExpect(success).toHaveBeenCalledWith('New number assigned.')
  })

  it('marks assignment as completed', async () => {
    renderTelephonePage()

    fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })
    await screen.findByRole('button', { name: 'Start' })

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }))

    await waitFor(() =>
      jestExpect(mockComplete).toHaveBeenCalledWith(
        jestExpect.objectContaining({
          id: 42,
          payload: jestExpect.objectContaining({ outcome_code: 'COMP' }),
        }),
      ),
    )
  })
})
