import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";

const ListAvailableQueuesService = async (): Promise<Queue[]> => {
  const allQueues = await Queue.findAll({ order: [["name", "ASC"]] });

  const whatsapps = await Whatsapp.findAll({
    include: [{ model: Queue, as: "queues" }]
  });

  const usedQueueIds = new Set<number>();
  whatsapps.forEach((w: Whatsapp) => {
    if (w.queues) {
      w.queues.forEach((q: Queue) => {
        usedQueueIds.add(q.id);
      });
    }
  });

  return allQueues.filter(q => !usedQueueIds.has(q.id));
};

export default ListAvailableQueuesService;
