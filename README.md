## Estrutura de pastas.

├── *arquivos referentes à documentação (Diagrama, ECU's, ERN's, Glossário, misc, usage)
src
├── BACKEND
│   └── API_CONFEITARIA
│       ├── *arquivos da aplicação (controllers, node_modules, prisma, routes, app.js, server.js, ...)
│       └── tests (convencionalmente colocados aqui pois utilizam as dependências instaladas na pasta)
│           └── unit
│               ├── ... (*testes das utils)
│               └── ... (*testes dos controllers)  
├── FRONTEND
│   └── SEC
│       ├── node_modules
│       ├── src
│       │   └── *arquivos da aplicação (...)
│       └── ...
