import type { Prescription } from '@/types';
import { cn } from '@/utils/cn';

const COLUMNS = [
  { field: 'distanceSph', label: 'SPH' },
  { field: 'distanceCyl', label: 'CYL' },
  { field: 'distanceAxis', label: 'AXIS' },
  { field: 'nearSph', label: 'N-SPH' },
  { field: 'nearCyl', label: 'N-CYL' },
  { field: 'nearAxis', label: 'N-AXIS' },
  { field: 'add', label: 'ADD' },
  { field: 'pd', label: 'PD' },
] as const;

const EYES = [
  { key: 'rightEye', label: 'Right (OD)', short: 'R' },
  { key: 'leftEye', label: 'Left (OS)', short: 'L' },
] as const;

type EyeKey = (typeof EYES)[number]['key'];
type ColumnField = (typeof COLUMNS)[number]['field'];

interface PrescriptionViewProps {
  prescription: Prescription;
  /**
   * An earlier prescription to compare against — typically what the customer
   * came in wearing. Values that differ from it are highlighted.
   */
  compareWith?: Prescription | null;
}

/** Read-only rendering of a prescription, exactly as it was recorded. */
export function PrescriptionView({ prescription, compareWith = null }: PrescriptionViewProps) {
  const sources = compareWith ? [prescription, compareWith] : [prescription];
  // Hide columns that were never filled in, to keep the table readable.
  const usedColumns = COLUMNS.filter((column) =>
    sources.some(
      (source) =>
        source.rightEye[column.field].trim() !== '' || source.leftEye[column.field].trim() !== '',
    ),
  );

  // Compared as typed: no optical arithmetic happens anywhere in this app.
  const previousValue = (eye: EyeKey, field: ColumnField) =>
    compareWith ? compareWith[eye][field].trim() : null;

  return (
    <div className="space-y-3">
      {usedColumns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="py-2 pr-2 text-left sm:pr-4">Eye</th>
                {usedColumns.map((column) => (
                  <th key={column.field} scope="col" className="px-1 py-2 text-center sm:px-3">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {EYES.map((eye) => (
                <tr key={eye.key}>
                  <th
                    scope="row"
                    className="whitespace-nowrap py-2 pr-2 text-left font-medium text-slate-700 sm:pr-4"
                  >
                    <span className="sm:hidden" aria-hidden="true">
                      {eye.short}
                    </span>
                    <span className="sr-only sm:not-sr-only">{eye.label}</span>
                  </th>
                  {usedColumns.map((column) => {
                    const value = prescription[eye.key][column.field].trim();
                    const previous = previousValue(eye.key, column.field);
                    const changed = previous !== null && previous !== value;
                    return (
                      <td key={column.field} className="px-1 py-2 text-center tabular-nums sm:px-3">
                        <span
                          className={cn(
                            changed
                              ? 'rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-900 ring-1 ring-inset ring-amber-200'
                              : 'text-slate-900',
                          )}
                          title={changed ? `Was ${previous || 'blank'}` : undefined}
                        >
                          {value || '—'}
                        </span>
                        {changed && <span className="sr-only"> (was {previous || 'blank'})</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        {prescription.binocularPd && (
          <div className="flex gap-2">
            <dt className="text-slate-500">Binocular PD</dt>
            <dd className="tabular-nums text-slate-900">{prescription.binocularPd}</dd>
          </div>
        )}
        {prescription.doctor && (
          <div className="flex gap-2">
            <dt className="text-slate-500">Doctor</dt>
            <dd className="text-slate-900">{prescription.doctor}</dd>
          </div>
        )}
      </dl>

      {prescription.notes && <p className="text-sm text-slate-600">{prescription.notes}</p>}
    </div>
  );
}
