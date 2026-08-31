import { GridInput, Input, Textarea } from '@/components/ui';
import type { EyeDraft, PrescriptionDraft } from './draft';

type EyeField = keyof EyeDraft;

const COLUMNS: ReadonlyArray<{ field: EyeField; label: string; hint: string }> = [
  { field: 'distanceSph', label: 'SPH', hint: 'Distance sphere' },
  { field: 'distanceCyl', label: 'CYL', hint: 'Distance cylinder' },
  { field: 'distanceAxis', label: 'AXIS', hint: 'Distance axis' },
  { field: 'nearSph', label: 'N-SPH', hint: 'Near sphere' },
  { field: 'nearCyl', label: 'N-CYL', hint: 'Near cylinder' },
  { field: 'nearAxis', label: 'N-AXIS', hint: 'Near axis' },
  { field: 'add', label: 'ADD', hint: 'Addition' },
  { field: 'pd', label: 'PD', hint: 'Pupillary distance' },
];

const EYES: ReadonlyArray<{ key: 'rightEye' | 'leftEye'; label: string; short: string }> = [
  { key: 'rightEye', label: 'Right eye (OD)', short: 'R' },
  { key: 'leftEye', label: 'Left eye (OS)', short: 'L' },
];

interface PrescriptionFieldsProps {
  value: PrescriptionDraft;
  onChange: (next: PrescriptionDraft) => void;
  disabled?: boolean;
}

/**
 * Values are stored exactly as typed. No optical arithmetic happens anywhere in
 * this app — transposing or normalising a prescription is a clinical decision.
 */
export function PrescriptionFields({ value, onChange, disabled }: PrescriptionFieldsProps) {
  const setEye = (eye: 'rightEye' | 'leftEye', field: EyeField, next: string) => {
    onChange({ ...value, [eye]: { ...value[eye], [field]: next } });
  };

  return (
    <div className="space-y-4">
      {/* Desktop and tablet: one row per eye. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th scope="col" className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Eye
              </th>
              {COLUMNS.map((column) => (
                <th
                  key={column.field}
                  scope="col"
                  title={column.hint}
                  className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EYES.map((eye) => (
              <tr key={eye.key}>
                <th scope="row" className="py-1 pr-3 text-left text-sm font-medium text-slate-700">
                  {eye.label}
                </th>
                {COLUMNS.map((column) => (
                  <td key={column.field} className="px-1 py-1">
                    <GridInput
                      aria-label={`${eye.label} ${column.hint}`}
                      value={value[eye.key][column.field]}
                      onChange={(event) => setEye(eye.key, column.field, event.target.value)}
                      disabled={disabled}
                      placeholder="—"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked per eye, no horizontal scrolling. */}
      <div className="space-y-4 sm:hidden">
        {EYES.map((eye) => (
          <div key={eye.key} className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-sm font-medium text-slate-700">{eye.label}</p>
            <div className="grid grid-cols-4 gap-2">
              {COLUMNS.map((column) => (
                <label key={column.field} className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {column.label}
                  </span>
                  <GridInput
                    aria-label={`${eye.label} ${column.hint}`}
                    value={value[eye.key][column.field]}
                    onChange={(event) => setEye(eye.key, column.field, event.target.value)}
                    disabled={disabled}
                    placeholder="—"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Binocular PD"
          value={value.binocularPd}
          onChange={(event) => onChange({ ...value, binocularPd: event.target.value })}
          disabled={disabled}
          placeholder="e.g. 64"
        />
        <Input
          label="Doctor / optometrist"
          value={value.doctor}
          onChange={(event) => onChange({ ...value, doctor: event.target.value })}
          disabled={disabled}
          placeholder="e.g. Dr. Meera Krishnan"
        />
      </div>

      <Textarea
        label="Prescription notes"
        value={value.notes}
        onChange={(event) => onChange({ ...value, notes: event.target.value })}
        disabled={disabled}
        rows={2}
        placeholder="Coating advice, wearing instructions, anything the customer was told"
      />
    </div>
  );
}
