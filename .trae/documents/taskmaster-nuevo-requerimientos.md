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

* `src/lib/firebase.ts` - Configuración completa de Firebase

* `.firebaserc` - Configuración del proyecto Firebase

* `apphosting.yaml` - Configuración de Firebase App Hosting

* <br />

