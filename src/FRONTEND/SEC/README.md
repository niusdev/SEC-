## Anotações sobre o projeto.

- campo de senha ainda não foi validado completamente
- a questão do cadastro de ingredietes deve ser revisada! Devo modificar back e front para pesoOuVolume ser opcional.
- revisar a lógica da tabela de ingredientes antes de fazer a de receitas. (revisar o backend para ver se o produto está sendo usado em uma receita presente no pedido)
- estudar o código para aplicar as demais páginas
- após isso refatorar e limpar o código (centralizar as funções de buscar por id e nome em um hook só)

# Análise de ERN

> Autocadastro (senha) 
    Senha que o usuário
    irá usar para logar no
    sistema. Deve conter
    letras maiúsculas,
    minúsculas, números
    e caracteres.

> Autocadastro (nome)
    "Nome completo inválido.
    Use apenas letras e espaços."

# Modificações a fazer: 
> Estoque:  
- ao editar exibir a mensagem "Confirma a alteração das informações do produto [Nome do Produto]?"

.obs:
- "Unidades" na tela de cadastro/edição de produto está relacionado a quantidade que estamos cadastrando.
- "Data de validade não pode ser no passado"


# ANOTAÇÕES - MEXER NO GETBYID NO HOOK USESTOCK  
