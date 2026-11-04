import { type ReactNode } from "react";
import { X, AlertCircle, Inbox } from "lucide-react";

export function Modal({ title, children, onClose, footer }: {
  title: string; children: ReactNode; onClose: () => void; footer?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="flex justify-end gap-3 p-4 border-t border-slate-200">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="text-center py-12 text-slate-400">
      <Inbox size={48} className="mx-auto mb-3 opacity-50" />
      <h3 className="text-base font-medium text-slate-600">{title}</h3>
      <p className="text-sm mt-1">{message}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm mb-4">
      <AlertCircle size={18} /> {message}
    </div>
  );
}

export function Spinner() {
  return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-3 border-slate-200 border-t-primary-600 rounded-full animate-spin" /></div>;
}

export function Badge({ color, children }: { color: string; children: ReactNode }) {
  const colors: Record<string, string> = {
    green: "bg-green-100 text-green-700", red: "bg-red-100 text-red-700",
    yellow: "bg-yellow-100 text-yellow-700", blue: "bg-blue-100 text-blue-700",
    gray: "bg-slate-100 text-slate-600", orange: "bg-orange-100 text-orange-700",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>{children}</span>;
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {action}
    </div>
  );
}
