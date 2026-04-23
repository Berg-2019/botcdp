import Queue from "../../models/Queue";
import Whatsapp, { WHATSAPP_VALID_STATUSES } from "../../models/Whatsapp";

const ListWhatsAppsService = async (): Promise<Whatsapp[]> => {
  const whatsapps = await Whatsapp.findAll({
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name", "color", "greetingMessage"]
      }
    ]
  });

  for (const wa of whatsapps) {
    if (!WHATSAPP_VALID_STATUSES.includes(wa.status as any)) {
      wa.status = "DISCONNECTED";
    }
  }

  return whatsapps;
};

export default ListWhatsAppsService;
