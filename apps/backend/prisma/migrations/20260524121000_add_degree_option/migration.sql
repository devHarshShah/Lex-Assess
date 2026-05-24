CREATE TABLE "public"."DegreeOption" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DegreeOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DegreeOption_name_key" ON "public"."DegreeOption"("name");
