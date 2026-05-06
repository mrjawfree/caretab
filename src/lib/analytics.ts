import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com'

export function initAnalytics() {
  if (!POSTHOG_KEY) return
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage',
    autocapture: false,
  })
}

function capture(event: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return
  posthog.capture(event, properties)
}

export function trackSessionStart() {
  capture('session_start')
}

export function trackExtensionInstalled() {
  const key = 'caretab_installed_tracked'
  if (localStorage.getItem(key)) return
  capture('extension_installed')
  localStorage.setItem(key, '1')
}

export function trackOnboardingCompleted() {
  capture('onboarding_completed')
}

export function trackExpenseAdded(properties: { category: string; has_receipt: boolean }) {
  capture('expense_added', properties)
}

export function trackExpenseDeleted() {
  capture('expense_deleted')
}

export function trackExportTriggered(properties: { format: string; expense_count: number }) {
  capture('export_triggered', properties)
}

export function trackReimbursedFlagToggled(properties: { reimbursed: boolean }) {
  capture('reimbursed_flag_toggled', properties)
}

export function trackYearEndAlertShown(properties: { remaining: number; days_left: number }) {
  capture('year_end_alert_shown', properties)
}

export function trackYearEndAlertDismissed() {
  capture('year_end_alert_dismissed')
}

export function trackYearEndNotificationSent() {
  capture('year_end_notification_sent')
}

export function identifyUser(anonymousId: string) {
  if (!POSTHOG_KEY) return
  posthog.identify(anonymousId)
}

export function resetAnalytics() {
  if (!POSTHOG_KEY) return
  posthog.reset()
}
