import { useState, useEffect } from 'react';
import { Search, X, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { QuickAnswer } from '@/types';
import { api } from '@/services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (text: string) => void;
}

export function QuickReplyPicker({ open, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [answers, setAnswers] = useState<QuickAnswer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.getQuickAnswers(search).then(setAnswers).catch(() => {}).finally(() => setLoading(false));
  }, [open, search]);

  if (!open) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-10 mb-1 mx-2 max-h-72 overflow-hidden rounded-xl border bg-card shadow-lg">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Respostas Rápidas</span>
        <button onClick={onClose} className="ml-auto text-muted-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      <div className="overflow-y-auto max-h-48">
        {loading ? (
          <p className="p-4 text-center text-xs text-muted-foreground">Carregando...</p>
        ) : answers.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">Nenhuma resposta encontrada</p>
        ) : (
          answers.map((a) => (
            <button
              key={a.id}
              onClick={() => { onSelect(a.message); onClose(); }}
              className="w-full border-b px-3 py-2 text-left hover:bg-muted/50 active:bg-muted transition-colors"
            >
              <span className="text-xs font-semibold text-primary">/{a.shortcut}</span>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.message}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
