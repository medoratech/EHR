import type { Department } from '../../data/types'
import { useEhr } from '../../state/useEhr'
import { WorkspaceField, WorkspaceSelect } from './Workspace'

/** Demographic inputs shared by patient registration and walk-in check-in. */
export function PatientFields({ defaultDepartment }: { defaultDepartment?: Department }) {
  const { activeDepartments } = useEhr()
  return (
    <>
      <WorkspaceField label="Full name" name="name" placeholder="e.g. Esi Mensah" />
      <div className="grid gap-4 sm:grid-cols-3">
        <WorkspaceField label="Age" name="age" type="number" min={0} max={130} />
        <WorkspaceField label="Sex">
          <WorkspaceSelect
            name="sex"
            options={[
              { value: 'female', label: 'Female' },
              { value: 'male', label: 'Male' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </WorkspaceField>
        <WorkspaceField label="Phone" name="phone" type="tel" placeholder="+233 …" required={false} />
      </div>
      <WorkspaceField label="Department">
        <WorkspaceSelect
          name="department"
          defaultValue={defaultDepartment && activeDepartments.includes(defaultDepartment) ? defaultDepartment : undefined}
          options={activeDepartments.map((department) => ({ value: department, label: department }))}
        />
      </WorkspaceField>
      <div className="grid gap-4 sm:grid-cols-2">
        <WorkspaceField label="Known conditions" name="conditions" placeholder="Comma separated" required={false} />
        <WorkspaceField label="Allergies" name="allergies" placeholder="Comma separated, or leave blank" required={false} />
      </div>
    </>
  )
}
