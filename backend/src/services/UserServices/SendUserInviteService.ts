import Whatsapp from "../../models/Whatsapp";
import { whatsappProvider } from "../../providers/WhatsApp/whatsappProvider";
import normalizePhone from "../../helpers/NormalizePhone";

interface Request {
  phone: string;
  name: string;
  resetLink: string;
}

// Envia o link de definição de senha por WhatsApp para o número do novo
// usuário, usando a primeira conexão CONNECTED disponível (preferindo a
// conexão marcada como padrão).
const SendUserInviteService = async ({
  phone,
  name,
  resetLink
}: Request): Promise<void> => {
  const whatsapp =
    (await Whatsapp.findOne({ where: { status: "CONNECTED", isDefault: true } })) ||
    (await Whatsapp.findOne({ where: { status: "CONNECTED" } }));

  if (!whatsapp) {
    throw new Error(
      "Nenhuma conexão WhatsApp ativa para enviar o convite de acesso."
    );
  }

  const body =
    `Olá, ${name}! Você foi cadastrado(a) no painel de atendimento. 🎉\n\n` +
    `Para definir sua senha de acesso, abra o link abaixo:\n${resetLink}\n\n` +
    `O link expira em 24 horas.`;

  // Valida que o número existe no WhatsApp antes de enviar — sem isso, um
  // número inválido (ex.: sem DDI) faz o provider "aceitar" o envio e
  // reportar sucesso mesmo que a mensagem nunca chegue a ninguém.
  let jid: string;
  try {
    jid = await whatsappProvider.checkNumber(whatsapp.id, normalizePhone(phone));
  } catch {
    throw new Error(
      "O número informado não foi encontrado no WhatsApp. Confira o DDD e o DDI (ex.: 55)."
    );
  }

  await whatsappProvider.sendMessage(whatsapp.id, jid, body);
};

export default SendUserInviteService;
