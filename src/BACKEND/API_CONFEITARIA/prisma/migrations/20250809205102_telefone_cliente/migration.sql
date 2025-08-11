/*
  Warnings:

  - Added the required column `telefoneCliente` to the `tbPedido` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tbPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dataPedido" TEXT NOT NULL,
    "nomeCliente" TEXT NOT NULL,
    "valorTotal" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "telefoneCliente" TEXT NOT NULL
);
INSERT INTO "new_tbPedido" ("dataPedido", "id", "nomeCliente", "status", "valorTotal") SELECT "dataPedido", "id", "nomeCliente", "status", "valorTotal" FROM "tbPedido";
DROP TABLE "tbPedido";
ALTER TABLE "new_tbPedido" RENAME TO "tbPedido";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
