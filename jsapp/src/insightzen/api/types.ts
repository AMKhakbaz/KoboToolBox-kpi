export type InsightZenLocale = 'fa' | 'en'

export type InsightZenRole = 'admin' | 'manager' | 'supervisor' | 'agent' | 'viewer'

export interface InsightZenMembershipBrief {
  id: number
  project: number
  project_code: string
  project_name: string
  role: InsightZenRole
  title: string
  is_active: boolean
}

export interface InsightZenMembership extends InsightZenMembershipBrief {
  panel_permissions: Record<string, unknown>
  user: number
  user_username: string
  user_full_name: string
  created_at: string
}

export interface InsightZenUser {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  phone: string
  preferred_locale: InsightZenLocale
  timezone: string
  is_active: boolean
  is_staff: boolean
  memberships_detail: InsightZenMembership[]
  memberships_brief: InsightZenMembershipBrief[]
}

export interface InsightZenUserPayload {
  username: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  preferred_locale?: InsightZenLocale
  timezone?: string
  is_active?: boolean
  is_staff?: boolean
  password?: string
  memberships?: Array<Partial<InsightZenMembership> & { project: number }>
}

export interface InsightZenProject {
  id: number
  code: string
  name: string
  description: string
  owner: number
  owner_username: string
  types: string[]
  status: 'active' | 'paused' | 'archived'
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
  membership_count: number
  memberships: InsightZenMembership[]
}

export interface InsightZenProjectPayload {
  code: string
  name: string
  description?: string
  owner: number
  types: string[]
  status?: 'active' | 'paused' | 'archived'
  start_date?: string | null
  end_date?: string | null
}

export interface InsightZenFilters {
  q?: string
  is_active?: boolean
  role?: InsightZenRole
  project_id?: number
  status?: 'active' | 'paused' | 'archived'
  owner_id?: number
  type?: string
  page?: number
  page_size?: number
}

export type InsightZenAssignmentStatus =
  | 'reserved'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled'

export type InsightZenInterviewStatus = 'not_started' | 'in_progress' | 'completed'

export type InsightZenSampleStatus = 'available' | 'claimed' | 'completed' | 'blocked'

export interface InsightZenInterview {
  id: number
  assignment: number
  start_form: string | null
  end_form: string | null
  status: InsightZenInterviewStatus
  outcome_code: string | null
  meta: Record<string, unknown>
}

export interface InsightZenSampleContact {
  id: number
  project: number
  quota_cell: number | null
  phone_id: number | null
  person_id: number | null
  phone_number: string
  full_name: string
  gender: string | null
  age_band: string | null
  province_code: string | null
  city_code: string | null
  attributes: Record<string, unknown>
  is_active: boolean
  status: InsightZenSampleStatus
  attempt_count: number
  last_attempt_at: string | null
  interviewer: number | null
  used_at: string | null
  created_at: string
}

export interface InsightZenAssignment {
  id: number
  project: number
  project_code: string
  scheme: number
  scheme_name: string
  cell: number
  cell_label: string
  cell_selector: Record<string, unknown>
  cell_target: number | null
  cell_achieved: number
  cell_in_progress: number
  interviewer: number
  interviewer_username: string
  interviewer_full_name: string
  sample: number
  sample_phone_number: string
  sample_full_name: string
  sample_gender: string | null
  sample_age_band: string | null
  sample_province_code: string | null
  sample_city_code: string | null
  sample_attributes: Record<string, unknown>
  sample_status: InsightZenSampleStatus
  sample_attempt_count: number
  sample_last_attempt_at: string | null
  status: InsightZenAssignmentStatus
  reserved_at: string
  expires_at: string
  completed_at: string | null
  outcome_code: string | null
  meta: Record<string, unknown>
  interview: InsightZenInterview | null
}

export interface InsightZenAssignmentFilters {
  project?: number
  status?: InsightZenAssignmentStatus
  interviewer?: number
  q?: string
  page?: number
  page_size?: number
}

export type InsightZenQuotaStatus = 'draft' | 'published' | 'archived'

export type InsightZenQuotaOverflowPolicy = 'strict' | 'soft' | 'weighted'

export interface InsightZenQuotaScheme {
  id: number
  project: number
  name: string
  version: number
  status: InsightZenQuotaStatus
  dimensions: Array<Record<string, unknown>>
  overflow_policy: InsightZenQuotaOverflowPolicy
  priority: number
  is_default: boolean
  created_by: number | null
  created_by_username?: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface InsightZenQuotaSchemePayload {
  project: number
  name: string
  dimensions: Array<Record<string, unknown>>
  overflow_policy: InsightZenQuotaOverflowPolicy
  priority?: number
  is_default?: boolean
}

export interface InsightZenQuotaFilters {
  project?: number
  status?: InsightZenQuotaStatus
  q?: string
  page?: number
  page_size?: number
}

export interface InsightZenQuotaCell {
  id: number
  scheme: number
  selector: Record<string, unknown>
  label: string
  target: number
  soft_cap: number | null
  weight: number
  achieved: number
  in_progress: number
  reserved: number
  remaining: number | null
  capacity: number | null
  updated_at: string
}

export interface InsightZenQuotaCellPayload {
  selector: Record<string, unknown>
  label?: string
  target: number
  soft_cap?: number | null
  weight?: number
}

export interface InsightZenQuotaCellFilters {
  complete?: 'true' | 'false'
  q?: string
}

export interface InsightZenQuotaStats {
  target_total: number
  achieved_total: number
  in_progress_total: number
  remaining_total: number
  by_dimension: Record<string, Record<string, { target: number; achieved: number; in_progress: number }>>
}

export interface InsightZenCollectionFilters {
  project: number
  from?: string
  to?: string
  interviewer?: number[]
  outcomes?: string[]
  team?: string[]
}

export interface InsightZenCollectionBarParams extends InsightZenCollectionFilters {
  group_by?: 'interviewer' | 'day'
  metric?: 'completes' | 'attempts' | 'sr'
  limit?: number
}

export interface InsightZenCollectionTableFilters extends InsightZenCollectionFilters {
  page?: number
  page_size?: number
}

export interface InsightZenCollectionSummary {
  project: number
  range: { from: string; to: string }
  totals: {
    attempts: number
    completes: number
    success_rate: number
    avg_duration_sec: number
  }
  by_day: Array<{ day: string | null; attempts: number; completes: number; sr: number }>
}

export interface InsightZenCollectionBarEntry {
  label: string
  value: number
  attempts: number
  completes: number
  sr: number
  avg_duration_sec?: number
  interviewer_id?: number
}

export interface InsightZenCollectionPieEntry {
  interviewer_id?: number
  label: string
  value: number
  share: number
}

export interface InsightZenCollectionTopEntry {
  rank: number
  interviewer_id?: number
  label: string
  attempts: number
  completes: number
  sr: number
  avg_duration_sec: number
}

export interface InsightZenCollectionTableRow {
  date: string | null
  project: string | null
  project_code: string | null
  project_id: number | null
  interviewer: string | null
  interviewer_id: number | null
  team: string
  phone_number: string
  outcome_code: string | null
  start_form: string | null
  end_form: string | null
  duration_sec: number | null
  call_attempts: number | null
  cell_id: number | null
  cell_label: string | null
  gender: string | null
  province_code: string | null
  age_band: string | null
}

export interface InsightZenCollectionOptions {
  interviewers: Array<{ id: number; label: string }>
  outcome_codes: string[]
  teams: string[]
}
