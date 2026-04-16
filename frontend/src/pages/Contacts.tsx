import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Phone, Star, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api';
import type { Contact } from '@/types';

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getContacts(search || undefined);
      setContacts(data);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3 safe-top">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Contatos</h1>
          <button onClick={fetchContacts} disabled={loading} className="text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-muted/50 border-0"
          />
        </div>
      </header>

      <div className="flex-1">
        {loading && contacts.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <UserPlus className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Nenhum contato salvo</p>
            <p className="text-xs mt-1">Salve contatos pelo perfil na conversa</p>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/30 transition-colors"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{contact.name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{contact.number}</span>
                </div>
              </div>
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex gap-1">
                  {contact.tags.slice(0, 2).map((tag) => (
                    <span key={tag.id} className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted">
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
              <Star className="h-4 w-4 text-primary/40" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
