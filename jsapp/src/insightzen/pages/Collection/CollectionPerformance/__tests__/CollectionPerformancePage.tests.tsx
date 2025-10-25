import React from 'react'
import { expect as jestExpect } from '@jest/globals'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'

import { CollectionPerformancePage } from '../CollectionPerformancePage'
import { InsightZenI18nProvider } from '../../../../i18n/I18nProvider'

const mockSummary = jest.fn()
const mockBar = jest.fn()
const mockPie = jest.fn()
const mockTop = jest.fn()
const mockTable = jest.fn()
const mockOptions = jest.fn()
const mockExport = jest.fn()

jest.mock('../../../../api/collectionPerformanceApi', () => ({
  useCollectionSummaryQuery: (params: unknown) => mockSummary(params),
  useCollectionBarQuery: (params: unknown) => mockBar(params),
  useCollectionPieQuery: (params: unknown) => mockPie(params),
  useCollectionTopQuery: (params: unknown) => mockTop(params),
  useCollectionTableQuery: (params: unknown) => mockTable(params),
  useCollectionOptionsQuery: (params: unknown) => mockOptions(params),
  exportCollectionPerformanceXlsx: (params: unknown) => mockExport(params),
}))

jest.mock('../../../../components/inputs/LookupSelect', () => ({
  ProjectLookupSelect: ({ label, value, onChange }: any) => (
    <label>
      <span>{label}</span>
      <select
        data-testid='project-select'
        value={value === '' ? '' : String(value)}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : '')}
      >
        <option value=''>Select</option>
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

const summaryData = {
  project: 1,
  range: { from: '2024-01-01', to: '2024-01-07' },
  totals: { attempts: 12, completes: 5, success_rate: 0.4166, avg_duration_sec: 180 },
  by_day: [],
}

const barData = [
  { label: 'Agent A', value: 5, attempts: 7, completes: 5, sr: 0.71, avg_duration_sec: 200 },
]

const pieData = [{ label: 'Agent A', value: 5, share: 0.62 }]

const topData = [
  { rank: 1, interviewer_id: 9, label: 'Agent A', attempts: 7, completes: 5, sr: 0.71, avg_duration_sec: 210 },
]

const tableData = {
  count: 1,
  results: [
    {
      date: '2024-01-05',
      project: 'Project One',
      project_code: 'PRJ',
      project_id: 1,
      interviewer: 'Agent A',
      interviewer_id: 9,
      team: 'North',
      phone_number: '+98***',
      outcome_code: 'COMP',
      start_form: '2024-01-05T09:00:00Z',
      end_form: '2024-01-05T09:10:00Z',
      duration_sec: 600,
      call_attempts: 1,
      cell_id: 3,
      cell_label: 'Cell A',
      gender: 'female',
      province_code: '01',
      age_band: '25-34',
    },
  ],
}

const optionsData = {
  interviewers: [{ id: 9, label: 'Agent A' }],
  outcome_codes: ['COMP'],
  teams: ['North'],
}

function renderPage() {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <InsightZenI18nProvider initialLocale='en'>
        <CollectionPerformancePage />
      </InsightZenI18nProvider>
    </QueryClientProvider>,
  )
}

describe('CollectionPerformancePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSummary.mockImplementation((params) => ({ data: params ? summaryData : undefined }))
    mockBar.mockImplementation((params) => ({ data: params ? barData : [] }))
    mockPie.mockImplementation((params) => ({ data: params ? pieData : [] }))
    mockTop.mockImplementation((params) => ({ data: params ? topData : [] }))
    mockTable.mockImplementation((params) => ({ data: params ? tableData : { count: 0, results: [] }, isFetching: false }))
    mockOptions.mockImplementation((params) => ({ data: params ? optionsData : undefined }))
    mockExport.mockResolvedValue(undefined)
  })

  it('shows instructions until a project is selected', () => {
    renderPage()
    jestExpect(
      screen.getByText('Select a project to see collection performance insights.'),
    ).toBeDefined()
  })

  it('renders summary and table data after selecting a project', async () => {
    renderPage()
    fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })
    jestExpect(await screen.findByText('12')).toBeDefined()
    jestExpect(screen.getAllByText('Agent A').length).toBeGreaterThan(0)
    jestExpect(screen.getByText('+98***')).toBeDefined()
  })

  it('updates metric selection and triggers export', async () => {
    renderPage()
    fireEvent.change(screen.getByTestId('project-select'), { target: { value: '1' } })
    const metricSelect = await screen.findByTestId('select-Metric')
    fireEvent.change(metricSelect, { target: { value: 'attempts' } })
    jestExpect(mockBar).toHaveBeenLastCalledWith(
      jestExpect.objectContaining({ metric: 'attempts' }),
    )

    fireEvent.click(screen.getByText('Export XLSX'))
    jestExpect(mockExport).toHaveBeenCalledWith(jestExpect.objectContaining({ project: 1 }))
  })
})
