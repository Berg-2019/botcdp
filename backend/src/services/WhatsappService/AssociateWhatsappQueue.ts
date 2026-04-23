import { Op } from "sequelize";
import Whatsapp from "../../models/Whatsapp";
import Queue from "../../models/Queue";
import AppError from "../../errors/AppError";

const AssociateWhatsappQueue = async (
  whatsapp: Whatsapp,
  queueIds: number[]
): Promise<void> => {
  if (queueIds.length === 0) {
    await whatsapp.$set("queues", []);
    await whatsapp.reload();
    return;
  }

  const otherConnections = await Whatsapp.findAll({
    where: { id: { [Op.ne]: whatsapp.id } },
    include: [{ model: Queue, as: "queues" }]
  });

  const usedQueueIds = new Set<number>();
  otherConnections.forEach((w: Whatsapp) => {
    if (w.queues) {
      w.queues.forEach((q: Queue) => {
        usedQueueIds.add(q.id);
      });
    }
  });

  const duplicates = queueIds.filter(id => usedQueueIds.has(id));
  if (duplicates.length > 0) {
    const allQueues: Queue[] = [];
    otherConnections.forEach((w: Whatsapp) => {
      if (w.queues) {
        w.queues.forEach((q: Queue) => {
          allQueues.push(q);
        });
      }
    });
    const duplicateNames = duplicates.map(id => {
      const queue = allQueues.find(q => q.id === id);
      return queue?.name || `ID ${id}`;
    });
    throw new AppError(
      `Setor(es) já estão associados a outra conexão: ${duplicateNames.join(", ")}`,
      400
    );
  }

  await whatsapp.$set("queues", queueIds);
  await whatsapp.reload();
};

export default AssociateWhatsappQueue;
