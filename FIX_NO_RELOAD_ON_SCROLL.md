# 🔧 Fix: No Recargar al Scroll (Solo Actualizar Sidebar)

## 🐛 Problema

Cuando el usuario hacía scroll y volvía a pasar por la letra "A" (ya cargada), el sistema la recargaba completamente en lugar de solo actualizar el indicador visual en el sidebar.

```
Usuario scrollea:
A (visible) → B (visible) → Vuelve a A
   ↓              ↓              ↓
 Carga A      Carga B      ❌ RECARGA A (mal)
```

## ✅ Solución

Separar la **detección visual de letra** (para sidebar) de la **carga de datos** (solo cuando es necesario).

### Implementación

#### 1. Refs para onViewableItemsChanged

```typescript
// Refs para onViewableItemsChanged (deben ser estables)
const viewabilityConfigRef = useRef({
  itemVisiblePercentThreshold: 50,  // 50% visible para contar
  minimumViewTime: 100,              // 100ms mínimo
});
const onViewableItemsChangedRef = useRef<any>(null);
```

#### 2. Efecto para Detección Visual

```typescript
// Efecto para actualizar onViewableItemsChanged
React.useEffect(() => {
  onViewableItemsChangedRef.current = ({ viewableItems }: any) => {
    if (!isAlphabeticalMode || viewableItems.length === 0) return;
    
    const firstVisibleItem = viewableItems[0]?.item;
    
    if (firstVisibleItem && firstVisibleItem.name) {
      const firstLetter = firstVisibleItem.name.charAt(0).toUpperCase();
      
      // Solo actualizar currentLetter si la letra es válida y diferente
      // NO recargar datos, solo actualizar el visual del sidebar
      if (/[A-Z]/.test(firstLetter) && firstLetter !== currentLetter) {
        setCurrentLetter(firstLetter);  // ✅ Solo actualiza visual
        // ❌ NO llama fetchProducts()
      }
    }
  };
}, [isAlphabeticalMode, currentLetter]);
```

#### 3. Props del FlatList

```tsx
<FlatList
  data={data || []}
  onViewableItemsChanged={onViewableItemsChangedRef.current}
  viewabilityConfig={viewabilityConfigRef.current}
  onEndReached={loadMoreProducts}
  // ... otros props
/>
```

## 🔄 Flujo Correcto Ahora

### Caso 1: Scroll Hacia Abajo (Nueva Letra)

```
Usuario scrollea de A a B:
   ↓
onViewableItemsChanged detecta "B" visible
   ↓
currentLetter = "B" (actualiza sidebar visual)
   ↓
Usuario sigue scrolleando hasta el final
   ↓
onEndReached dispara loadMoreProducts()
   ↓
hasNextPage = false
   ↓
getNextLetter() retorna "C"
   ↓
fetchProducts(false, false, '', 'C')  ← Solo aquí carga datos
   ↓
Productos de C se agregan al final
```

### Caso 2: Scroll Hacia Arriba (Letra Ya Cargada)

```
Usuario scrollea de C de vuelta a A:
   ↓
onViewableItemsChanged detecta "A" visible
   ↓
currentLetter = "A" (actualiza sidebar visual)
   ↓
✅ NO recarga datos de A (ya están en memoria)
   ↓
Sidebar muestra "A" en verde
Datos ya están ahí, solo scroll
```

## 📊 Comparación

### Antes (Problema)

```typescript
// ❌ Cargaba cada vez que detectaba letra
if (firstLetter !== currentLetter) {
  setCurrentLetter(firstLetter);
  fetchProducts(false, false, '', firstLetter);  // ❌ Recarga siempre
}
```

### Después (Solución)

```typescript
// ✅ Solo actualiza visual
if (firstLetter !== currentLetter) {
  setCurrentLetter(firstLetter);  // ✅ Solo actualiza sidebar
  // NO llama fetchProducts
}

// Carga de datos solo en onEndReached
onEndReached → loadMoreProducts() → fetchProducts()
```

## 🎯 Cuándo Se Cargan Datos Ahora

| Evento | Carga Datos | Actualiza Sidebar |
|--------|-------------|-------------------|
| **onViewableItemsChanged** | ❌ NO | ✅ Sí |
| **onEndReached (nueva letra)** | ✅ Sí | ✅ Sí |
| **Click en letra** | ✅ Sí | ✅ Sí |
| **Refresh** | ✅ Sí | ✅ Sí |
| **Búsqueda** | ✅ Sí | ✅ Sí |

## 🧪 Testing

### Test 1: Scroll Hacia Abajo
```
1. Abre app → Muestra productos con A
2. Scrollea → Sidebar cambia a B (sin recargar)
3. Sigue scrolleando al final → Carga productos con B
4. ✅ B se agrega al final, no reemplaza
```

### Test 2: Scroll Hacia Arriba
```
1. Tienes A y B cargados
2. Scrollea hacia arriba
3. Sidebar cambia a A (cuando ves productos con A)
4. ✅ NO recarga A, solo actualiza sidebar
5. Productos de A ya están ahí
```

### Test 3: Click en Letra
```
1. Tienes A, B, C cargados
2. Click en "M" en sidebar
3. ✅ Carga productos con M (reemplazo completo)
4. Sidebar muestra M en verde
```

## 🔧 Detalles Técnicos

### viewabilityConfig

```typescript
{
  itemVisiblePercentThreshold: 50,  // Item es "visible" si 50%+ está en pantalla
  minimumViewTime: 100,              // Debe estar visible al menos 100ms
}
```

### onViewableItemsChanged

- Dispara cuando items entran/salen del viewport
- Recibe array de `viewableItems`
- Usa el primer item visible para determinar letra
- Solo actualiza `currentLetter` (estado visual)
- NO llama `fetchProducts()`

### loadMoreProducts

- Dispara cuando llegas al final (onEndReached)
- Verifica `hasNextPage`
- Si no hay más páginas Y en modo alfabético:
  - Llama `getNextLetter()`
  - SI hay siguiente letra → `fetchProducts()` ← Aquí carga
  - SI no hay → Fin (todas las letras cargadas)

## 📝 Cambios Realizados

1. ✅ Agregado `viewabilityConfigRef`
2. ✅ Agregado `onViewableItemsChangedRef`
3. ✅ Creado useEffect para actualizar onViewableItemsChanged
4. ✅ Agregado props al FlatList:
   - `onViewableItemsChanged`
   - `viewabilityConfig`

## 🎯 Resultado

- ✅ Sidebar se actualiza en tiempo real al scrollear
- ✅ NO recarga datos innecesariamente
- ✅ Solo carga cuando se necesitan datos nuevos
- ✅ Smooth scroll sin interrupciones
- ✅ Mejor performance (menos peticiones al backend)

---

**Estado**: ✅ Corregido
**Comportamiento**: Solo actualiza sidebar, no recarga datos
