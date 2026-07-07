import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  BeforeCreate,
  BeforeUpdate,
  PrimaryKey,
  AutoIncrement,
  Default,
  HasMany,
  BelongsToMany,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import { hash, compare } from "bcryptjs";
import Ticket from "./Ticket";
import Queue from "./Queue";
import UserQueue from "./UserQueue";
import Whatsapp from "./Whatsapp";

@Table
class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column(DataType.STRING)
  email: string | null;

  // Identificador de login (número de WhatsApp, formato 55XXXXXXXXXXX).
  // Substitui email como campo de login para contas criadas pelo fluxo
  // de convite via WhatsApp.
  @Column(DataType.STRING(20))
  phone: string | null;

  @Default(false)
  @Column
  mustChangePassword: boolean;

  @Column(DataType.VIRTUAL)
  password: string;

  @Column
  passwordHash: string;

  @Default(0)
  @Column
  tokenVersion: number;

  @Default(0)
  @Column
  loginAttempts: number;

  @Default("admin")
  @Column
  profile: string;

  @ForeignKey(() => Whatsapp)
  @Column(DataType.INTEGER)
  whatsappId: number | null;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @BelongsToMany(() => Queue, () => UserQueue)
  queues: Queue[];

  @BeforeUpdate
  @BeforeCreate
  static hashPassword = async (instance: User): Promise<void> => {
    if (instance.password) {
      instance.passwordHash = await hash(instance.password, 12);
    }
  };

  public checkPassword = async (password: string): Promise<boolean> => {
    return compare(password, this.getDataValue("passwordHash"));
  };
}

export default User;
