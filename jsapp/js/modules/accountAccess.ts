import type { AccountResponse } from '#/dataInterface'
import { MODULE_KEYS } from './moduleConfig'

export type AccountType = 'organizational' | 'personal'

export interface AccountAccessInfo {
  accountType: AccountType
  paymentConfirmed: boolean
  accountStatus?: unknown
  allowedModules: Set<string>
  hasFullAccess: boolean
  storageLimitBytes?: number | null
}

const FORM_MANAGER_KEY = 'form-manager'
const LIBRARY_KEY = 'library'
const ADDITIONAL_MODULE_KEYS = new Set(MODULE_KEYS)

export function resolveAccountAccess(
  extraDetails: AccountResponse['extra_details'] | undefined,
): AccountAccessInfo {
  const detailsRecord = (extraDetails || {}) as Record<string, unknown>

  const accountTypeRaw = detailsRecord['account_type']
  const accountType: AccountType =
    accountTypeRaw === 'personal' || accountTypeRaw === 'organizational'
      ? (accountTypeRaw as AccountType)
      : 'organizational'

  const paymentConfirmedRaw = detailsRecord['payment_confirmed']
  const paymentConfirmed = paymentConfirmedRaw === true
  const accountStatus = detailsRecord['account_status']
  const allowedModulesRaw = detailsRecord['allowed_modules']
  const isLegacyAccount = allowedModulesRaw === undefined && paymentConfirmedRaw === undefined

  const resolvedAllowedModules = new Set<string>()
  resolvedAllowedModules.add(FORM_MANAGER_KEY)
  resolvedAllowedModules.add(LIBRARY_KEY)

  if (Array.isArray(allowedModulesRaw)) {
    for (const value of allowedModulesRaw) {
      if (typeof value === 'string') {
        resolvedAllowedModules.add(value)
      }
    }
  }

  if (isLegacyAccount) {
    for (const key of ADDITIONAL_MODULE_KEYS) {
      resolvedAllowedModules.add(key)
    }
  } else if (accountType === 'organizational' && paymentConfirmed) {
    for (const key of ADDITIONAL_MODULE_KEYS) {
      resolvedAllowedModules.add(key)
    }
  } else if (accountType === 'organizational' && !paymentConfirmed) {
    for (const key of MODULE_KEYS) {
      resolvedAllowedModules.delete(key)
    }
  } else if (accountType === 'personal') {
    for (const key of MODULE_KEYS) {
      resolvedAllowedModules.delete(key)
    }
  }

  const storageLimitRaw = detailsRecord['storage_limit_bytes']
  const storageLimitBytes =
    typeof storageLimitRaw === 'number' ? storageLimitRaw : undefined

  const effectivePaymentConfirmed = paymentConfirmed || isLegacyAccount

  const hasFullAccess =
    accountType === 'organizational' && effectivePaymentConfirmed && MODULE_KEYS.every((key) => resolvedAllowedModules.has(key))

  return {
    accountType,
    paymentConfirmed: effectivePaymentConfirmed,
    accountStatus,
    allowedModules: resolvedAllowedModules,
    hasFullAccess,
    storageLimitBytes: storageLimitBytes ?? null,
  }
}
