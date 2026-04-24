-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'sales',
    "region" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FunnelStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slaMin" INTEGER NOT NULL DEFAULT 1,
    "slaTarget" INTEGER NOT NULL DEFAULT 3,
    "slaMax" INTEGER NOT NULL DEFAULT 7,
    "convRateTarget" REAL NOT NULL DEFAULT 0.5
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tglMasuk" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salesId" TEXT NOT NULL,
    "namaProspek" TEXT NOT NULL,
    "channel" TEXT,
    "produkFokus" TEXT,
    "kontakPIC" TEXT,
    "kontakInfo" TEXT,
    "stage" TEXT NOT NULL DEFAULT '1. Lead/Prospek',
    "tglUpdateStage" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextAction" TEXT,
    "estUmkmReach" INTEGER,
    "estNilaiDeal" REAL,
    "probability" REAL,
    "weightedUmkm" REAL,
    "weightedNilai" REAL,
    "hariDiStage" INTEGER NOT NULL DEFAULT 0,
    "statusSLA" TEXT NOT NULL DEFAULT 'On Track',
    "reasonLost" TEXT,
    "linkDokumen" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prospect_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PipelineHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prospectId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "notes" TEXT,
    CONSTRAINT "PipelineHistory_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PipelineHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salesId" TEXT NOT NULL,
    "prospectId" TEXT,
    "tipeAktivitas" TEXT NOT NULL,
    "namaProspek" TEXT,
    "pic" TEXT,
    "topikHasil" TEXT,
    "nextStage" TEXT,
    "catatan" TEXT,
    "linkMOM" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Activity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MOM" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salesId" TEXT NOT NULL,
    "prospectId" TEXT,
    "participants" TEXT,
    "agenda" TEXT,
    "discussion" TEXT,
    "decisions" TEXT,
    "actionItems" TEXT,
    "nextMeeting" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MOM_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MOM_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general'
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelStage_name_key" ON "FunnelStage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Config_key_key" ON "Config"("key");
