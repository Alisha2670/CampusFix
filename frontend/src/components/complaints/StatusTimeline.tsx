import React from 'react';
import { ComplaintStatus } from '../../types/index.js';
import { Check, Clock, AlertTriangle, XCircle, Copy } from 'lucide-react';

interface StatusTimelineProps {
  currentStatus: ComplaintStatus;
}

const LIFECYCLE_STEPS: ComplaintStatus[] = [
  'Submitted',
  'Acknowledged',
  'Assigned',
  'In Progress',
  'Resolved',
];

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ currentStatus }) => {
  if (currentStatus === 'Rejected') {
    return (
      <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
        <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
        <span>This complaint was reviewed and marked as Rejected / Out of Scope.</span>
      </div>
    );
  }

  if (currentStatus === 'Duplicate') {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
        <Copy className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>This issue was marked as a duplicate of an existing active ticket.</span>
      </div>
    );
  }

  const currentStepIndex = LIFECYCLE_STEPS.indexOf(currentStatus);

  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between relative">
        {/* Connecting progress bar */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-slate-200 z-0" />
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-brand-500 transition-all duration-500 z-0"
          style={{
            width: `${Math.max(0, (currentStepIndex / (LIFECYCLE_STEPS.length - 1)) * 100)}%`,
          }}
        />

        {LIFECYCLE_STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step} className="flex flex-col items-center relative z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-sm ${
                  isCurrent
                    ? 'bg-brand-500 text-white ring-4 ring-brand-100 scale-110'
                    : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-400 border-2 border-slate-300'
                }`}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isCurrent ? (
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={`text-[11px] font-medium mt-1.5 hidden sm:block ${
                  isCurrent
                    ? 'text-brand-600 font-bold'
                    : isCompleted
                    ? 'text-slate-800'
                    : 'text-slate-400'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

