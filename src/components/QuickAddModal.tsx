import React, { useState } from 'react';
import { X, Sparkles, Plus, Link2 } from 'lucide-react';
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
  const [isAutoTagging, setIsAutoTagging] = useState(false);

  if (!isOpen) return null;

  const handleAutoFill = () => {
    if (!url) return;
    setIsAutoTagging(true);

    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const domain = parsed.hostname.replace('www.', '');
      const pathSegment = parsed.pathname.split('/').filter(Boolean).pop() || '';
      const fallbackTitle = pathSegment ? `${pathSegment} - ${domain}` : domain;

      if (!title) setTitle(fallbackTitle);

      const generatedTags = [domain.split('.')[0]];
      if (domain.includes('github')) generatedTags.push('code', 'open-source');
      if (domain.includes('docs') || url.includes('doc')) generatedTags.push('documentation');
      if (!tagsInput) setTagsInput(generatedTags.join(', '));
      if (!description) setDescription(`Captured resource from ${domain}. Indexed into local FTS5 SQLite table.`);
    } catch {
      // invalid url
    } finally {
      setIsAutoTagging(false);
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
      ai_notes: `Auto-indexed via Quick Capture. Key domain: ${new URL(url.startsWith('http') ? url : `https://${url}`).hostname}`,
    });

    setUrl('');
    setTitle('');
    setDescription('');
    setTagsInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141820] border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-semibold text-neutral-100">Quick Capture URL (⌘⇧S)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-md hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={handleAutoFill}
                placeholder="https://github.com/..."
                className="flex-1 bg-[#0e1116] border border-white/10 rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 font-mono"
                required
              />
              <button
                type="button"
                onClick={handleAutoFill}
                className="px-2.5 py-1.5 text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-300 flex items-center gap-1"
                title="Simulate Gemini AI Auto-Tagging"
              >
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>Auto-Tag</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descriptive title"
              className="w-full bg-[#0e1116] border border-white/10 rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. react, performance, rust"
              className="w-full bg-[#0e1116] border border-white/10 rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              Notes / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary notes..."
              className="w-full bg-[#0e1116] border border-white/10 rounded-md px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/8">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded-md hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save to SQLite</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
