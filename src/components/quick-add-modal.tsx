import React, { useState } from 'react';
import type { Bookmark } from '../types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (bookmark: Omit<Bookmark, 'id' | 'created_at'>) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  if (!isOpen) return null;

  const handleUrlBlur = () => {
    if (!url.trim()) return;
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const domain = parsed.hostname.replace('www.', '');
      const path = parsed.pathname.split('/').filter(Boolean).pop() || '';
      if (!title) setTitle(path ? `${path} — ${domain}` : domain);
      if (!tagsInput) {
        const t = [domain.split('.')[0]];
        if (domain.includes('github')) t.push('code');
        setTagsInput(t.join(', '));
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    onAdd({
      url: url.trim(),
      title: title.trim() || url.trim(),
      description: description.trim(),
      tags,
    });

    setUrl('');
    setTitle('');
    setDescription('');
    setTagsInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#242426] border border-white/10 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-[#f5f5f7]">
          Add Bookmark
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium text-[#86868b] mb-1">
              URL
            </label>
            <input
              type="text"
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://"
              className="w-full bg-[#1c1c1e] border border-white/10 rounded-md px-2.5 py-1.5 text-[13px] text-[#f5f5f7] focus:outline-none focus:ring-1 focus:ring-[#0a84ff]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#86868b] mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-[#1c1c1e] border border-white/10 rounded-md px-2.5 py-1.5 text-[13px] text-[#f5f5f7] focus:outline-none focus:ring-1 focus:ring-[#0a84ff]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#86868b] mb-1">
              Tags
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Separated by comma"
              className="w-full bg-[#1c1c1e] border border-white/10 rounded-md px-2.5 py-1.5 text-[13px] text-[#f5f5f7] focus:outline-none focus:ring-1 focus:ring-[#0a84ff]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#86868b] mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
              className="w-full bg-[#1c1c1e] border border-white/10 rounded-md px-2.5 py-1.5 text-[13px] text-[#f5f5f7] focus:outline-none focus:ring-1 focus:ring-[#0a84ff] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-[12px] text-[#86868b] hover:text-[#f5f5f7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-[12px] bg-[#0a84ff] hover:bg-[#0077ed] text-white font-medium rounded-md transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
