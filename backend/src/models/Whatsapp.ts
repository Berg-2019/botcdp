import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull,
  HasMany,
  Unique,
  BelongsToMany
} from "sequelize-typescript";
import Queue from "./Queue";
import Ticket from "./Ticket";
import WhatsappQueue from "./WhatsappQueue";

export const WHATSAPP_VALID_STATUSES = [
  "OPENING",
  "qrcode",
  "CONNECTED",
  "TIMEOUT",
  "DISCONNECTED",
  "PAIRING"
] as const;

export type WhatsappStatus = (typeof WHATSAPP_VALID_STATUSES)[number];

@Table
class Whatsapp extends Model<Whatsapp> {
  static VALID_STATUSES = WHATSAPP_VALID_STATUSES;

  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull
  @Unique
  @Column(DataType.TEXT)
  name: string;

  @Column(DataType.TEXT)
  session: string;

  @Column(DataType.TEXT)
  qrcode: string;

  @Column
  status: string;

  @Column
  battery: string;

  @Column
  plugged: boolean;

  @Column
  retries: number;

  @Column(DataType.TEXT)
  greetingMessage: string;

  @Column(DataType.TEXT)
  farewellMessage: string;

  @Default(false)
  @AllowNull
  @Column
  isDefault: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @BelongsToMany(() => Queue, () => WhatsappQueue)
  queues: Array<Queue & { WhatsappQueue: WhatsappQueue }>;

  @HasMany(() => WhatsappQueue)
  whatsappQueues: WhatsappQueue[];
}

export default Whatsapp;
