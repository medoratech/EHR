import type { Role } from '../../data/types'

/** Portals each role may open. Administrators can look into every staff workspace. */
export const PORTALS_BY_ROLE: Record<Role, string[]> = {
  patient: ['patient'],
  doctor: ['doctor'],
  staff: ['staff'],
  lab: ['laboratory'],
  pharmacy: ['pharmacy'],
  receptionist: ['reception'],
  admin: ['admin', 'doctor', 'staff', 'laboratory', 'pharmacy', 'reception'],
}

export function canOpenPortal(role: Role, portalId: string): boolean {
  return PORTALS_BY_ROLE[role].includes(portalId)
}
