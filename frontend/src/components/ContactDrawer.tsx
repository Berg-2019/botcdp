import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Ticket, Queue } from '@/types';
import { api } from '@/services/api';
import { Phone, Tag, ArrowRightLeft, CheckCircle2, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  ticket: Ticket | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ContactDrawer({ ticket, open, onClose, onUpdate }: Props) {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueue, setSelectedQueue] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      api.getQueues().then(setQueues).catch(() => {});
      // Check if contact is already saved
      api.getContacts().then((contacts) => {
        const isSaved = contacts.some((c) => c.id === ticket?.contact.id);
        setSaved(isSaved);
      }).catch(() => {});
    }
  }, [open, ticket?.contact.id]);

  const handleSaveContact = async () => {
    if (!ticket || saving) return;
    setSaving(true);
    try {
      await api.saveContact(ticket.contact.id);
      setSaved(true);
      toast({ title: 'Contato salvo!', description: `${ticket.contact.name} adicionado aos seus contatos.` });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar o contato.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!ticket) return null;

  const handleTransfer = async () => {
    if (!selectedQueue) return;
    setTransferring(true);
    try {
      await api.transferTicket(ticket.id, Number(selectedQueue));
      onUpdate();
      onClose();
    } catch { } finally {
      setTransferring(false);
    }
  };

  const handleClose = async () => {
    try {
      await api.updateTicket(ticket.id, { status: 'closed' });
      onUpdate();
      onClose();
    } catch { }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Contato</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {/* Contact info */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
              {ticket.contact.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="font-semibold">{ticket.contact.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {ticket.contact.number}
            </div>
          </div>

          {/* Tags */}
          {ticket.contact.tags && ticket.contact.tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Tag className="h-3 w-3" /> Tags</p>
              <div className="flex flex-wrap gap-1">
                {ticket.contact.tags.map((t) => (
                  <span key={t.id} className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted">{t.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Transfer */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><ArrowRightLeft className="h-3 w-3" /> Transferir</p>
            <Select value={selectedQueue} onValueChange={setSelectedQueue}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
              <SelectContent>
                {queues.map((q) => <SelectItem key={q.id} value={String(q.id)}>{q.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="w-full" onClick={handleTransfer} disabled={!selectedQueue || transferring}>
              Transferir Ticket
            </Button>
          </div>

          {/* Save contact */}
          <Button
            variant={saved ? "secondary" : "outline"}
            size="sm"
            className="w-full"
            onClick={handleSaveContact}
            disabled={saving || saved}
          >
            {saved ? <BookmarkCheck className="h-4 w-4 mr-1" /> : <BookmarkPlus className="h-4 w-4 mr-1" />}
            {saved ? 'Contato Salvo' : 'Salvar Contato'}
          </Button>

          {/* Close ticket */}
          <Button variant="outline" size="sm" className="w-full" onClick={handleClose}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Resolver Ticket
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
