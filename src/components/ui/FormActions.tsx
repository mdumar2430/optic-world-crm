import type { ReactNode } from 'react';
import { FormError } from './States';

interface FormActionsProps {
  /** Form-level error, shown above the buttons. */
  error?: string | null;
  children: ReactNode;
}

/**
 * Action row for long forms. It sticks to the bottom of the screen while the
 * form scrolls — above the bottom navigation on phones — so Save is always in
 * reach, and settles into place at the end of the form.
 *
 * Children are the buttons in reading order: secondary first, primary last.
 */
export function FormActions({ error = null, children }: FormActionsProps) {
  return (
    <div className="sticky bottom-above-nav z-10 -mx-4 mt-6 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:bottom-4 lg:mx-0 lg:rounded-xl lg:border lg:px-5 lg:shadow-panel">
      {error && (
        <div className="mb-3">
          <FormError message={error} />
        </div>
      )}
      {/* One compact row even on phones: the last (primary) button takes the
          spare width there, so the bar covers as little of the form as possible. */}
      <div className="flex gap-2 sm:justify-end [&>:last-child]:flex-1 sm:[&>:last-child]:flex-none">
        {children}
      </div>
    </div>
  );
}
