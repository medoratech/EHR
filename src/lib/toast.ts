export type ToastTone = 'success' | 'error' | 'info'

export const TOAST_EVENT = 'medora:toast'

/** Shows a transient message in the corner of the app. */
export function toast(message: string, tone: ToastTone = 'info') {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message, tone } }))
}
