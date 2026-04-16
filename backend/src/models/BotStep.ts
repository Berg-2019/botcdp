import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  DataType,
  Default
} from "sequelize-typescript";
import BotFlow from "./BotFlow";

@Table
class BotStep extends Model<BotStep> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => BotFlow)
  @Column
  botFlowId: number;

  @BelongsTo(() => BotFlow)
  botFlow: BotFlow;

  @Default(0)
  @Column
  stepOrder: number;

  @Column(DataType.TEXT)
  message: string;

  @Column(DataType.TEXT)
  get options(): { label: string; nextStepId?: number; queueId?: number }[] {
    const raw = this.getDataValue("options") as unknown as string;
    return raw ? JSON.parse(raw) : [];
  }

  set options(value: { label: string; nextStepId?: number; queueId?: number }[]) {
    this.setDataValue("options", JSON.stringify(value) as any);
  }

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default BotStep;
