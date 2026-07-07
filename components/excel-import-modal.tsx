'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/auth-context';

interface ParsedRow {
  customerName: string;
  phone: string;
}

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export function ExcelImportModal({ onClose, onImported }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [nameCol, setNameCol] = useState('');
  const [phoneCol, setPhoneCol] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');

  const handleFile = (file: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        if (!json.length) { setError('Файл пустой'); return; }
        const cols = Object.keys(json[0]);
        setHeaders(cols);
        setRawData(json);
        // Auto-detect columns
        const nameGuess = cols.find((c) => /имя|name|клиент|фио|контакт/i.test(c)) ?? cols[0] ?? '';
        const phoneGuess = cols.find((c) => /тел|phone|номер|моб/i.test(c)) ?? cols[1] ?? '';
        setNameCol(nameGuess);
        setPhoneCol(phoneGuess);
        setStep('map');
      } catch {
        setError('Не удалось прочитать файл');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const buildPreview = () => {
    if (!nameCol || !phoneCol) { setError('Выбери колонки'); return; }
    const parsed: ParsedRow[] = rawData
      .map((row) => ({ customerName: String(row[nameCol] ?? '').trim(), phone: String(row[phoneCol] ?? '').trim() }))
      .filter((r) => r.customerName);
    if (!parsed.length) { setError('Нет данных в выбранных колонках'); return; }
    setRows(parsed);
    setError('');
    setStep('preview');
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');
    const payload = rows.map((r) => ({
      lead_code: `L-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customer_name: r.customerName,
      phone: r.phone,
      email: '',
      status: 'new',
      sla_status: 'green',
      source_id: 1,
      assigned_to: user?.id ?? null,
    }));

    const { error: insertError } = await supabase.from('leads').insert(payload);
    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    setSuccess(`Импортировано ${rows.length} лидов`);
    setTimeout(() => { onImported(); onClose(); }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[24px] p-7 space-y-5"
        style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-white" style={{ letterSpacing: '-0.03em' }}>Импорт из Excel</h2>
            <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              {step === 'upload' ? 'Загрузи файл .xlsx или .csv' : step === 'map' ? 'Укажи какие колонки использовать' : `${rows.length} лидов готово к импорту`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-[10px] p-2 hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div
            className="flex flex-col items-center justify-center rounded-[18px] py-12 cursor-pointer transition-colors"
            style={{ border: '2px dashed rgba(216,176,106,0.30)', background: 'rgba(216,176,106,0.04)' }}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
          >
            <div className="text-4xl mb-3">📊</div>
            <p className="text-[15px] font-medium text-white">Перетащи файл сюда</p>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>или нажми чтобы выбрать</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {/* Step: Map columns */}
        {step === 'map' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                Колонка с именем клиента
              </label>
              <select
                value={nameCol}
                onChange={(e) => setNameCol(e.target.value)}
                className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                {headers.map((h) => <option key={h} value={h} className="bg-[#1c1c1e]">{h}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                Колонка с телефоном
              </label>
              <select
                value={phoneCol}
                onChange={(e) => setPhoneCol(e.target.value)}
                className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                {headers.map((h) => <option key={h} value={h} className="bg-[#1c1c1e]">{h}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setStep('upload')} className="flex-1 rounded-[14px] py-3 text-[14px] font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>Назад</button>
              <button onClick={buildPreview} className="flex-1 rounded-[14px] py-3 text-[14px] font-semibold" style={{ background: 'linear-gradient(135deg, #d8b06a, #f1cd7f)', color: '#000' }}>Далее</button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto rounded-[14px]" style={{ border: '1px solid var(--bg-subtle)' }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bg-subtle)', background: 'var(--bg-hover)' }}>
                    <th className="px-4 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Имя</th>
                    <th className="px-4 py-2 text-left font-medium" style={{ color: 'var(--text-tertiary)' }}>Телефон</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--bg-subtle)' }}>
                      <td className="px-4 py-2 text-white">{r.customerName}</td>
                      <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>{r.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <p className="px-4 py-2 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>... и ещё {rows.length - 10} строк</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('map')} className="flex-1 rounded-[14px] py-3 text-[14px] font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>Назад</button>
              <button onClick={handleImport} disabled={loading} className="flex-1 rounded-[14px] py-3 text-[14px] font-semibold disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #d8b06a, #f1cd7f)', color: '#000' }}>
                {loading ? 'Загрузка...' : `Импортировать ${rows.length}`}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-[13px] text-[#ff453a]">{error}</p>}
        {success && <p className="text-[13px] text-[#30d158]">{success}</p>}
      </div>
    </div>
  );
}
