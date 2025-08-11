const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const convertToBase = require("./utils/convertToBase");

const { v4: uuidv4 } = require("uuid");

class StockController {
  static async createIngredient(req, res) {
    try {
      const {
        nome,
        unidades,
        pesoPorUnidade,
        unidadeMedida,
        validade,
        nivelMinimo,
        precoCusto,
        categoria,
      } = req.body;

      if (!nome || nome.trim() === "") {
        return res.status(422).json({ msg: "Informe o nome do produto!" });
      }

      if (!unidades || isNaN(unidades) || parseFloat(unidades) <= 0) {
        return res.status(422).json({
          msg: "Informe o estoque inicial (número inteiro positivo)!",
        });
      }

      if (
        !unidadeMedida ||
        !["mg", "g", "kg", "ml", "l", "un"].includes(unidadeMedida)
      ) {
        return res.status(422).json({
          msg: "Unidade de medida inválida! Use: mg, g, kg, ml, l ou un.",
        });
      }

      if (unidadeMedida !== "un") {
        if (
          pesoPorUnidade === null ||
          pesoPorUnidade === undefined ||
          isNaN(pesoPorUnidade) ||
          Number(pesoPorUnidade) <= 0
        ) {
          return res
            .status(422)
            .json({ msg: "Peso/Volume inválido, deve ser maior que zero!" });
        }
      }

      if (!nivelMinimo || isNaN(nivelMinimo) || parseInt(nivelMinimo) < 0) {
        return res.status(422).json({
          msg: "Informe o nível mínimo de estoque (número inteiro positivo)!",
        });
      }

      if (unidades < nivelMinimo) {
        return res.status(422).json({
          msg: "O estoque inicial não pode ser menor que o nível mínimo!",
        });
      }

      if (!precoCusto || isNaN(precoCusto) || Number(precoCusto) < 0) {
        return res
          .status(422)
          .json({ msg: "Preço de custo inválido! Informe um valor positivo." });
      }

      if (!categoria || categoria.trim() === "") {
        return res.status(422).json({ msg: "Informe a categoria do produto!" });
      }

      const nomeNormalizado = nome.trim().toLowerCase();

      const nomeExistente = await prisma.tbIngredienteEmEstoque.findUnique({
        where: { nome: nomeNormalizado },
      });
      if (nomeExistente) {
        return res.status(409).json({ msg: "Produto já cadastrado!" });
      }

      let validadeFormatada = null;
      if (validade) {
        const data = new Date(validade);
        if (isNaN(data.getTime())) {
          return res.status(422).json({ msg: "Data de validade inválida!" });
        }
        const dia = String(data.getDate()).padStart(2, "0");
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const ano = data.getFullYear();
        validadeFormatada = `${dia}/${mes}/${ano}`;
      }

      const id = uuidv4();

      const novoIngredienteCriado = await prisma.tbIngredienteEmEstoque.create({
        data: {
          id,
          nome: nomeNormalizado,
          unidades: parseFloat(unidades),
          pesoPorUnidade:
            unidadeMedida === "un" ? null : parseFloat(pesoPorUnidade),
          unidadeMedida,
          validade: validadeFormatada,
          nivelMinimo: parseInt(nivelMinimo),
          precoCusto: parseFloat(precoCusto),
          categoria,
        },
      });

      return res.status(201).json({
        msg: "Ingrediente adicionado com sucesso!",
        produto: novoIngredienteCriado,
      });
    } catch (error) {
      const err = error.meta?.target || "";
      return res.status(500).json({
        msg: "Erro interno ao adicionar ingrediente.",
        error: err || error.message,
      });
    }
  }

  static async getIngredients(req, res) {
    try {
      const { nome } = req.query;

      if (nome && nome.trim() !== "") {
        const ingredients = await prisma.tbIngredienteEmEstoque.findMany({
          where: {
            nome: {
              contains: nome,
            },
          },
        });

        if (ingredients.length === 0) {
          return res
            .status(404)
            .json({ msg: "Nenhum ingrediente encontrado com esse nome." });
        }

        return res
          .status(200)
          .json({ msg: "Ingredientes encontrados!", ingredients });
      }

      const allIngredients = await prisma.tbIngredienteEmEstoque.findMany();
      res
        .status(200)
        .json({ msg: "Todos os ingredientes", ingredients: allIngredients });
    } catch (error) {
      res
        .status(500)
        .json({ msg: "Erro ao buscar ingredientes.", erro: error.message });
    }
  }

  static async getIngredientById(req, res) {
    const { id } = req.params;

    try {
      const ingrediente = await prisma.tbIngredienteEmEstoque.findUnique({
        where: { id },
      });

      if (!ingrediente) {
        return res.status(400).json({ msg: "Produto não cadastrado." });
      }

      return res.status(200).json({ produto: ingrediente });
    } catch (error) {
      return res
        .status(500)
        .json({ msg: "Erro ao buscar produto por ID.", erro: error.message });
    }
  }

  static async checkIngredientUsage(req, res) {
    try {
      const { id } = req.params;

      const receitasAfetadas = await prisma.tbReceitaIngrediente.findMany({
        where: { idIngrediente: id },
        select: {
          idReceita: true,
          receita: {
            select: {
              nome: true,
            },
          },
        },
      });

      if (receitasAfetadas.length > 0) {
        const receitaNomes = [
          ...new Set(receitasAfetadas.map((ri) => ri.receita.nome)),
        ];
        const count = receitaNomes.length;

        return res.status(200).json({
          canEdit: false,
          message: `Você não pode editar o ingrediente pois ele é usado em '${count}' receita(s).`,
          recipes: receitaNomes,
        });
      } else {
        return res.status(200).json({
          canEdit: true,
          message:
            "O ingrediente não é usado em nenhuma receita e pode ser editado.",
        });
      }
    } catch (error) {
      console.error("Erro ao verificar uso do ingrediente:", error);
      let statusCode = 500;
      let errorMessage =
        "Erro interno do servidor ao verificar o uso do ingrediente.";

      if (error.code === "P2025") {
        statusCode = 404;
        errorMessage = "Ingrediente não encontrado.";
      }

      res.status(statusCode).json({
        msg: errorMessage,
        error: error.message,
      });
    }
  }

  static async updateIngredient(req, res) {
    try {
      const id = req.params.id;

      const allowedFields = [
        "nome",
        "unidades",
        "pesoPorUnidade",
        "unidadeMedida",
        "validade",
        "nivelMinimo",
        "precoCusto",
        "categoria",
      ];

      const updatedData = {};
      allowedFields.forEach((campo) => {
        if (req.body[campo] !== undefined) {
          updatedData[campo] = req.body[campo];
        }
      });

      if (Object.keys(updatedData).length === 0) {
        return res
          .status(400)
          .json({ msg: "Nenhum campo válido para atualização foi fornecido." });
      }

      if (updatedData.nome !== undefined) {
        updatedData.nome = updatedData.nome.toLowerCase();
      }

      if (
        updatedData.unidadeMedida === "un" &&
        updatedData.pesoPorUnidade !== undefined
      ) {
        updatedData.pesoPorUnidade = null;
      }

      const ingredienteAntigo = await prisma.tbIngredienteEmEstoque.findUnique({
        where: { id },
        select: {
          precoCusto: true,
          quantidade: true,
          unidadeMedida: true,
          unidades: true,
          nome: true,
        },
      });

      if (!ingredienteAntigo) {
        return res.status(404).json({ msg: "Ingrediente não encontrado." });
      }

      const result = await prisma.$transaction(async (tx) => {
        const ingredient = await tx.tbIngredienteEmEstoque.update({
          where: { id },
          data: updatedData,
        });

        if (
          updatedData.precoCusto !== undefined &&
          updatedData.precoCusto !== ingredienteAntigo.precoCusto
        ) {
          const receitasAfetadas = await tx.tbReceitaIngrediente.findMany({
            where: { idIngrediente: id },
            select: { idReceita: true },
          });

          const receitaIds = [
            ...new Set(receitasAfetadas.map((ri) => ri.idReceita)),
          ];

          for (const receitaId of receitaIds) {
            const receitaParaRecalcular = await tx.tbReceita.findUnique({
              where: { id: receitaId },
              include: { ingredientes: { include: { ingrediente: true } } },
            });

            if (receitaParaRecalcular) {
              let novoCustoDeProducao = 0;
              for (const itemReceita of receitaParaRecalcular.ingredientes) {
                const ingredienteAtualizado = itemReceita.ingrediente;

                const quantidadeUsadaNaReceitaNormalizada =
                  itemReceita.qtdUnidade !== null
                    ? itemReceita.qtdUnidade
                    : itemReceita.qtdGramasOuMl;

                if (quantidadeUsadaNaReceitaNormalizada === null) {
                  console.warn(
                    `Receita ${receitaId} tem ingrediente ${ingredienteAtualizado.id} com quantidade nula.`
                  );
                  continue;
                }

                let custoDoItem = 0;

                if (ingredienteAtualizado.unidadeMedida === "un") {
                  if (ingredienteAtualizado.unidades === 0) {
                    throw new Error(
                      `Erro: Ingrediente ${ingredienteAtualizado.nome} tem 'unidades' igual a zero, impossível calcular custo por unidade.`
                    );
                  }
                  custoDoItem =
                    (quantidadeUsadaNaReceitaNormalizada /
                      ingredienteAtualizado.unidades) *
                    ingredienteAtualizado.precoCusto;
                } else {
                  const quantidadeEstoqueNormalizada = convertToBase(
                    ingredienteAtualizado.quantidade,
                    ingredienteAtualizado.unidadeMedida
                  );
                  if (quantidadeEstoqueNormalizada === 0) {
                    throw new Error(
                      `Erro: Ingrediente ${ingredienteAtualizado.nome} tem 'quantidade' igual a zero, impossível calcular custo por base.`
                    );
                  }
                  const precoCustoPorUnidadeBase =
                    ingredienteAtualizado.precoCusto /
                    quantidadeEstoqueNormalizada;
                  custoDoItem =
                    quantidadeUsadaNaReceitaNormalizada *
                    precoCustoPorUnidadeBase;
                }
                novoCustoDeProducao += custoDoItem;
              }

              await tx.tbReceita.update({
                where: { id: receitaId },
                data: { custoDeProducao: novoCustoDeProducao },
              });
            }
          }
        }
        return ingredient;
      });

      res.status(200).json({
        msg: "Ingrediente atualizado com sucesso!",
        ingredient: result,
      });
    } catch (error) {
      console.error("Erro ao atualizar ingrediente:", error);

      let statusCode = 500;
      let errorMessage = "Erro interno do servidor ao atualizar ingrediente.";

      if (error.message.includes("Ingrediente não encontrado")) {
        statusCode = 404;
        errorMessage = error.message;
      } else if (
        error.message.includes("impossível calcular custo por unidade") ||
        error.message.includes("impossível calcular custo por base")
      ) {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.code === "P2025") {
        statusCode = 404;
        errorMessage = "Ingrediente não encontrado para atualização.";
      }

      res.status(statusCode).json({
        msg: errorMessage,
        error: error.message,
      });
    }
  }

  static async deleteIngredient(req, res) {
    try {
      const id = req.params.id;

      const { forceDelete } = req.body;

      const ingredientToDelete = await prisma.tbIngredienteEmEstoque.findUnique(
        {
          where: { id: id },
          select: { nome: true },
        }
      );

      if (!ingredientToDelete) {
        return res.status(404).json({ msg: "Ingrediente não encontrado." });
      }

      const recipesUsingIngredient = await prisma.tbReceitaIngrediente.findMany(
        {
          where: { idIngrediente: id },
          select: {
            receita: {
              select: {
                id: true,
                nome: true,
                ingredientes: {
                  select: { idIngrediente: true },
                },
                pedidoReceitas: {
                  select: {
                    pedidoId: true,
                    pedido: {
                      select: {
                        pedidoReceitas: {
                          select: { receitaId: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }
      );

      const recipesInOrders = recipesUsingIngredient.filter(
        (ri) => ri.receita.pedidoReceitas.length > 0
      );

      const recipeNamesInvolved = recipesUsingIngredient.map(
        (ri) => ri.receita.nome
      );
      const uniqueRecipeIdsInvolved = [
        ...new Set(recipesUsingIngredient.map((ri) => ri.receita.id)),
      ];

      if (recipesInOrders.length > 0) {
        if (!forceDelete) {
          const uniqueOrderCount = new Set(
            recipesInOrders.flatMap((ri) =>
              ri.receita.pedidoReceitas.map((pr) => pr.pedidoId)
            )
          ).size;

          return res.status(200).json({
            msg: `O ingrediente "${ingredientToDelete.nome}" é usado em ${
              uniqueRecipeIdsInvolved.length
            } receita(s) (${recipeNamesInvolved.join(
              ", "
            )}) e está presente em ${uniqueOrderCount} pedido(s). Deseja realmente forçar a exclusão? Isso removerá o ingrediente das receitas, e poderá excluir receitas e/ou pedidos se se tornarem vazios.`,
            action: "confirm_force_delete",
            recipes: recipeNamesInvolved,
            ordersAffectedCount: uniqueOrderCount,
          });
        } else {
          await prisma.$transaction(async (tx) => {
            const deletedRecipes = [];
            const deletedOrders = [];

            for (const ri of recipesUsingIngredient) {
              const receita = ri.receita;

              await tx.tbReceitaIngrediente.deleteMany({
                where: {
                  idReceita: receita.id,
                  idIngrediente: id,
                },
              });

              const remainingIngredientsInRecipe =
                await tx.tbReceitaIngrediente.count({
                  where: { idReceita: receita.id },
                });

              if (remainingIngredientsInRecipe === 0) {
                const pedidoReceitasDestaReceita =
                  await tx.tbPedidoReceita.findMany({
                    where: { receitaId: receita.id },
                    select: { pedidoId: true },
                  });

                await tx.tbReceita.delete({
                  where: { id: receita.id },
                });
                deletedRecipes.push(receita.nome);

                for (const pr of pedidoReceitasDestaReceita) {
                  const remainingRecipesInOrder =
                    await tx.tbPedidoReceita.count({
                      where: { pedidoId: pr.pedidoId },
                    });

                  if (remainingRecipesInOrder === 0) {
                    await tx.tbPedido.delete({
                      where: { id: pr.pedidoId },
                    });
                    deletedOrders.push(pr.pedidoId);
                  }
                }
              }
            }

            await tx.tbIngredienteEmEstoque.delete({
              where: { id: id },
            });

            let successMsg = `Ingrediente "${ingredientToDelete.nome}" removido das receitas e do banco de dados.`;
            if (deletedRecipes.length > 0) {
              successMsg += ` ${
                deletedRecipes.length
              } receita(s) deletada(s): ${deletedRecipes.join(", ")}.`;
            }
            if (deletedOrders.length > 0) {
              successMsg += ` ${deletedOrders.length} pedido(s) deletado(s) por ficarem vazios.`;
            }

            return res.status(200).json({
              msg: successMsg,
              action: "force_deleted_cascading",
              deletedRecipes: deletedRecipes,
              deletedOrders: deletedOrders,
            });
            //até aqui (linha 573)
          });
        }
      } else if (
        recipesUsingIngredient.length > 0 &&
        recipesInOrders.length === 0
      ) {
        if (!forceDelete) {
          return res.status(200).json({
            msg: `O ingrediente "${ingredientToDelete.nome}" está presente em ${
              uniqueRecipeIdsInvolved.length
            } receita(s) (${recipeNamesInvolved.join(
              ", "
            )}). Deseja realmente excluí-lo? Isso o removerá das receitas e do banco.`,
            action: "confirm_simple_delete", // Confirmação mais simples para o frontend
            recipes: recipeNamesInvolved,
          });
        } else {
          // Segunda chamada com 'forceDelete: true': Procede com a exclusão das receitas e do ingrediente
          await prisma.$transaction(async (tx) => {
            const deletedRecipes = [];
            for (const ri of recipesUsingIngredient) {
              const receita = ri.receita;

              // Remover o ingrediente da receita
              await tx.tbReceitaIngrediente.deleteMany({
                where: {
                  idReceita: receita.id,
                  idIngrediente: id,
                },
              });

              // Verificar se a receita ficou sem ingredientes e, se sim, deletá-la
              const remainingIngredientsInRecipe =
                await tx.tbReceitaIngrediente.count({
                  where: { idReceita: receita.id },
                });

              if (remainingIngredientsInRecipe === 0) {
                await tx.tbReceita.delete({
                  where: { id: receita.id },
                });
                deletedRecipes.push(receita.nome);
              }
            }
            // Finalmente, deletar o ingrediente
            await tx.tbIngredienteEmEstoque.delete({
              where: { id: id },
            });

            let successMsg = `Ingrediente "${ingredientToDelete.nome}" removido das receitas e do banco de dados.`;
            if (deletedRecipes.length > 0) {
              successMsg += ` ${
                deletedRecipes.length
              } receita(s) deletada(s): ${deletedRecipes.join(", ")}.`;
            }
            //até aqui (linha 637) está descoberto por testes
            return res.status(200).json({
              msg: successMsg,
              action: "deleted_cascading_recipes_only",
              deletedRecipes: deletedRecipes,
            });
          });
        }
      } else {
        await prisma.tbIngredienteEmEstoque.delete({
          where: { id: id },
        });
        return res.status(200).json({
          msg: `Ingrediente "${ingredientToDelete.nome}" excluído permanentemente com sucesso!`,
          action: "deleted_direct",
        });
      }
    } catch (error) {
      console.error("Erro ao processar exclusão de ingrediente:", error);
      if (error.code === "P2025") {
        return res.status(404).json({ msg: "Ingrediente não encontrado." });
      }
      return res.status(500).json({
        msg: "Erro interno do servidor ao tentar excluir o ingrediente.",
        detalhes: error.message,
      });
    }
  }
}

module.exports = StockController;
