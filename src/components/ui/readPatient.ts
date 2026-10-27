import type { Department, Sex } from '../../data/types'
import type { NewPatient } from '../../state/ehrStoreContext'
import type { WorkspaceValues } from './Workspace'

const list = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

/** Reads the values of <PatientFields /> from a submitted workspace. */
export function readPatient(values: WorkspaceValues): NewPatient {
  return {
    name: values.name,
    age: Number(values.age),
    sex: values.sex as Sex,
    phone: values.phone || undefined,
    department: values.department as Department,
    conditions: list(values.conditions),
    allergies: list(values.allergies),
  }
}
