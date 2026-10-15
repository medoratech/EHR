export function announceDemoAction(message: string) {
  window.dispatchEvent(new CustomEvent('medora:demo-action', { detail: { message } }))
}
