# 🔧 Fix: Problema de Closure con isAlphabeticalMode

## 🐛 Problema Identificado

En los logs se veía que cuando se cargaba letra "C", registraba letra "A":

```javascript
Parámetros: { letterStartsWith: "C" }
🔤 Añadido filtro starts_with: C
📊 Datos del backend: { first_product: "ACEITE..." }  // Empieza con A
🅰️ Registrando letra cargada: A  // ❌ Debería ser C
```

### Causa Raíz: Closure Obsoleto

El problema era que `fetchProducts` tenía un **closure obsoleto** de `isAlphabeticalMode`. Cuando se llamaba la función, capturaba el valor del estado en el momento que se creó el callback, no el valor actual.

```javascript
// ❌ ANTES (Problema)
const fetchProducts = useCallback(async (...) => {
  // isAlphabeticalMode aquí puede ser un valor viejo
  if (letterStartsWith && isAlphabeticalMode) {
    // Registra letra incorrecta porque isAlphabeticalMode no es el actual
  }
}, [token, providerId]); // isAlphabeticalMode NO está en dependencias
```

### Por Qué Pasaba

1. Usuario toca "P" → `setIsAlphabeticalMode(false)`
2. Inmediatamente llama `fetchProducts(true, false, '', 'P')`
3. **Pero** `fetchProducts` tiene capturado `isAlphabeticalMode = true` (valor viejo)
4. Dentro de `fetchProducts`: `if (letterStartsWith && isAlphabeticalMode)` → TRUE
5. Registra la letra aunque NO debería (modo no alfabético)

## ✅ Solución: Usar Ref

Usar un **ref** que se actualiza con el estado pero NO causa re-renders de callbacks:

```typescript
// 1. Crear ref
const isAlphabeticalModeRef = useRef<boolean>(true);

// 2. Sincronizar ref con estado
React.useEffect(() => {
  isAlphabeticalModeRef.current = isAlphabeticalMode;
}, [isAlphabeticalMode]);

// 3. Usar ref en lugar de estado dentro de callbacks
const fetchProducts = useCallback(async (...) => {
  const currentIsAlphabeticalMode = isAlphabeticalModeRef.current; // ✅ Siempre actualizado
  
  if (letterStartsWith && currentIsAlphabeticalMode) {
    // Ahora usa el valor ACTUAL, no el capturado
  }
}, [token, providerId]); // No necesita isAlphabeticalMode en dependencias
```

## 🔄 Cómo Funciona Ahora

### Caso: Click en "P"

```javascript
// 1. Usuario toca "P"
handleLetterPress('P')
  └─ setIsAlphabeticalMode(false)
     └─ useEffect actualiza ref
        └─ isAlphabeticalModeRef.current = false

// 2. Llama fetchProducts
fetchProducts(true, false, '', 'P')
  └─ const currentIsAlphabeticalMode = isAlphabeticalModeRef.current
     └─ currentIsAlphabeticalMode = false ✅ (valor actual)
  └─ if (letterStartsWith && currentIsAlphabeticalMode)
     └─ false && false = false ✅
     └─ NO registra en loadedLetters ✅ (correcto!)
```

### Caso: Scroll en Modo Alfabético

```javascript
// 1. Modo alfabético activo
isAlphabeticalMode = true
isAlphabeticalModeRef.current = true

// 2. onViewableItemsChanged detecta letra
onViewableItemsChanged()
  └─ const currentIsAlphabeticalMode = isAlphabeticalModeRef.current
     └─ currentIsAlphabeticalMode = true ✅
  └─ if (!currentIsAlphabeticalMode || ...)
     └─ if (!true || ...) = false
     └─ Continúa y actualiza sidebar ✅
```

## 📊 Comparación

### Antes (Problema)

| Momento | Estado | fetchProducts ve |
|---------|--------|------------------|
| Inicial | `isAlphabeticalMode: true` | `true` |
| Click P → `setIsAlphabeticalMode(false)` | `isAlphabeticalMode: false` | `true` ❌ (viejo) |
| Dentro de fetchProducts | `isAlphabeticalMode: false` | `true` ❌ (closure) |

### Después (Solución)

| Momento | Estado | fetchProducts ve |
|---------|--------|------------------|
| Inicial | `isAlphabeticalMode: true`<br>`ref.current: true` | `ref.current = true` |
| Click P → `setIsAlphabeticalMode(false)` | `isAlphabeticalMode: false`<br>`ref.current: false` ✅ | `ref.current = false` ✅ |
| Dentro de fetchProducts | `isAlphabeticalMode: false`<br>`ref.current: false` ✅ | `ref.current = false` ✅ |

## 🔧 Cambios Realizados

### 1. Agregar Ref
```typescript
const isAlphabeticalModeRef = useRef<boolean>(true);
```

### 2. Sincronizar con Estado
```typescript
React.useEffect(() => {
  isAlphabeticalModeRef.current = isAlphabeticalMode;
}, [isAlphabeticalMode]);
```

### 3. Usar Ref en fetchProducts
```typescript
// Dentro de fetchProducts
const currentIsAlphabeticalMode = isAlphabeticalModeRef.current;

console.log('🔍 Verificando si registrar letra:', {
  letterStartsWith,
  isAlphabeticalMode: currentIsAlphabeticalMode
});

if (letterStartsWith && currentIsAlphabeticalMode) {
  console.log('🅰️ Registrando letra cargada:', letterStartsWith);
  setLoadedLetters(prev => ...);
}
```

### 4. Usar Ref en onViewableItemsChanged
```typescript
onViewableItemsChangedRef.current = ({ viewableItems }: any) => {
  const currentIsAlphabeticalMode = isAlphabeticalModeRef.current;
  
  if (!currentIsAlphabeticalMode || viewableItems.length === 0) {
    return; // Sale correctamente cuando modo no alfabético
  }
  // ...
};
```

## 🎯 Resultado Esperado

Ahora en los logs deberías ver:

### Click en "P"
```
🔤 === handleLetterPress LLAMADO ===
Letra presionada: P
✅ FILTRO: Activando filtro para letra: P
Desactivando modo alfabético (isAlphabeticalMode = false)

📥 === fetchProducts LLAMADO ===
Parámetros: { letterStartsWith: "P" }
🔤 Añadido filtro starts_with: P
📊 Datos del backend: { first_product: "Pan..." }  ← Empieza con P ✅

🔍 Verificando si registrar letra: {
  letterStartsWith: "P",
  isAlphabeticalMode: false  ← ✅ Ahora es false!
}
⚠️ NO registra letra (modo no alfabético): P  ← ✅ Correcto!

👁️ onViewableItemsChanged disparado
isAlphabeticalMode (ref): false  ← ✅ Ahora es false!
❌ Saliendo: modo no alfabético  ← ✅ Correcto!
```

## ✅ Beneficios

1. **Ref siempre actualizado**: No depende de closures
2. **No causa re-renders**: Cambiar ref.current no dispara re-renders
3. **Sincronización inmediata**: useEffect actualiza el ref cuando cambia el estado
4. **Callbacks estables**: fetchProducts y onViewableItemsChanged no necesitan recrearse

## 🧪 Cómo Verificar

1. Toca letra "P"
2. Verifica en logs:
   - ✅ `isAlphabeticalMode (ref): false` en onViewableItemsChanged
   - ✅ `⚠️ NO registra letra (modo no alfabético): P`
   - ✅ `letterStartsWith: "P"` coincide con productos recibidos
3. NO debería volver a "A" automáticamente

---

**Estado**: ✅ Corregido con Refs
**Problema**: Closure obsoleto capturaba valor viejo de `isAlphabeticalMode`
**Solución**: Usar ref que se actualiza pero no causa re-renders
