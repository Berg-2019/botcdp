import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { SerializeUser } from "../../helpers/SerializeUser";
import { generatePasswordResetToken } from "../../helpers/GeneratePasswordResetToken";
import User from "../../models/User";

/**
 * Interface que define os dados necessários para criar um novo usuário
 */
interface Request {
  email: string;              // Email do usuário (obrigatório e único)
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
  name: string;         // Nome do usuário
  id: number;           // ID do usuário no banco
  profile: string;      // Perfil do usuário
  resetToken?: string;  // Token para reset de senha (apenas se isAdminCreation=true)
}

const CreateUserService = async ({
  email,
  password,
  name,
  queueIds = [],
  profile = "admin",
  whatsappId,
  isAdminCreation = false
}: Request): Promise<Response> => {
  // PASSO 1: Definir a senha
  // Se foi criação pelo admin e não foi fornecida senha, gera uma temporária aleatória
  // Mais tarde, o admin compartilhará um link de reset para o usuário definir sua própria senha
  const finalPassword = isAdminCreation && !password
    ? Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    : password;

  // Se NÃO for criação por admin, a senha é obrigatória
  if (!isAdminCreation && !finalPassword) {
    throw new AppError("Password is required for non-admin creation");
  }

  // PASSO 2: Validar dados usando Yup
  // Validações: nome (min 2 chars), email (formato válido e único)
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    email: Yup.string()
      .email()
      .required()
      .test(
        "Check-email",
        "An user with this email already exists.",
        async value => {
          if (!value) return false;
          const emailExists = await User.findOne({
            where: { email: value }
          });
          return !emailExists;  // Retorna true se email NÃO existe (validação passa)
        }
      ),
  });

  try {
    await schema.validate({ email, name });
  } catch (err) {
    throw new AppError(err.message);
  }

  // PASSO 3: Criar o usuário no banco de dados
  // O modelo User tem um hook @BeforeCreate que automaticamente faz hash da senha
  const user = await User.create(
    {
      email,
      password: finalPassword!,  // finalPassword é garantido não ser null aqui
      name,
      profile,
      whatsappId: whatsappId ? whatsappId : null
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
  // Este token será incluído no link que o admin compartilhará com o novo usuário
  if (isAdminCreation) {
    resetToken = generatePasswordResetToken(user.id, user.email);
  }

  return {
    ...serializedUser,
    resetToken
  };
};

export default CreateUserService;
