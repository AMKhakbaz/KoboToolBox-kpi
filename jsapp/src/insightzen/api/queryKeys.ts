export const insightZenQueryKeys = {
  base: ['insightzen'] as const,
  users: {
    all: ['insightzen', 'users'] as const,
    list: (params: Record<string, unknown>) => ['insightzen', 'users', params] as const,
    detail: (id: number) => ['insightzen', 'users', 'detail', id] as const,
    lookup: (params: Record<string, unknown>) => ['insightzen', 'users', 'lookup', params] as const,
  },
  quotas: {
    schemes: {
      all: ['insightzen', 'quotas', 'schemes'] as const,
      list: (params: Record<string, unknown>) => ['insightzen', 'quotas', 'schemes', params] as const,
      detail: (id: number) => ['insightzen', 'quotas', 'schemes', 'detail', id] as const,
    },
    cells: (schemeId: number, params: Record<string, unknown>) =>
      ['insightzen', 'quotas', 'schemes', schemeId, 'cells', params] as const,
    stats: (schemeId: number) => ['insightzen', 'quotas', 'schemes', schemeId, 'stats'] as const,
  },
  projects: {
    all: ['insightzen', 'projects'] as const,
    list: (params: Record<string, unknown>) => ['insightzen', 'projects', params] as const,
    detail: (id: number) => ['insightzen', 'projects', 'detail', id] as const,
    lookup: (params: Record<string, unknown>) => ['insightzen', 'projects', 'lookup', params] as const,
  },
  assignments: {
    all: ['insightzen', 'assignments'] as const,
    list: (params: Record<string, unknown>) => ['insightzen', 'assignments', params] as const,
    detail: (id: number) => ['insightzen', 'assignments', 'detail', id] as const,
    sample: (assignmentId: number) => ['insightzen', 'assignments', 'sample', assignmentId] as const,
  },
  interviews: {
    detail: (assignmentId: number) => ['insightzen', 'interviews', 'detail', assignmentId] as const,
  },
  collectionPerformance: {
    summary: (params: Record<string, unknown>) => ['insightzen', 'collection', 'summary', params] as const,
    bar: (params: Record<string, unknown>) => ['insightzen', 'collection', 'bar', params] as const,
    pie: (params: Record<string, unknown>) => ['insightzen', 'collection', 'pie', params] as const,
    top: (params: Record<string, unknown>) => ['insightzen', 'collection', 'top', params] as const,
    table: (params: Record<string, unknown>) => ['insightzen', 'collection', 'table', params] as const,
    options: (params: Record<string, unknown>) => ['insightzen', 'collection', 'options', params] as const,
  },
} as const
