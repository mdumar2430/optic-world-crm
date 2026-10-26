import { GridInput, Input, Textarea } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { EyeDraft, PrescriptionDraft } from './draft';

export type EyeField = keyof EyeDraft;

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
  /**
   * Prepended to every grid cell's accessible name, so two prescriptions on
   * one form ("Existing", "New") stay distinguishable to screen readers.
   */
  ariaPrefix?: string;
  /** Grid columns to show, in display order. Defaults to all of them. */
  columns?: readonly EyeField[];
  /** Hide the doctor field, e.g. for a machine reading. */
  showDoctor?: boolean;
  doctorLabel?: string;
  notesLabel?: string;
  notesPlaceholder?: string;
}

/**
 * Values are stored exactly as typed. No optical arithmetic happens anywhere in
 * this app — transposing or normalising a prescription is a clinical decision.
 */
export function PrescriptionFields({
  value,
  onChange,
  disabled,
  ariaPrefix,
  columns,
  showDoctor = true,
  doctorLabel = 'Doctor / optometrist',
  notesLabel = 'Prescription notes',
  notesPlaceholder = 'Coating advice, wearing instructions, anything the customer was told',
}: PrescriptionFieldsProps) {
  const visibleColumns = columns
    ? COLUMNS.filter((column) => columns.includes(column.field))
    : COLUMNS;

  const cellLabel = (eyeLabel: string, hint: string) =>
    [ariaPrefix, eyeLabel, hint].filter(Boolean).join(' ');

  const setEye = (eye: 'rightEye' | 'leftEye', field: EyeField, next: string) => {
    onChange({ ...value, [eye]: { ...value[eye], [field]: next } });
  };

  return (
    <div className="space-y-4">
      {/* Desktop and tablet: one row per eye. */}
      <div className="hidden overflow-x-auto sm:block">
        <table
          className={cn(
            'w-full border-separate border-spacing-0',
            // Eight narrow columns need room; a short reading fits as is.
            visibleColumns.length > 4 && 'min-w-[640px]',
          )}
        >
          <thead>
            <tr>
              <th scope="col" className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Eye
              </th>
              {visibleColumns.map((column) => (
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
                {visibleColumns.map((column) => (
                  <td key={column.field} className="px-1 py-1">
                    <GridInput
                      aria-label={cellLabel(eye.label, column.hint)}
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
              {visibleColumns.map((column) => (
                <label key={column.field} className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {column.label}
                  </span>
                  <GridInput
                    aria-label={cellLabel(eye.label, column.hint)}
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
        {showDoctor && (
          <Input
            label={doctorLabel}
            value={value.doctor}
            onChange={(event) => onChange({ ...value, doctor: event.target.value })}
            disabled={disabled}
            placeholder="e.g. Dr. Meera Krishnan"
          />
        )}
      </div>

      <Textarea
        label={notesLabel}
        value={value.notes}
        onChange={(event) => onChange({ ...value, notes: event.target.value })}
        disabled={disabled}
        rows={2}
        placeholder={notesPlaceholder}
      />
    </div>
  );
}
