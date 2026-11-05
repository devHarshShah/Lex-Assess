import { useQuery } from '@tanstack/react-query'
import { api } from './api-client'

export interface Pricing {
  amountPaise: number
  compareAtPaise: number | null
  cycleMonths: number
  planName: string
  offerTag: string | null
  currency: 'INR'
}

export interface PlanRecord {
  planId: string
  amountPaise: number
  cycleMonths: number
  createdAt: string
}

export interface PricingSettings extends Pricing {
  planId: string
  plans: PlanRecord[]
  updatedAt: string | null
}

export type UpdatePricingInput = Pick<Pricing, 'amountPaise' | 'compareAtPaise' | 'cycleMonths' | 'planName' | 'offerTag'>

// Shown only until the API answers; matches the backend defaults
export const FALLBACK_PRICING: Pricing = {
  amountPaise: 49900,
  compareAtPaise: 199900,
  cycleMonths: 3,
  planName: 'Lex-Assess Premium',
  offerTag: 'New customer offer',
  currency: 'INR',
}

export const PRICING_QUERY_KEY = ['pricing']

export function fetchPricing(): Promise<Pricing> {
  return api.get<Pricing>('/pricing', { skipToast: true })
}

export function fetchPricingSettings(): Promise<PricingSettings> {
  return api.get<PricingSettings>('/superadmin/pricing')
}

export function updatePricingSettings(input: UpdatePricingInput): Promise<PricingSettings> {
  return api.put<PricingSettings>('/superadmin/pricing', input)
}

export function usePricing() {
  const query = useQuery({ queryKey: PRICING_QUERY_KEY, queryFn: fetchPricing, staleTime: 60_000 })
  return { pricing: query.data ?? FALLBACK_PRICING, isLoading: query.isLoading }
}

// ₹499, or ₹499.50 when there are paise
export function formatPrice(paise: number, opts: { alwaysDecimals?: boolean } = {}): string {
  const rupees = paise / 100
  const decimals = opts.alwaysDecimals || paise % 100 !== 0 ? 2 : 0
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

// "3 months" / "month"
export function cycleLabel(months: number): string {
  return months === 1 ? 'month' : `${months} months`
}

// "3 Months" / "1 Month"
export function validityLabel(months: number): string {
  return `${months} Month${months === 1 ? '' : 's'}`
}
