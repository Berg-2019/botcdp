// Normaliza um número de telefone para o mesmo formato usado nos contatos
// do WhatsApp (somente dígitos, ex.: "5511999999999").
//
// Números com 10 ou 11 dígitos (DDD + telefone, sem o DDI) são tratados como
// brasileiros e recebem o prefixo "55" — sem isso o número vira um JID
// inválido no WhatsApp (ex.: "69981248816" em vez de "5569981248816"), o que
// faz o envio "funcionar" no provider sem a mensagem nunca chegar a ninguém.
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    return `55${digits}`;
  }
  return digits;
};

export default normalizePhone;
