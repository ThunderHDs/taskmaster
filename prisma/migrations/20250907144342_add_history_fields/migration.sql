-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_activity_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "comment" TEXT,
    "isUserComment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_activity_logs" ("action", "createdAt", "details", "id", "taskId") SELECT "action", "createdAt", "details", "id", "taskId" FROM "activity_logs";
DROP TABLE "activity_logs";
ALTER TABLE "new_activity_logs" RENAME TO "activity_logs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
