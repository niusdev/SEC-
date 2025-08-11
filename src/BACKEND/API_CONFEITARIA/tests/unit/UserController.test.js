const request = require("supertest");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const app = require("../../app");

const { v4: uuidv4 } = require("uuid");
const secretKey = process.env.SECRET_KEY;

process.env.SENHA_VALIDACAO_SUP_JUNIOR = "senhaSupervisorJunior123";
process.env.SENHA_VALIDACAO_SUP_SENIOR = "senhaSupervisorSenior456";

describe("UserController - Testes unitários por função", () => {
  let seniorUser;
  let juniorUser;
  let commonUser;
  let seniorToken;
  let juniorToken;
  let commonToken;
  const testUserPassword = "12345678";
  const testUserPhone = "11999999999";

  beforeAll(async () => {
    await prisma.tbUsuario.deleteMany({
      where: {
        email: {
          in: ["senior@test.com", "junior@test.com", "common@test.com"],
        },
      },
    });

    seniorUser = await prisma.tbUsuario.create({
      data: {
        id: uuidv4(),
        nome: "Supervisor Senior",
        email: "senior@test.com",
        senha: testUserPassword,
        telefone: testUserPhone,
        perfil: "SUPERVISOR_SENIOR",
      },
    });
    juniorUser = await prisma.tbUsuario.create({
      data: {
        id: uuidv4(),
        nome: "Supervisor Junior",
        email: "junior@test.com",
        senha: testUserPassword,
        telefone: testUserPhone,
        perfil: "SUPERVISOR_JUNIOR",
      },
    });
    commonUser = await prisma.tbUsuario.create({
      data: {
        id: uuidv4(),
        nome: "Funcionário Comum",
        email: "common@test.com",
        senha: testUserPassword,
        telefone: testUserPhone,
        perfil: "FUNCIONARIO_COMUM",
      },
    });

    seniorToken =
      "Bearer " +
      jwt.sign({ id: seniorUser.id, perfil: seniorUser.perfil }, secretKey, {
        expiresIn: 1200,
      });
    juniorToken =
      "Bearer " +
      jwt.sign({ id: juniorUser.id, perfil: juniorUser.perfil }, secretKey, {
        expiresIn: 1200,
      });
    commonToken =
      "Bearer " +
      jwt.sign({ id: commonUser.id, perfil: commonUser.perfil }, secretKey, {
        expiresIn: 1200,
      });
  });

  afterAll(async () => {
    await prisma.tbUsuario.deleteMany({
      where: {
        email: {
          in: [
            "senior@test.com",
            "junior@test.com",
            "common@test.com",
            "new@test.com",
            "invalid_sup@test.com",
            "to_delete@test.com",
          ],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe("createUser", () => {
    test("POST /usuario - cria usuário comum com sucesso", async () => {
      const newUserEmail = `new_user_${Date.now()}@test.com`;
      const newUser = {
        nome: "Novo Usuário",
        email: newUserEmail,
        senha: "password123",
        senha_confirmacao: "password123",
        telefone: "(88) 9 8888-8888",
        perfil: "FUNCIONARIO_COMUM",
      };

      const res = await request(app)
        .post("/api_confeitaria/usuario")
        .send(newUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.msg).toBe("Usuário criado com sucesso!");

      await prisma.tbUsuario.delete({ where: { email: newUserEmail } });
    });

    test("POST /usuario - falha ao criar usuário com e-mail duplicado", async () => {
      const newUser = {
        nome: "Usuário Existente",
        email: "senior@test.com",
        senha: "password123",
        senha_confirmacao: "password123",
        telefone: "(88) 9 8888-8888",
        perfil: "FUNCIONARIO_COMUM",
      };

      const res = await request(app)
        .post("/api_confeitaria/usuario")
        .send(newUser);

      expect(res.statusCode).toBe(500);

      expect(res.body.msg).toBe("Já existe um usuário com este e-mail.");
    });

    test("POST /usuario - falha ao criar supervisor com senha de validação inválida", async () => {
      const newUser = {
        nome: "Supervisor Júnior Inválido",
        email: "invalid_sup@test.com",
        senha: "password123",
        senha_confirmacao: "password123",
        telefone: "(88) 9 8888-8888",
        perfil: "SUPERVISOR_JUNIOR",
        senhaValidacaoSup: "wrong_password",
      };

      const res = await request(app)
        .post("/api_confeitaria/usuario")
        .send(newUser);

      expect(res.statusCode).toBe(401);
      expect(res.body.msg).toBe("Senha de validação de supervisor inválida!");

      await prisma.tbUsuario.deleteMany({
        where: { email: "invalid_sup@test.com" },
      });
    });
  });

  describe("getUsers", () => {
    test("GET /super/usuarios - retorna lista completa de usuários", async () => {
      const res = await request(app)
        .get("/api_confeitaria/super/usuarios")
        .set("Authorization", seniorToken);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThanOrEqual(3);
    });

    test("GET /super/usuarios?nome= - filtra usuários por nome", async () => {
      const res = await request(app)
        .get("/api_confeitaria/super/usuarios")
        .query({ nome: "Supervisor Senior" })
        .set("Authorization", seniorToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.users.length).toBe(1);
      expect(res.body.users[0].nome).toBe("Supervisor Senior");
    });
  });

  // ---

  describe("getUserById", () => {
    test("GET /super/usuarios/:id - id inválido retorna 400", async () => {
      const res = await request(app)
        .get("/api_confeitaria/super/usuarios/idInvalido123")
        .set("Authorization", seniorToken);

      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toMatch(/não encontrado/i);
    });
  });

  // ---

  describe("updateUser", () => {
    test("PUT /usuario/:id - atualiza telefone com sucesso", async () => {
      const newPhone = "(88) 9 7777-7777";
      const res = await request(app)
        .put(`/api_confeitaria/usuario/${commonUser.id}`)
        .set("Authorization", commonToken)
        .send({ telefone: newPhone });

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Usuário editado com sucesso!");
      expect(res.body.user.telefone).toBe(newPhone);
    });

    test("PUT /usuario/:id - retorna 400 se nenhum campo válido fornecido", async () => {
      const res = await request(app)
        .put(`/api_confeitaria/usuario/${commonUser.id}`)
        .set("Authorization", commonToken)
        .send({ campoInvalido: "teste" });

      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toMatch(/nenhum campo válido/i);
    });
  });

  // ---

  describe("updateProfile", () => {
    test("PUT /super/usuarios/:id/perfil - supervisor sênior atualiza perfil com sucesso", async () => {
      const res = await request(app)
        .put(`/api_confeitaria/super/usuarios/${juniorUser.id}/perfil`)
        .set("Authorization", seniorToken)
        .send({
          novoPerfil: "FUNCIONARIO_COMUM",
          solicitanteId: seniorUser.id,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Perfil do usuário atualizado com sucesso!");

      const updatedUser = await prisma.tbUsuario.findUnique({
        where: { id: juniorUser.id },
      });
      expect(updatedUser.perfil).toBe("FUNCIONARIO_COMUM");

      await prisma.tbUsuario.update({
        where: { id: juniorUser.id },
        data: { perfil: "SUPERVISOR_JUNIOR" },
      });
    });

    test("PUT /super/usuarios/:id/perfil - supervisor júnior falha ao tentar atualizar perfil", async () => {
      const res = await request(app)
        .put(`/api_confeitaria/super/usuarios/${commonUser.id}/perfil`)
        .set("Authorization", juniorToken)
        .send({
          novoPerfil: "SUPERVISOR_JUNIOR",
          solicitanteId: juniorUser.id,
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.msg).toMatch(/apenas supervisores sênior/i);
    });
  });

  describe("delete", () => {
    test("DELETE /super/usuario/:id - supervisor sênior deleta usuário com sucesso", async () => {
      const userToDelete = await prisma.tbUsuario.create({
        data: {
          id: uuidv4(),
          nome: "Usuário para Deletar",
          email: "to_delete@test.com",
          senha: "12345678",
          telefone: "(88) 9 9999-9999",
          perfil: "FUNCIONARIO_COMUM",
        },
      });

      const res = await request(app)
        .delete(`/api_confeitaria/super/usuario/${userToDelete.id}`)
        .set("Authorization", seniorToken)
        .send({ solicitanteId: seniorUser.id });

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Usuário deletado com sucesso!");

      const deletedUser = await prisma.tbUsuario.findUnique({
        where: { id: userToDelete.id },
      });
      expect(deletedUser).toBeNull();
    });

    test("DELETE /super/usuario/:id - falha ao deletar a si mesmo", async () => {
      const res = await request(app)
        .delete(`/api_confeitaria/super/usuario/${seniorUser.id}`)
        .set("Authorization", seniorToken)
        .send({ solicitanteId: seniorUser.id });

      expect(res.statusCode).toBe(403);
      expect(res.body.msg).toMatch(/não pode excluir a si mesmo/i);
    });
  });
});
