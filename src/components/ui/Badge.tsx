import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import type { OrderStatus, PaymentStatus, ServiceStatus } from '@/types';
import {
  ORDER_STATUS_TONES,
  SERVICE_STATUS_TONES,
  type StatusTone,
} from '@/constants/workflow';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SERVICE_STATUS_LABELS,
} from '@/constants/labels';

const TONE_STYLES: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-brand-50 text-brand-700 ring-brand-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
};

interface BadgeProps {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_STATUS_TONES[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return <Badge tone={SERVICE_STATUS_TONES[status]}>{SERVICE_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge tone={status === 'paid' ? 'success' : 'warning'}>{PAYMENT_STATUS_LABELS[status]}</Badge>
  );
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return <Badge tone={isActive ? 'success' : 'neutral'}>{isActive ? 'Active' : 'Inactive'}</Badge>;
}
