-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "rollNumber" TEXT,
    "fullName" TEXT NOT NULL,
    "practiceArea" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "commonScore" DOUBLE PRECISION NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_key" ON "Certificate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationCode_key" ON "Certificate"("verificationCode");

-- CreateIndex
CREATE INDEX "Certificate_verificationCode_idx" ON "Certificate"("verificationCode");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
