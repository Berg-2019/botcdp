import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Unique,
  BelongsToMany
} from "sequelize-typescript";
import User from "./User";
import UserQueue from "./UserQueue";

import Whatsapp from "./Whatsapp";
import WhatsappQueue from "./WhatsappQueue";

@Table
class Queue extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @AllowNull(false)
  @Unique
  @Column
  color: string;

  @Column(DataType.TEXT)
  greetingMessage: string | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsToMany(() => Whatsapp, () => WhatsappQueue)
  whatsapps: Array<Whatsapp & { WhatsappQueue: WhatsappQueue }>;

  @BelongsToMany(() => User, () => UserQueue)
  users: Array<User & { UserQueue: UserQueue }>;
}

export default Queue;
