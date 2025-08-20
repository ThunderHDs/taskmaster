# Guía de Migración: Eliminando Firebase del Proyecto TaskMaster

## 1. Dependencias a Eliminar

### 1.1 Paquetes de Firebase
Eliminar las siguientes dependencias del `package.json`:

```json
// Dependencias a ELIMINAR
"firebase": "^10.12.2",
"react-firebase-hooks": "^5.1.1",
"@genkit-ai/googleai": "^1.14.1",
"@genkit-ai/next": "^1.14.1",
"genkit": "^1.14.1",
"genkit-cli": "^1.14.1"
```

### 1.2 Nuevas Dependencias a Agregar

```json
// Dependencias a AGREGAR
"next-auth": "^4.24.5",
"@next-auth/prisma-adapter": "^1.0.7",
"prisma": "^5.7.1",
"@prisma/client": "^5.7.1",
"bcryptjs": "^2.4.3",
"@types/bcryptjs": "^2.4.6",
"sqlite3": "^5.1.6"
```

## 2. Archivos a Eliminar

### 2.1 Configuración de Firebase
- `src/lib/firebase.ts` - Configuración completa de Firebase
- `.firebaserc` - Configuración del proyecto Firebase
- `apphosting.yaml` - Configuración de Firebase App Hosting
- `src/ai/` - Directorio completo de Genkit AI

### 2.2 Scripts a Eliminar del package.json
```json
// Scripts a ELIMINAR
"genkit:dev": "genkit start -- tsx src/ai/dev.ts",
"genkit:watch": "genkit start -- tsx --watch src/ai/dev.ts"
```

## 3. Archivos a Modificar

### 3.1 src/hooks/useAuth.tsx
**REEMPLAZAR COMPLETAMENTE** con implementación de NextAuth.js:

```typescript
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const loading = status === 'loading';

  const signInWithEmailPassword = async (email: string, password: string) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    
    if (result?.error) {
      throw new Error(result.error);
    }
    
    router.push('/');
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    await signInWithEmailPassword(email, password);
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider value={{
      user: session?.user || null,
      loading,
      signInWithEmailPassword,
      signUpWithEmailPassword,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 3.2 src/app/layout.tsx
**MODIFICAR** para usar NextAuth SessionProvider:

```typescript
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/hooks/useAuth';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

### 3.3 src/components/TaskPage.tsx
**CAMBIOS PRINCIPALES:**

1. **Eliminar imports de Firebase:**
```typescript
// ELIMINAR estas líneas
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
```

2. **Reemplazar con llamadas a API:**
```typescript
// AGREGAR estos imports
import { useSession } from 'next-auth/react';

// REEMPLAZAR las funciones de Firebase con llamadas fetch
const handleToggleComplete = async (id: string, completed: boolean) => {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  
  if (response.ok) {
    // Actualizar estado local
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed } : task
    ));
  }
};
```

### 3.4 src/components/TaskItem.tsx
**CAMBIOS PRINCIPALES:**

1. **Eliminar dependencias de Firebase**
2. **Reemplazar operaciones de base de datos con llamadas a API**
3. **Mantener toda la lógica de UI y validación de fechas**

## 4. Nuevos Archivos a Crear

### 4.1 prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  tasks     Task[]
  tags      Tag[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Task {
  id           String     @id @default(cuid())
  title        String
  description  String?
  dateFrom     DateTime?
  dateTo       DateTime?
  completed    Boolean    @default(false)
  nestingLevel Int        @default(0)
  userId       String
  parentId     String?
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent       Task?      @relation("TaskSubtasks", fields: [parentId], references: [id], onDelete: Cascade)
  subtasks     Task[]     @relation("TaskSubtasks")
  activities   Activity[]
  taskTags     TaskTag[]
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model Activity {
  id        String   @id @default(cuid())
  type      String   // 'comment' | 'log'
  content   String
  timestamp DateTime @default(now())
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
}

model Tag {
  id       String    @id @default(cuid())
  label    String
  color    String
  userId   String
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskTags TaskTag[]
}

model TaskTag {
  taskId String
  tagId  String
  task   Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([taskId, tagId])
}
```

### 4.2 src/lib/prisma.ts
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 4.3 src/pages/api/auth/[...nextauth].ts
```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/login',
  }
});
```

## 5. Comandos de Migración

### 5.1 Instalación de nuevas dependencias
```bash
npm uninstall firebase react-firebase-hooks @genkit-ai/googleai @genkit-ai/next genkit genkit-cli
npm install next-auth @next-auth/prisma-adapter prisma @prisma/client bcryptjs @types/bcryptjs sqlite3
```

### 5.2 Inicialización de Prisma
```bash
npx prisma init
npx prisma generate
npx prisma db push
```

## 6. Variables de Entorno

### 6.1 Crear .env.local
```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret-key-muy-segura

# Database
DATABASE_URL="file:./dev.db"
```

## 7. Funcionalidades que se Mantienen

✅ **Subtareas anidadas hasta 2do nivel** - Se mantiene con validación en base de datos  
✅ **Manejo de conflictos de fechas** - Lógica se mantiene en frontend  
✅ **Historial de actividades** - Se migra a tabla `activities`  
✅ **Autenticación con email** - Se reemplaza Google Auth con credenciales  
✅ **Todas las funcionalidades de UI** - Se mantienen intactas  

## 8. Funcionalidades que se Eliminan

❌ **Autenticación con Google** - Se elimina completamente  
❌ **Sugerencias de subtareas con IA** - Se elimina Genkit AI  
❌ **Sincronización en tiempo real** - Se reemplaza con actualizaciones manuales  
❌ **Almacenamiento en la nube** - Se usa base de datos local  

Esta migración mantiene todas las funcionalidades core solicitadas mientras elimina completamente las dependencias de Firebase y servicios externos.