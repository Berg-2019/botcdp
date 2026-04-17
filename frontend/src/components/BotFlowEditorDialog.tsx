import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/services/api';
import { getReadableErrorMessage } from '@/utils/errorHandler';
import type { BotFlow, Queue } from '@/types';

// --------------------------------------------------------------------
// BotFlowEditorDialog
// --------------------------------------------------------------------
// Dialog responsável por criar ou editar um fluxo de bot (BotFlow) e
// suas etapas (BotSteps). Usado na aba "Bot" do DeveloperPanel.
//
// Estratégia de referência entre steps:
// - Internamente, o estado usa índices (stepIndex) para relacionar uma
//   `option` com o próximo step do mesmo fluxo. Isso permite editar,
//   reordenar, adicionar e remover steps sem precisar se preocupar com
//   IDs do banco.
// - Ao carregar um fluxo existente, convertemos os `nextStepId` reais
//   (vindos do backend) para `nextStepIndex` olhando a posição do step
//   alvo no array.
// - Ao salvar, enviamos `nextStepIndex` no payload; o BotFlowController
//   resolve esses índices para `nextStepId` reais após recriar os
//   steps no banco.
// --------------------------------------------------------------------

// Tipo de ação que uma opção do menu pode executar.
// - 'next'     : avança para outro step dentro do mesmo fluxo
// - 'queue'    : transfere o ticket para outra fila (encerra o fluxo)
// - 'end'      : finaliza o fluxo sem transferir (libera para humano)
type OptionAction = 'next' | 'queue' | 'end';

interface DraftOption {
  label: string;
  action: OptionAction;
  nextStepIndex?: number;
  queueId?: number;
}

interface DraftStep {
  // ID real no banco (presente apenas em steps carregados de fluxos
  // existentes). Não é usado ao enviar — o backend recria os steps.
  id?: number;
  message: string;
  options: DraftOption[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Fluxo a ser editado. Se `null`, estamos criando um novo.
  flow: BotFlow | null;
  queues: Queue[];
  // Callback disparado após salvar com sucesso, recebe o fluxo atualizado
  // (útil para o componente pai atualizar sua lista local).
  onSaved: (savedFlow: BotFlow) => void;
}

// Converte o BotFlow vindo da API para o formato de rascunho interno.
// Os `nextStepId` (IDs reais do banco) viram `nextStepIndex` (posição
// no array de steps) para facilitar edição.
function flowToDraft(flow: BotFlow): {
  name: string;
  queueId: number | null;
  enabled: boolean;
  steps: DraftStep[];
} {
  // Mapa stepId -> índice no array (para resolver referências).
  const idToIndex = new Map<number, number>();
  flow.steps.forEach((s, i) => idToIndex.set(s.id, i));

  const steps: DraftStep[] = flow.steps.map((s) => ({
    id: s.id,
    message: s.message,
    options: (s.options || []).map<DraftOption>((o) => {
      // Uma option tem queueId → ação 'queue'
      if (typeof o.queueId === 'number') {
        return { label: o.label, action: 'queue', queueId: o.queueId };
      }
      // nextStepId aponta para um step do mesmo fluxo → ação 'next'
      if (typeof o.nextStepId === 'number' && idToIndex.has(o.nextStepId)) {
        return {
          label: o.label,
          action: 'next',
          nextStepIndex: idToIndex.get(o.nextStepId)!,
        };
      }
      // Sem destino definido → encerra o fluxo
      return { label: o.label, action: 'end' };
    }),
  }));

  return {
    name: flow.name,
    queueId: flow.queueId,
    enabled: flow.enabled,
    steps,
  };
}

// Estado inicial para um novo fluxo (sem steps).
const emptyDraft = () => ({
  name: '',
  queueId: null as number | null,
  enabled: true,
  steps: [] as DraftStep[],
});

export function BotFlowEditorDialog({ open, onOpenChange, flow, queues, onSaved }: Props) {
  // Estado do formulário (rascunho local enquanto o usuário edita).
  const [name, setName] = useState('');
  const [queueId, setQueueId] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [saving, setSaving] = useState(false);

  // Toda vez que o dialog abrir/fechar ou o fluxo alvo mudar, resetamos
  // o rascunho: se é edição, preenche com os dados do fluxo; se é novo,
  // limpa tudo.
  useEffect(() => {
    if (!open) return;

    if (flow) {
      const draft = flowToDraft(flow);
      setName(draft.name);
      setQueueId(draft.queueId);
      setEnabled(draft.enabled);
      setSteps(draft.steps);
    } else {
      const draft = emptyDraft();
      setName(draft.name);
      setQueueId(draft.queueId);
      setEnabled(draft.enabled);
      setSteps(draft.steps);
    }
  }, [open, flow]);

  // Adiciona um step vazio ao final da lista.
  const addStep = () => {
    setSteps((prev) => [...prev, { message: '', options: [] }]);
  };

  // Remove um step. Também limpa referências de outras options que
  // apontavam para ele (viram 'end') e ajusta os índices das que
  // apontavam para steps posteriores.
  const removeStep = (index: number) => {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((s) => ({
        ...s,
        options: s.options.map((o) => {
          if (o.action !== 'next' || o.nextStepIndex === undefined) return o;
          if (o.nextStepIndex === index) {
            return { label: o.label, action: 'end' };
          }
          if (o.nextStepIndex > index) {
            return { ...o, nextStepIndex: o.nextStepIndex - 1 };
          }
          return o;
        }),
      }));
    });
  };

  // Move um step para cima/baixo e ajusta as referências de todas as
  // options que apontavam para os steps que trocaram de posição.
  const moveStep = (index: number, delta: -1 | 1) => {
    setSteps((prev) => {
      const to = index + delta;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];

      return next.map((s) => ({
        ...s,
        options: s.options.map((o) => {
          if (o.action !== 'next' || o.nextStepIndex === undefined) return o;
          if (o.nextStepIndex === index) return { ...o, nextStepIndex: to };
          if (o.nextStepIndex === to) return { ...o, nextStepIndex: index };
          return o;
        }),
      }));
    });
  };

  // Atualiza o texto da mensagem de um step.
  const updateStepMessage = (index: number, message: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, message } : s)));
  };

  // Adiciona uma option (por padrão, ação 'end') a um step.
  const addOption = (stepIndex: number) => {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === stepIndex ? { ...s, options: [...s.options, { label: '', action: 'end' }] } : s,
      ),
    );
  };

  // Remove uma option de um step.
  const removeOption = (stepIndex: number, optionIndex: number) => {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === stepIndex ? { ...s, options: s.options.filter((_, oi) => oi !== optionIndex) } : s,
      ),
    );
  };

  // Atualiza campos de uma option específica, preservando o restante.
  const updateOption = (
    stepIndex: number,
    optionIndex: number,
    patch: Partial<DraftOption>,
  ) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== stepIndex) return s;
        return {
          ...s,
          options: s.options.map((o, oi) => (oi === optionIndex ? { ...o, ...patch } : o)),
        };
      }),
    );
  };

  // Lista de opções válidas para selecionar como "próximo step" (todos
  // os steps, exceto o próprio, para evitar loops triviais — embora um
  // fluxo possa legitimamente voltar em outros cenários, optamos por
  // restringir nesta primeira versão).
  const otherStepChoices = (currentIndex: number) =>
    steps
      .map((s, i) => ({ index: i, label: s.message || `Etapa ${i + 1}` }))
      .filter((s) => s.index !== currentIndex);

  // Validação mínima antes de enviar ao backend.
  const validationError = useMemo(() => {
    if (!name.trim()) return 'Dê um nome ao fluxo.';
    if (!queueId) return 'Escolha a fila associada ao fluxo.';
    if (steps.length === 0) return 'Adicione ao menos uma etapa ao fluxo.';
    for (let i = 0; i < steps.length; i += 1) {
      if (!steps[i].message.trim()) return `A etapa ${i + 1} precisa de uma mensagem.`;
      for (let j = 0; j < steps[i].options.length; j += 1) {
        const opt = steps[i].options[j];
        if (!opt.label.trim()) {
          return `A opção ${j + 1} da etapa ${i + 1} precisa de um rótulo.`;
        }
        if (opt.action === 'next' && opt.nextStepIndex === undefined) {
          return `Selecione o próximo passo da opção ${j + 1} (etapa ${i + 1}).`;
        }
        if (opt.action === 'queue' && !opt.queueId) {
          return `Selecione a fila de destino da opção ${j + 1} (etapa ${i + 1}).`;
        }
      }
    }
    return null;
  }, [name, queueId, steps]);

  // Converte o rascunho interno para o payload esperado pela API.
  // Options com action='end' não recebem nextStepId nem queueId — o
  // backend trata isso como fim de fluxo.
  const buildPayload = () => ({
    name: name.trim(),
    queueId: queueId!,
    enabled,
    steps: steps.map((s) => ({
      message: s.message,
      options: s.options.map((o) => {
        const out: {
          label: string;
          nextStepIndex?: number;
          queueId?: number;
        } = { label: o.label };
        if (o.action === 'next' && o.nextStepIndex !== undefined) {
          out.nextStepIndex = o.nextStepIndex;
        }
        if (o.action === 'queue' && o.queueId) {
          out.queueId = o.queueId;
        }
        return out;
      }),
    })),
  });

  // Salva via API. Em edição usa PUT; em criação, POST.
  const handleSave = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      const saved = flow
        ? await api.updateBotFlow(flow.id, payload)
        : await api.createBotFlow(payload);
      toast.success(flow ? 'Fluxo atualizado.' : 'Fluxo criado.');
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(getReadableErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{flow ? 'Editar Fluxo' : 'Novo Fluxo'}</DialogTitle>
          <DialogDescription>
            Configure as etapas de triagem que o bot seguirá antes de passar para um atendente humano.
          </DialogDescription>
        </DialogHeader>

        {/* --- Dados básicos do fluxo --- */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome do fluxo</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Triagem do Suporte"
              className="rounded-xl mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Fila (setor) associada</label>
            <Select
              value={queueId ? String(queueId) : ''}
              onValueChange={(v) => setQueueId(Number(v))}
            >
              <SelectTrigger className="rounded-xl mt-1">
                <SelectValue placeholder="Selecione uma fila" />
              </SelectTrigger>
              <SelectContent>
                {queues.map((q) => (
                  <SelectItem key={q.id} value={String(q.id)}>
                    {q.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              O fluxo roda automaticamente quando um ticket é atribuído a esta fila.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Ativo</p>
              <p className="text-xs text-muted-foreground">
                Somente fluxos ativos são executados pelo bot.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        {/* --- Lista de etapas (steps) --- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Etapas</h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl h-8 text-xs"
              onClick={addStep}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar etapa
            </Button>
          </div>

          {steps.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhuma etapa ainda. Clique em "Adicionar etapa" para começar.
            </p>
          )}

          {steps.map((step, i) => (
            <div key={i} className="rounded-2xl border p-3 space-y-3 bg-muted/30">
              {/* Cabeçalho da etapa: número + ações de mover/remover */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Etapa {i + 1}</p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => moveStep(i, -1)}
                    disabled={i === 0}
                    title="Mover para cima"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => moveStep(i, 1)}
                    disabled={i === steps.length - 1}
                    title="Mover para baixo"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeStep(i)}
                    title="Remover etapa"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Mensagem enviada ao cliente nesta etapa */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Mensagem/pergunta enviada ao cliente
                </label>
                <Textarea
                  value={step.message}
                  onChange={(e) => updateStepMessage(i, e.target.value)}
                  placeholder="Ex.: Qual é o motivo do seu contato?"
                  className="mt-1 text-sm min-h-[60px] rounded-xl"
                />
              </div>

              {/* Lista de opções que o cliente pode escolher */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">
                    Opções de resposta ({step.options.length})
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => addOption(i)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Opção
                  </Button>
                </div>

                {step.options.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Sem opções: essa etapa finaliza o fluxo e libera o ticket para atendente humano.
                  </p>
                )}

                {step.options.map((opt, oi) => (
                  <div key={oi} className="rounded-xl border bg-card p-2 space-y-2">
                    <div className="flex gap-2 items-start">
                      {/* Rótulo que aparece para o cliente */}
                      <Input
                        value={opt.label}
                        onChange={(e) => updateOption(i, oi, { label: e.target.value })}
                        placeholder={`Rótulo da opção ${oi + 1}`}
                        className="rounded-xl text-sm"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-destructive shrink-0"
                        onClick={() => removeOption(i, oi)}
                        title="Remover opção"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Ação: qual caminho seguir quando essa opção é escolhida */}
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={opt.action}
                        onValueChange={(v) =>
                          updateOption(i, oi, {
                            action: v as OptionAction,
                            nextStepIndex: undefined,
                            queueId: undefined,
                          })
                        }
                      >
                        <SelectTrigger className="rounded-xl text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="next">Ir para outra etapa</SelectItem>
                          <SelectItem value="queue">Transferir de fila</SelectItem>
                          <SelectItem value="end">Encerrar (humano assume)</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Destino varia conforme a ação escolhida */}
                      {opt.action === 'next' && (
                        <Select
                          value={opt.nextStepIndex !== undefined ? String(opt.nextStepIndex) : ''}
                          onValueChange={(v) =>
                            updateOption(i, oi, { nextStepIndex: Number(v) })
                          }
                        >
                          <SelectTrigger className="rounded-xl text-xs h-9">
                            <SelectValue placeholder="Qual etapa?" />
                          </SelectTrigger>
                          <SelectContent>
                            {otherStepChoices(i).map((c) => (
                              <SelectItem key={c.index} value={String(c.index)}>
                                Etapa {c.index + 1}
                                {c.label ? ` — ${c.label.slice(0, 30)}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {opt.action === 'queue' && (
                        <Select
                          value={opt.queueId ? String(opt.queueId) : ''}
                          onValueChange={(v) => updateOption(i, oi, { queueId: Number(v) })}
                        >
                          <SelectTrigger className="rounded-xl text-xs h-9">
                            <SelectValue placeholder="Qual fila?" />
                          </SelectTrigger>
                          <SelectContent>
                            {queues.map((q) => (
                              <SelectItem key={q.id} value={String(q.id)}>
                                {q.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {opt.action === 'end' && (
                        <div className="text-xs text-muted-foreground self-center">
                          Libera para humano.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* --- Rodapé com ações --- */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {saving ? 'Salvando...' : flow ? 'Salvar alterações' : 'Criar fluxo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BotFlowEditorDialog;
