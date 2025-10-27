# KCH Digital Frontend 🚀

Una aplicación React Native moderna construida con Expo, TypeScript y una arquitectura escalable.

## 🏗️ Arquitectura del Proyecto

```
├── app/                    # Rutas de la aplicación (Expo Router)
├── components/            # Componentes reutilizables
│   └── auth/             # Componentes de autenticación
├── context/              # Contextos de React (estado global)
├── middleware/           # Middleware para API y requests
├── services/             # Servicios de API
├── types/                # Tipos TypeScript
└── utils/                # Utilidades y helpers
```

## 🚀 Inicio Rápido

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```

3. **Iniciar la aplicación**
   ```bash
   npx expo start
   ```

## 🔧 Tecnologías Principales

- **Expo SDK 54** - Framework de desarrollo
- **React Native 0.81** - Framework móvil
- **TypeScript** - Tipado estático
- **NativeWind** - Tailwind CSS para React Native
- **Expo Router** - Navegación basada en archivos

## 📱 Características Implementadas

### ✅ Sistema de Autenticación
- **Login Form** - Componente reutilizable
- **Context API** - Manejo de estado global
- **Middleware API** - Interceptores de requests/responses
- **TypeScript Types** - Tipado completo para auth

### 🔒 Middleware de API
- **Singleton Pattern** - Instancia única del middleware
- **Token Management** - Manejo automático de tokens
- **Error Handling** - Manejo centralizado de errores
- **Request Interceptors** - Interceptores para requests
- **Response Interceptors** - Interceptores para responses

### 🎨 UI/UX
- **Diseño Moderno** - Interfaz limpia y profesional
- **Modo Oscuro** - Soporte completo
- **Responsive** - Adaptable a diferentes pantallas
- **Animaciones** - Transiciones suaves

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
# kachaapp-mobile
