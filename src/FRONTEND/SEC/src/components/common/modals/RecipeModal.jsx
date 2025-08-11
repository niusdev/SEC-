import { useState, useEffect, useCallback } from "react";

import IngredientSelectorModal from "./IngredientSelectorModal";

import useRevenuesAPI from "../../../hooks/useRevenuesAPI";

export default function RecipeModal({
  isOpen,
  onClose,
  onRecipeSaved,
  initialRecipeData,
}) {
  const { createRecipe, updateRecipe, getRecipeById } = useRevenuesAPI();

  const [idReceita, setIdReceita] = useState(null);
  const [nome, setNome] = useState("");
  const [rendimento, setRendimento] = useState("");
  const [ingredientesSelecionados, setIngredientesSelecionados] = useState([]);
  const [custoProducao, setCustoProducao] = useState("0.00");
  const [modoPreparo, setModoPreparo] = useState("");
  const [mostrarModoPreparo, setMostrarModoPreparo] = useState(false);
  const [showIngredientesModal, setShowIngredientesModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [_originalIngredientsForEdit, setOriginalIngredientsForEdit] = useState(
    []
  );

  const podeEditar = initialRecipeData?.podeEditar;
  const mensagemErro = initialRecipeData?.mensagemErro;

  const [ingredientesParaCadastrar, setIngredientesParaCadastrar] = useState(
    []
  );

  const recalcularCusto = useCallback((ingredientes) => {
    const total = ingredientes.reduce((soma, ingrediente) => {
      const preco = parseFloat(ingrediente.precoCusto) || 0;
      const quantidade = parseFloat(ingrediente.quantidadeUsada) || 0;
      return soma + preco * quantidade;
    }, 0);
    setCustoProducao(total.toFixed(2));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setApiError("");
      setErrors({});

      if (initialRecipeData && initialRecipeData.podeEditar) {
        // Modo de EDIÇÃO
        setIdReceita(initialRecipeData.id);
        setNome(initialRecipeData.nome || "");
        setRendimento(String(initialRecipeData.rendimento || ""));
        setModoPreparo(initialRecipeData.modoDePreparo || "");
        setMostrarModoPreparo(!!initialRecipeData.modoDePreparo);

        const mappedIngredients = (initialRecipeData.ingredientes || []).map(
          (ri) => ({
            id: ri.id,
            nome: ri.nome,
            unidade: ri.unidade,
            precoCusto: ri.precoCusto,
            quantidadeUsada: String(ri.quantidadeUsada || ""),
          })
        );
        setIngredientesSelecionados(mappedIngredients);
        // NOVO: Inicializa a lista de cadastro com os ingredientes da receita (se for edição)
        setIngredientesParaCadastrar(mappedIngredients);
        setOriginalIngredientsForEdit(mappedIngredients);
        setCustoProducao(String(initialRecipeData.custoDeProducao || "0.00"));
      } else {
        // Modo de CRIAÇÃO
        setIdReceita(null);
        setNome("");
        setRendimento("");
        setIngredientesSelecionados([]);
        setIngredientesParaCadastrar([]); // <-- IMPORTANTE: Limpa o estado para a nova receita
        setOriginalIngredientsForEdit([]);
        setCustoProducao("0.00");
        setModoPreparo("");
        setMostrarModoPreparo(false);
      }
    }
  }, [isOpen, initialRecipeData, podeEditar]);

  const validate = useCallback(() => {
    const newErrors = {};

    if (!nome.trim()) {
      newErrors.nome = "O nome da receita é obrigatório.";
    }
    if (!rendimento.trim()) {
      newErrors.rendimento = "O rendimento é obrigatório.";
    } else {
      const rendimentoNum = parseFloat(rendimento);
      if (isNaN(rendimentoNum) || rendimentoNum <= 0) {
        newErrors.rendimento =
          "O rendimento deve ser um número válido maior que zero.";
      }
    }

    // ATENÇÃO: Validação deve ser feita na lista de ingredientes que será salva.
    if (ingredientesParaCadastrar.length === 0) {
      newErrors.ingredientes = "A receita deve ter pelo menos um ingrediente.";
    } else {
      ingredientesParaCadastrar.forEach((ing, index) => {
        if (!ing.quantidadeUsada || parseFloat(ing.quantidadeUsada) <= 0) {
          newErrors[
            `ingrediente${index}`
          ] = `A quantidade do ingrediente '${ing.nome}' é obrigatória e deve ser maior que zero.`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [nome, rendimento, ingredientesParaCadastrar]); // Corrigido aqui

  const handleSave = async () => {
    setApiError("");
    if (!validate()) {
      return;
    }
    setLoading(true);

    const isNewRecipe = !idReceita;

    // A lista de ingredientes para a API é diferente para criação e edição
    let ingredientesParaAPI;
      if (isNewRecipe) {
        // Mapeia para o formato que sua API de criação espera
        ingredientesParaAPI = ingredientesParaCadastrar.map((ing) => ({
          ingredienteId: ing.id,
          quantidadeUsada: Number(ing.quantidadeUsada),
          unidadeMedidaUsada: ing.unidade,
        }));
      }

    const receitaDataToSave = {
      nome,
      rendimento: String(rendimento), // Mantemos como String por causa do schema
      modoDePreparo: modoPreparo,
      // Envia a lista de ingredientes APENAS na criação
      ingredientes: ingredientesParaAPI,
    };

    let recipeResponse;
    console.log(ingredientesParaAPI)
    try {
      if (isNewRecipe) {
        recipeResponse = await createRecipe(receitaDataToSave);
      } else {
        recipeResponse = await updateRecipe(idReceita, receitaDataToSave);
      }

      if (recipeResponse.sucesso) {
        onRecipeSaved(recipeResponse.recipe);
        onClose();
      } else {
        setApiError(
          recipeResponse.mensagem ||
            recipeResponse.error ||
            "Erro ao salvar receita."
        );
      }
    } catch (error) {
      console.error("Erro geral no salvamento da receita:", error);
      setApiError("Erro inesperado ao salvar a receita. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = useCallback(async () => {
    if (idReceita) {
      try {
        // Supondo que você tenha uma função para buscar a receita completa ou apenas os ingredientes
        // Este é um exemplo, ajuste para a sua API
        const response = await getRecipeById(idReceita);
        if (response.sucesso) {
          const updatedIngredients = (response.ingredientes || []).map(
            (ri) => ({
              id: ri.id,
              nome: ri.nome,
              unidade: ri.unidade,
              precoCusto: ri.precoCusto,
              quantidadeUsada: String(ri.quantidadeUsada || ""),
            })
          );
          setIngredientesSelecionados(updatedIngredients);
          // Opcional: Recalcular o custo de produção
          const total = updatedIngredients.reduce((soma, ingrediente) => {
            const precoCusto = parseFloat(ingrediente.precoCusto || 0);
            const quantidade = parseFloat(ingrediente.quantidadeUsada || 0);
            return soma + precoCusto * quantidade;
          }, 0);
          setCustoProducao(total.toFixed(2));
        }
      } catch (error) {
        console.error("Erro ao buscar ingredientes atualizados:", error);
      }
    }
  }, [idReceita, getRecipeById]);

  if (!isOpen) return null;
  const modalTitle = idReceita ? "Editar Receita" : "Cadastrar Receita";
  const submitButtonText = idReceita ? "ATUALIZAR" : "CADASTRAR";

  return (
    <div>
      {initialRecipeData && !podeEditar ? (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-md w-[90%] max-w-md">
            <h3 className="text-xl font-bold">Edição Bloqueada</h3>
            <p className="mt-4 text-red-700">{mensagemErro}</p>
            <p className="mt-2 text-sm text-red-600">
              Remova a receita dos pedidos antes de tentar editá-la.
            </p>
            <button
              onClick={onClose}
              className="w-full mt-6 px-6 py-2 hover:cursor-pointer bg-orange-500 text-white rounded-md hover:bg-orange-600 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[400px] max-h-[95vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{modalTitle}:</h2>
            {apiError && (
              <p className="text-red-600 text-sm mb-4 p-2 bg-red-100 rounded border border-red-200">
                {apiError}
              </p>
            )}
            {/* Nome */}{" "}
            <label className="block mb-1 font-semibold">Nome:</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Insira o nome da receita"
              className={`w-full p-2 border rounded mb-2 focus:outline-none focus:ring-2

   ${
     errors.nome
       ? "border-red-500 focus:ring-red-500"
       : nome
       ? "border-green-600 focus:ring-green-600"
       : "border-gray-300"
   }

  `}
              disabled={loading}
            />
            {errors.nome && (
              <p className="text-red-500 text-xs mb-2">{errors.nome}</p>
            )}
            {/* Rendimento */}
            <label className="block mb-1 font-semibold">
              Rendimento (porções):
            </label>
            <input
              type="number" // Mantido como type="number" para UX, mas o valor é tratado como string
              value={rendimento}
              onChange={(e) => setRendimento(e.target.value)}
              placeholder="ex: 2"
              min={1}
              className={`w-full p-2 border rounded mb-2 focus:outline-none focus:ring-2

   ${
     errors.rendimento
       ? "border-red-500 focus:ring-red-500"
       : rendimento && parseFloat(rendimento) > 0
       ? "border-green-600 focus:ring-green-600"
       : "border-gray-300"
   }

  `}
              disabled={loading}
            />
            {errors.rendimento && (
              <p className="text-red-500 text-xs mb-2">{errors.rendimento}</p>
            )}
            {/* Ingredientes */}
            <label className="block mb-1 font-semibold">Ingredientes:</label>
            <button
              onClick={() => setShowIngredientesModal(true)}
              className={`px-3 py-1 rounded text-sm mb-2

   ${
     ingredientesSelecionados.length > 0
       ? "bg-green-600 hover:bg-green-700"
       : "bg-gray-400"
   }

   text-white

  `}
              disabled={loading}
            >
              EDITAR LISTA ({ingredientesSelecionados.length})
            </button>
            {errors.ingredientes && (
              <p className="text-red-500 text-xs mb-2">{errors.ingredientes}</p>
            )}
            {Object.keys(errors)
              .filter((key) => key.startsWith("ingrediente"))
              .map((key, index) => (
                <p key={index} className="text-red-500 text-xs mb-2">
                  {errors[key]}
                </p>
              ))}
            {/* Custo de produção */}
            <label className="block mb-1 font-semibold">
              Custo de produção (R$):
            </label>
            <input
              type="text"
              value={custoProducao}
              disabled
              className="w-full p-2 border rounded mb-3 bg-gray-100 border-gray-300"
            />
            {/* Toggle modo de preparo */}
            <p
              className="underline text-sm cursor-pointer mb-3 text-blue-600 hover:text-blue-800"
              onClick={() => setMostrarModoPreparo(!mostrarModoPreparo)}
            >
              {mostrarModoPreparo
                ? "Ocultar modo de preparo"
                : "Modo de preparo"}
            </p>
            {/* Modo de preparo */}
            {mostrarModoPreparo && (
              <textarea
                value={modoPreparo}
                onChange={(e) => setModoPreparo(e.target.value)}
                placeholder="Descreva o modo de preparo da receita (opcional)..."
                className="w-full p-2 border rounded mb-3 bg-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-green-600"
                rows={6}
                disabled={loading}
              />
            )}
            {/* Botões */}
            <div className="flex justify-between">
              <button
                className="bg-orange-400 text-white px-4 py-2 rounded hover:bg-orange-500"
                onClick={onClose}
                disabled={loading}
              >
                VOLTAR
              </button>
              <button
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? "SALVANDO..." : submitButtonText}
              </button>
            </div>
          </div>
        </div>
      )}
      <IngredientSelectorModal
        isOpen={showIngredientesModal}
        onClose={() => {
          setShowIngredientesModal(false);
          // Ação pós-fechamento do modal de ingredientes
          if (idReceita) {
            // Se for edição, re-buscamos a receita para sincronizar.
            fetchIngredients();
          } else {
            // Se for criação, apenas recalculamos o custo com base no estado local.
            recalcularCusto(ingredientesParaCadastrar);
          }
        }}
        // Novo prop para receber a lista de ingredientes do modal
        onSaveIngredients={(newIngredientsList) => {
          // Recebe a lista do modal e a armazena
          setIngredientesParaCadastrar(newIngredientsList);
          // Atualiza a lista de exibição com a mesma lista
          setIngredientesSelecionados(newIngredientsList);
          // Recalcula o custo imediatamente
          recalcularCusto(newIngredientsList);
        }}
        selecionados={ingredientesSelecionados}
        idReceita={idReceita}
      />
    </div>
  );
}
