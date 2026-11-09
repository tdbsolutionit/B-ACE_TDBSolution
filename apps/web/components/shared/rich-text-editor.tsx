'use client';

import { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, RotateCcw, RotateCw } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = 'Nhập nội dung...' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleCommand = (command: string) => {
    document.execCommand(command, false, undefined);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="border border-slate-300 rounded-md overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-300 bg-slate-50 p-2 text-slate-600">
        <button type="button" onClick={() => handleCommand('undo')} className="p-1.5 hover:bg-slate-200 rounded"><RotateCcw size={16} /></button>
        <button type="button" onClick={() => handleCommand('redo')} className="p-1.5 hover:bg-slate-200 rounded"><RotateCw size={16} /></button>
        <div className="w-px h-4 bg-slate-300 mx-1"></div>
        <button type="button" onClick={() => handleCommand('bold')} className="p-1.5 font-bold hover:bg-slate-200 rounded"><Bold size={16} /></button>
        <button type="button" onClick={() => handleCommand('italic')} className="p-1.5 italic hover:bg-slate-200 rounded"><Italic size={16} /></button>
        <button type="button" onClick={() => handleCommand('underline')} className="p-1.5 underline hover:bg-slate-200 rounded"><Underline size={16} /></button>
        <div className="w-px h-4 bg-slate-300 mx-1"></div>
        <button type="button" onClick={() => handleCommand('justifyLeft')} className="p-1.5 hover:bg-slate-200 rounded"><AlignLeft size={16} /></button>
        <button type="button" onClick={() => handleCommand('justifyCenter')} className="p-1.5 hover:bg-slate-200 rounded"><AlignCenter size={16} /></button>
        <button type="button" onClick={() => handleCommand('justifyRight')} className="p-1.5 hover:bg-slate-200 rounded"><AlignRight size={16} /></button>
        <button type="button" onClick={() => handleCommand('insertUnorderedList')} className="p-1.5 hover:bg-slate-200 rounded"><List size={16} /></button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="min-h-[120px] w-full p-4 text-sm outline-none overflow-y-auto"
        data-placeholder={placeholder}
      />
      <style jsx>{`
        [contentEditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block;
        }
      `}</style>
    </div>
  );
}