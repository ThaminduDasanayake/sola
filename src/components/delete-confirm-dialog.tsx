import { Trash as TrashIcon } from '@phosphor-icons/react';
import React, { useEffect } from 'react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  count,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const isMultiple = count > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative w-full max-w-sm bg-[#1c1c1e] border border-white/10 rounded-2xl p-5 shadow-2xl z-10 flex flex-col items-center text-center">
        {/* Warning Icon Badge */}
        <div className="w-11 h-11 rounded-full bg-[#ff453a]/15 text-[#ff453a] flex items-center justify-center mb-3">
          <TrashIcon className="w-5 h-5" weight="fill" />
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-[#f5f5f7] tracking-tight mb-1.5">
          {isMultiple ? `Delete ${count} Emails?` : 'Delete Email?'}
        </h3>

        {/* Message */}
        <p className="text-[12.5px] text-[#8e8e93] leading-relaxed mb-5 max-w-[280px]">
          {isMultiple
            ? `Are you sure you want to delete these ${count} emails? They will be removed from Sola and excluded from future syncs.`
            : 'Are you sure you want to delete this email? It will be removed from Sola and excluded from future syncs.'}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2.5 w-full">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] active:bg-white/[0.06] text-[#f5f5f7] text-[13px] font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2 px-3 rounded-xl bg-[#ff453a] hover:bg-[#ff3b30] active:bg-[#e0382e] text-white text-[13px] font-medium shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isDeleting ? 'Deleting...' : isMultiple ? `Delete (${count})` : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
