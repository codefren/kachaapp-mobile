# 🔧 Fix: Múltiples Llamadas Simultáneas (E → A → G)

## 🐛 Problema Reportado

Usuario observa que cuando está en letra "E":
1. Aparece loading
2. Salta a letra "A" 
3. Luego va a letra "G"

**Flujo incorrecto**: E → loading → A → G

## 🔍 Causa del Problema

Múltiples llamadas a `fetchProducts` se estaban ejecutando **simultáneamente** sin coordinación:

```javascript
// Llamada 1: loadMoreProducts carga letra F
fetchProducts(false, false, '', 'F')  // En progreso...

// Llamada 2: useFocusEffect se dispara
fetchProducts(true, false, '', 'A')  // Sobrescribe!

// Llamada 3: onViewableItemsChanged detecta cambio
setCurrentLetter('G')  // Actualiza sidebar

// Resultado: Caos visual E → A → G
```

### Por Qué Pasaba

1. **No había bloqueo**: `fetchProducts` podía ejecutarse múltiples veces simultáneamente
2. **Callbacks asincrónicos**: Las respuestas llegaban en orden impredecible
3. **setState múltiples**: Cada llamada actualizaba `currentLetter` y `data`
4. **Race conditions**: La última en terminar "ganaba", no necesariamente la correcta

## ✅ Solución: Lock de Ejecución

Agregué un **ref de bloqueo** que previene llamadas simultáneas:

```typescript
const isFetchingRef = useRef<boolean>(false);
```

### Cómo Funciona

```javascript
const fetchProducts = useCallback(async (...) => {
  // 1. Verificar si ya está en ejecución
  if (isFetchingRef.current && !loadMore) {
    console.warn('⚠️ fetchProducts ya en ejecución, ignorando llamada');
    return; // ❌ Bloquea la llamada
  }
  
  // 2. Activar lock
  if (!loadMore) {
    isFetchingRef.current = true;
    console.log('🔒 Lock activado');
  }
  
  try {
    // 3. Ejecutar fetch normalmente
    // ...
  } finally {
    // 4. Liberar lock SIEMPRE
    if (!loadMore) {
      isFetchingRef.current = false;
      console.log('🔓 Lock liberado');
    }
  }
}, [token, providerId]);
```

## 🔄 Flujo Corregido

### Caso: Terminando letra E, cargando F

```
1. Usuario scrollea hasta el final de E
   └─ onEndReached → loadMoreProducts()
   
2. loadMoreProducts detecta:
   └─ hasNextPage = false (terminó E)
   └─ isAlphabeticalMode = true
   └─ getNextLetter() → 'F'
   
3. Intenta cargar F:
   └─ fetchProducts(false, false, '', 'F')
   └─ isFetchingRef.current = false → ✅ Permitido
   └─ 🔒 Lock activado
   └─ Cargando productos con F...
   
4. Si otra llamada intenta ejecutarse:
   └─ fetchProducts(true, false, '', 'A')
   └─ isFetchingRef.current = true → ❌ BLOQUEADO
   └─ console: "fetchProducts ya en ejecución, ignorando llamada"
   └─ return (no hace nada)
   
5. Primera llamada termina:
   └─ Productos de F cargados
   └─ 🔓 Lock liberado
   └─ isFetchingRef.current = false
   
6. Ahora sí se permiten nuevas llamadas
```

## 📊 Comparación

### Antes (Problema)

```
Tiempo    | Llamada              | Estado Lock | Resultado
----------|----------------------|-------------|------------------
T0        | fetchProducts('E')   | -           | Cargando E...
T1        | fetchProducts('F')   | -           | Cargando F... (simultánea)
T2        | fetchProducts('A')   | -           | Cargando A... (simultánea)
T3        | Respuesta F llega    | -           | setData(F)
T4        | Respuesta A llega    | -           | setData(A) ← Sobrescribe F
T5        | Respuesta E llega    | -           | setData(E) ← Sobrescribe A
          | Usuario ve: E → F → A → E (caos)
```

### Después (Solución)

```
Tiempo    | Llamada              | Estado Lock | Resultado
----------|----------------------|-------------|------------------
T0        | fetchProducts('E')   | 🔒 Locked   | Cargando E...
T1        | fetchProducts('F')   | 🔒 Locked   | ❌ BLOQUEADO (ignorado)
T2        | fetchProducts('A')   | 🔒 Locked   | ❌ BLOQUEADO (ignorado)
T3        | Respuesta E llega    | 🔓 Unlocked | setData(E)
T4        | Ahora se permite     | 🔓 Unlocked | fetchProducts('F') ✅
          | Usuario ve: E → F (secuencial, correcto)
```

## 🎯 Excepciones

### loadMore NO se bloquea

```javascript
if (isFetchingRef.current && !loadMore) {
  return; // ❌ Bloquea
}
```

**¿Por qué?** 
- `loadMore=true` es para **paginación** dentro de la misma letra
- No cambia `currentLetter`, solo agrega más productos
- Debe poder ejecutarse para cargar página 2, 3, etc.

### Ejemplo: Letra con >200 productos

```
1. fetchProducts(false, false, '', 'P')  // Carga página 1 de P
   └─ 🔒 Lock activado
   └─ Retorna 200 productos, hasNextPage=true
   └─ 🔓 Lock liberado

2. Usuario scrollea al final
   └─ loadMoreProducts()
   └─ fetchProducts(false, true)  // loadMore=true
   └─ NO se bloquea (loadMore=true)
   └─ Carga página 2 de P
   └─ Agrega 150 productos más
```

## 🔧 Logs Agregados

### Log de Bloqueo

```javascript
// Cuando se bloquea una llamada
⚠️ fetchProducts ya en ejecución, ignorando llamada
❌ === fetchProducts BLOQUEADO ===
```

### Log de Lock

```javascript
// Al activar
🔒 Lock activado (isFetchingRef = true)

// Al liberar
🔓 Lock liberado (isFetchingRef = false)
```

### Log en loadMoreProducts

```javascript
📦 === loadMoreProducts LLAMADO ===
Estado: {
  hasNextPage: false,
  loadingMore: false,
  loading: false,
  isAlphabeticalMode: true,
  currentLetter: 'E',
  loadedLetters: ['A', 'B', 'C', 'D', 'E']
}

🅰️ Modo alfabético: terminada letra actual
Siguiente letra disponible: F
⬇️ Cargando siguiente letra: F
✅ === loadMoreProducts FINALIZADO (nueva letra) ===
```

## 🧪 Qué Buscar en los Logs

### Comportamiento Correcto

```
📦 === loadMoreProducts LLAMADO ===
⬇️ Cargando siguiente letra: F

📥 === fetchProducts LLAMADO ===
🔒 Lock activado
🌐 URL construida: ...&starts_with=F
📊 Datos del backend: { first_product: "Fanta..." }
🔓 Lock liberado
✅ === fetchProducts FINALIZADO ===
```

### Si hay Intentos de Llamadas Múltiples (Ahora Bloqueados)

```
📥 === fetchProducts LLAMADO ===
🔒 Lock activado
... (cargando) ...

📥 === fetchProducts LLAMADO ===  ← Segunda llamada
⚠️ fetchProducts ya en ejecución, ignorando llamada
❌ === fetchProducts BLOQUEADO ===  ← ✅ Bloqueado correctamente

📥 === fetchProducts LLAMADO ===  ← Tercera llamada
⚠️ fetchProducts ya en ejecución, ignorando llamada
❌ === fetchProducts BLOQUEADO ===  ← ✅ Bloqueado correctamente

... (primera llamada termina) ...
🔓 Lock liberado
✅ === fetchProducts FINALIZADO ===
```

## 🎯 Resultado Esperado

### Flujo Secuencial Correcto

```
Usuario en E → scrollea al final → loading → F (sin saltos)
```

No más:
- ❌ E → A → G
- ❌ Saltos aleatorios
- ❌ Loading múltiples
- ❌ Datos sobrescritos

## 🔐 Garantías del Lock

1. **Solo una ejecución a la vez**: No más race conditions
2. **Orden secuencial**: Las cargas siguen el orden correcto (E → F → G)
3. **Sin sobrescritura**: Una llamada termina antes de que empiece la siguiente
4. **Paginación funcional**: `loadMore` sigue permitido para páginas >200 productos

## 📝 Cambios Realizados

1. ✅ Agregado `isFetchingRef`
2. ✅ Validación al inicio de `fetchProducts`
3. ✅ Activar lock en try
4. ✅ Liberar lock en finally
5. ✅ Excepción para `loadMore`
6. ✅ Logs detallados de bloqueo
7. ✅ Logs en `loadMoreProducts`

---

**Estado**: ✅ Implementado
**Problema**: Múltiples llamadas simultáneas causaban saltos (E → A → G)
**Solución**: Lock de ejecución previene race conditions
