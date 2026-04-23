import Ticket from "../models/Ticket";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";

const UpdateDeletedUserOpenTicketsStatus = async (
  tickets: Ticket[]
): Promise<void> => {
  await Promise.all(
    tickets.map(async t => {
      const ticketId = t.id.toString();

      await UpdateTicketService({
        ticketData: { status: "pending" },
        ticketId
      });
    })
  );
};

export default UpdateDeletedUserOpenTicketsStatus;
