# Database Setup Instructions

## Using the Database Backup

This repository includes a database backup file (`database_backup.db`) with test data that you can use to quickly set up the TaskMaster application in any environment.

### Setup Steps:

1. **Copy the backup database:**
   ```bash
   cp database_backup.db prisma/dev.db
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Start the application:**
   ```bash
   npm run dev
   ```

### What's included in the test data:

- Sample tasks with different priorities and statuses
- Task groups for organization
- Tags for categorization
- Activity logs showing task history
- Subtask relationships
- Date conflict examples

### Alternative: Fresh Database

If you prefer to start with a fresh database:

1. **Reset the database:**
   ```bash
   npx prisma db push --force-reset
   ```

2. **Seed with sample data (optional):**
   ```bash
   npx prisma db seed
   ```

### Database Schema

The database uses SQLite and includes the following main tables:
- `tasks` - Main task entities
- `task_groups` - Task organization groups
- `tags` - Task categorization tags
- `task_tags` - Many-to-many relationship between tasks and tags
- `date_conflicts` - Conflict detection system
- `activity_logs` - Task change history

For more details, check the `prisma/schema.prisma` file.