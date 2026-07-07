import * as Yup from "yup";
import crypto from "crypto";

import AppError from "../../errors/AppError";
import { SerializeUser } from "../../helpers/SerializeUser";
import { generatePasswordResetToken } from "../../helpers/GeneratePasswordResetToken";
import normalizePhone from "../../helpers/NormalizePhone";
import User from "../../models/User";

/**
 * Interface que define os dados necessários para criar um novo usuário
 */
interface Request {
  email?: string;              // Email do usuário (legado; opcional se phone for fornecido)
  phone?: string;              // Número de WhatsApp do usuário (identificador de login atual)
  password?: string;          // Senha (opcional se for criação por admin)
  name: string;               // Nome do usuário (obrigatório)
  queueIds?: number[];        // IDs das filas/setores atribuídos ao usuário
  profile?: string;           // Perfil: 'admin', 'agent', 'developer'
  whatsappId?: number;        // ID da conexão WhatsApp padrão
  isAdminCreation?: boolean;  // Flag: true quando admin cria o usuário
}

/**
 * Interface que define os dados retornados após criar um usuário
 */
interface Response {
  email: string;        // Email do usuário
  phone: string;         // Telefone do usuário
  name: string;         // Nome do usuário
  id: number;           // ID do usuário no banco
  profile: string;      // Perfil do usuário
  resetToken?: string;  // Token para reset de senha (apenas se isAdminCreation=true)
}

const CreateUserService = async ({
  email,
  phone,
  password,
  name,
  queueIds = [],
  profile = "agent",
  whatsappId,
  isAdminCreation = false
}: Request): Promise<Response> => {
  if (!email && !phone) {
    throw new AppError("Either email or phone is required");
  }

  const normalizedPhone = phone ? normalizePhone(phone) : undefined;

  // PASSO 1: Definir a senha
  // Se foi criação pelo admin e não foi fornecida senha, gera uma temporária aleatória
  // que o usuário nunca vê — ele define a própria senha pelo link de convite
  // (compartilhado por WhatsApp quando phone é informado, ou manualmente pelo admin).
  const finalPassword = isAdminCreation && !password
    ? crypto.randomBytes(16).toString("base64url")
    : password;

  // Se NÃO for criação por admin, a senha é obrigatória
  if (!isAdminCreation && !finalPassword) {
    throw new AppError("Password is required for non-admin creation");
  }

  // PASSO 2: Validar dados usando Yup
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    email: Yup.string()
      .email()
      .test(
        "Check-email",
        "An user with this email already exists.",
        async value => {
          if (!value) return true;
          const emailExists = await User.findOne({ where: { email: value } });
          return !emailExists;
        }
      ),
    phone: Yup.string().test(
      "Check-phone",
      "An user with this phone already exists.",
      async value => {
        if (!value) return true;
        const phoneExists = await User.findOne({ where: { phone: value } });
        return !phoneExists;
      }
    )
  });

  try {
    await schema.validate({ email, name, phone: normalizedPhone });
  } catch (err) {
    throw new AppError(err.message);
  }

  // PASSO 3: Criar o usuário no banco de dados
  // O modelo User tem um hook @BeforeCreate que automaticamente faz hash da senha
  const user = await User.create(
    {
      email,
      phone: normalizedPhone,
      password: finalPassword!,  // finalPassword é garantido não ser null aqui
      name,
      profile,
      whatsappId: whatsappId ? whatsappId : null,
      mustChangePassword: isAdminCreation
    },
    { include: ["queues", "whatsapp"] }
  );

  // PASSO 4: Associar o usuário às filas/setores fornecidas
  await user.$set("queues", queueIds);

  // Recarrega o usuário para incluir as relações (queues, whatsapp)
  await user.reload();

  // PASSO 5: Serializar o usuário (formatar dados para retornar)
  const serializedUser = SerializeUser(user);
  let resetToken: string | undefined;

  // PASSO 6: Se foi criação por admin, gerar token de reset de senha
  // Este token será incluído no link enviado por WhatsApp (ou compartilhado
  // manualmente pelo admin) para o usuário definir sua própria senha.
  if (isAdminCreation) {
    resetToken = generatePasswordResetToken(user.id, user.email);
  }

  return {
    ...serializedUser,
    resetToken
  };
};

export default CreateUserService;
