# TaskMaster - Guía de Desarrollo 🚀

## 📋 Estado Actual del Proyecto

**Versión:** 1.5 - Desarrollo Activo  
**Última actualización:** Enero 2025  
**Repositorio:** https://github.com/ThunderHDs/taskmaster.git

### ✅ Funcionalidades Implementadas

- ✅ **Gestión completa de tareas** (CRUD)
- ✅ **Selección múltiple y eliminación masiva**
- ✅ **Sistema de grupos y etiquetas**
- ✅ **Calendario integrado**
- ✅ **Detección de conflictos de fechas**
- ✅ **Historial de cambios**
- ✅ **Interfaz responsive con Tailwind CSS**
- ✅ **Base de datos SQLite con Prisma ORM**
- ✅ **API REST completa**

### 🔧 Stack Tecnológico

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Base de Datos:** SQLite + Prisma ORM
- **Desarrollo:** Node.js 18+, npm

## 🚀 Instalación Rápida

### Prerrequisitos
- Node.js 18 o superior
- npm (incluido con Node.js)
- Git

### Pasos de Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/ThunderHDs/taskmaster.git
cd taskmaster

# 2. Instalar dependencias
npm install

# 3. Configurar base de datos
npx prisma generate
npx prisma db push

# 4. Ejecutar en modo desarrollo
npm run dev
```

**URL de desarrollo:** http://localhost:3000

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── tasks/         # Endpoints de tareas
│   │   └── groups/        # Endpoints de grupos
│   ├── calendar/          # Página del calendario
│   └── page.tsx           # Página principal
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn)
│   ├── TaskList.tsx      # Lista principal de tareas
│   ├── BulkDeleteModal.tsx # Modal eliminación masiva
│   ├── Calendar.tsx      # Componente calendario
│   └── ...
├── lib/                  # Utilidades y configuración
│   ├── prisma.ts        # Cliente Prisma
│   └── utils.ts         # Funciones auxiliares
└── types/               # Definiciones TypeScript
    └── task.ts          # Tipos de tareas
```

## 🔄 Flujo de Desarrollo

### Para Nuevas Funcionalidades

1. **Crear rama de feature:**
   ```bash
   git checkout -b feature/nombre-funcionalidad
   ```

2. **Desarrollar y probar localmente:**
   ```bash
   npm run dev
   ```

3. **Commit y push:**
   ```bash
   git add .
   git commit -m "feat: descripción de la funcionalidad"
   git push origin feature/nombre-funcionalidad
   ```

4. **Merge a main:**
   ```bash
   git checkout main
   git merge feature/nombre-funcionalidad
   git push origin main
   ```

### Comandos Útiles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción

# Base de datos
npx prisma studio    # Interfaz visual de BD
npx prisma generate  # Regenerar cliente
npx prisma db push   # Aplicar cambios de schema

# Linting y formato
npm run lint         # Verificar código
npm run lint:fix     # Corregir automáticamente
```

## 🐛 Debugging y Logs

### Logs de Desarrollo
- **Frontend:** Console del navegador (F12)
- **Backend:** Terminal donde corre `npm run dev`
- **Base de datos:** `npx prisma studio`

### Problemas Comunes

1. **Error de dependencias:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Error de Prisma:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Puerto ocupado:**
   - Cambiar puerto en `package.json`
   - O cerrar proceso: `npx kill-port 3000`

## 📝 Próximas Mejoras Planificadas

### 🎯 Prioridad Alta
- [ ] **Sistema de notificaciones push**
- [ ] **Filtros avanzados por fecha/prioridad**
- [ ] **Exportación de datos (PDF/Excel)**
- [ ] **Modo offline con sincronización**

### 🔄 Prioridad Media
- [ ] **Temas personalizables (dark/light)**
- [ ] **Atajos de teclado**
- [ ] **Drag & drop para reordenar**
- [ ] **Comentarios en tareas**

### 🚀 Prioridad Baja
- [ ] **Integración con calendarios externos**
- [ ] **Colaboración multi-usuario**
- [ ] **API pública con autenticación**
- [ ] **App móvil (React Native)**

## 🔧 Configuración de Desarrollo

### Variables de Entorno
Crear `.env.local`:
```env
# Base de datos
DATABASE_URL="file:./prisma/taskmaster.db"

# Desarrollo
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Extensiones Recomendadas (VS Code)
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Prisma
- TypeScript Importer
- Auto Rename Tag

## 📞 Contacto y Soporte

**Desarrollador:** Tu Asistente AI  
**Repositorio:** https://github.com/ThunderHDs/taskmaster  
**Documentación:** Ver archivos en `/docs/`

---

**¡Listo para desarrollar! 🎉**

Esta aplicación está optimizada para desarrollo local y es perfecta para probar nuevas funcionalidades. Todos los datos se guardan localmente y la aplicación funciona completamente offline una vez instalada.