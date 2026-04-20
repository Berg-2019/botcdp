import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  HasMany,
  AutoIncrement,
  Default,
  DataType
} from "sequelize-typescript";

import Contact from "./Contact";
import Message from "./Message";
import Queue from "./Queue";
import User from "./User";
import Whatsapp from "./Whatsapp";
import BotFlow from "./BotFlow";
import BotStep from "./BotStep";

@Table
class Ticket extends Model<Ticket> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column({ defaultValue: "pending" })
  status: string;

  @Column
  unreadMessages: number;

  @Column
  lastMessage: string;

  @Default(false)
  @Column
  isGroup: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  // --- Estado do fluxo de bot associado a este ticket ---
  // botFlowId: fluxo em execução (null = nenhum fluxo ativo).
  // botStepId: etapa atual dentro do fluxo (null = fluxo não iniciado).
  // botInvalidAttempts: contador usado para desistir quando o cliente
  // responde algo que não bate em nenhuma opção do step atual.
  // Ver backend/src/services/WbotServices/ExecuteBotFlowService.ts.
  //
  // Nota: como os tipos podem ser null, sequelize-typescript não
  // consegue inferir o DataType automaticamente via reflect-metadata —
  // por isso declaramos DataType.INTEGER explicitamente.
  @ForeignKey(() => BotFlow)
  @Column(DataType.INTEGER)
  botFlowId: number | null;

  @BelongsTo(() => BotFlow)
  botFlow: BotFlow;

  @ForeignKey(() => BotStep)
  @Column(DataType.INTEGER)
  botStepId: number | null;

  @BelongsTo(() => BotStep)
  botStep: BotStep;

  @Default(0)
  @Column(DataType.INTEGER)
  botInvalidAttempts: number;

  @HasMany(() => Message)
  messages: Message[];
}

export default Ticket;
