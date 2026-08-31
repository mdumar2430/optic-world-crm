import type { Prescription } from '@/types';

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
  { key: 'rightEye', label: 'Right (OD)' },
  { key: 'leftEye', label: 'Left (OS)' },
] as const;

/** Read-only rendering of a prescription, exactly as it was recorded. */
export function PrescriptionView({ prescription }: { prescription: Prescription }) {
  // Hide columns that were never filled in, to keep the table readable.
  const usedColumns = COLUMNS.filter(
    (column) =>
      prescription.rightEye[column.field].trim() !== '' ||
      prescription.leftEye[column.field].trim() !== '',
  );

  return (
    <div className="space-y-3">
      {usedColumns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="py-2 pr-4 text-left">Eye</th>
                {usedColumns.map((column) => (
                  <th key={column.field} scope="col" className="px-3 py-2 text-center">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {EYES.map((eye) => (
                <tr key={eye.key}>
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-slate-700">
                    {eye.label}
                  </th>
                  {usedColumns.map((column) => (
                    <td
                      key={column.field}
                      className="px-3 py-2 text-center tabular-nums text-slate-900"
                    >
                      {prescription[eye.key][column.field] || '—'}
                    </td>
                  ))}
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
