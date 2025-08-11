## Estrutura de pastas.

docs<br/>
├── *arquivos referentes à documentação (Diagrama, ECU's, ERN's, Glossário, misc, usage)<br/>
src<br/>
├── BACKEND<br/>
│   └── API_CONFEITARIA<br/>
│       ├── *arquivos da aplicação (controllers, node_modules, prisma, routes, app.js, server.js, ...)<br/>
│       └── tests (convencionalmente colocados aqui pois utilizam as dependências instaladas na pasta)<br/>
│           └── unit<br/>
│               ├── ... (*testes das utils)<br/>
│               └── ... (*testes dos controllers)<br/>
├── FRONTEND<br/>
│   └── SEC<br/>
│       ├── node_modules<br/>
│       ├── src<br/>
│       │   └── *arquivos da aplicação (...)<br/>
│       └── ...<br/>
