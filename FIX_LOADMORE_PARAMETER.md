# 🔧 Fix: Parámetro loadMore en Carga Automática

## ❌ Problema

Cuando se detectaba una nueva letra durante el scroll, la carga fallaba porque:

```
LOG  ✅ Letra cambió: B → C
LOG  ⚠️ Letra C NO está cargada, iniciando carga...
LOG  🚀 Llamando fetchProducts(false, true, '', 'C', false)
                                         ^^^^
                                      loadMore=true (INCORRECTO)
LOG  ⚠️ loadMore=true pero no hay nextUrl, saliendo
```

### Causa del Error

`onViewableItemsChanged` llamaba a `fetchProducts` con `loadMore=true`, lo que indica **paginación de la letra actual**. Pero como era una **nueva letra**, no había `nextUrl` disponible y la función salía inmediatamente sin cargar nada.

```typescript
// ANTES (INCORRECTO)
fetchProducts(false, true, '', firstLetter, isPrevious);
//                     ^^^^
//                     loadMore=true → Espera nextUrl → Falla
```

## ✅ Solución

### 1. Cambiar `loadMore` a `false` para Nuevas Letras

Cuando se detecta una **nueva letra** en scroll, debe llamarse con `loadMore=false`:

```typescript
// DESPUÉS (CORRECTO)
fetchProducts(false, false, '', firstLetter, isPrevious);
//                    ^^^^^
//                    loadMore=false → Nueva letra → Construye URL con starts_with
```

### 2. Modificar Lógica de Agregado

La lógica de agregado (append/prepend) ahora funciona también con `loadMore=false` cuando es una nueva letra en modo alfabético:

```typescript
// Si hay datos existentes y queremos agregar
const shouldAppend = (
  loadMore || // Paginación normal
  (letterStartsWith && isAlphabeticalMode) // Nueva letra en modo alfabético
) && dataRef.current && dataRef.current.length > 0;

if (shouldAppend && dataRef.current) {
  const newProducts = productsData.results.filter(/* sin duplicados */);
  
  if (prependMode) {
    setData([...newProducts, ...dataRef.current]); // Inicio
  } else {
    setData([...dataRef.current, ...newProducts]); // Final
  }
} else {
  setData(productsData.results); // Reemplazo completo
}
```

## 📊 Diferencia Entre loadMore=true y loadMore=false

### `loadMore=true` - Paginación de Letra Actual
```typescript
// Caso: Usuario llegó al final de productos "A" (página 1)
// Hay más productos "A" (página 2, 3, etc.)

fetchProducts(false, true); // Sin letterStartsWith
→ Usa nextUrl: /api/products/?starts_with=A&page=2
→ Agrega más productos "A" al final
```

### `loadMore=false` - Nueva Letra
```typescript
// Caso: Usuario scroll de "A" a "B" (nueva letra)

fetchProducts(false, false, '', 'B', false);
→ Construye URL: /api/products/?starts_with=B&page_size=100
→ Agrega productos "B" al final (o inicio si prepend)
```

## 🔄 Flujos Corregidos

### Flujo 1: Scroll Hacia Abajo (A → B → C)

```
Estado: [productos A]
Usuario scroll ↓
   ↓
Detecta "B" visible
   ↓
loadedLetters NO incluye "B"
   ↓
fetchProducts(false, false, '', 'B', false)
                     ^^^^^
                     Nueva letra, no paginación
   ↓
URL: /api/products/?starts_with=B&page_size=100
   ↓
Recibe 35 productos "B"
   ↓
shouldAppend = true (letterStartsWith && isAlphabeticalMode)
prependMode = false
   ↓
APPEND: [productos A, productos B]
   ↓
loadedLetters = ['A', 'B']
```

### Flujo 2: Scroll Hacia Arriba (D → C → B)

```
Estado: [productos D, E, F]
Usuario scroll ↑
   ↓
Detecta "C" visible
   ↓
'C' < 'D' → isPrevious = true
   ↓
fetchProducts(false, false, '', 'C', true)
                     ^^^^^        ^^^^
                     Nueva letra  prepend
   ↓
URL: /api/products/?starts_with=C&page_size=100
   ↓
Recibe 28 productos "C"
   ↓
shouldAppend = true
prependMode = true
   ↓
PREPEND: [productos C, productos D, E, F]
   ↓
loadedLetters = ['C', 'D', 'E', 'F']
```

### Flujo 3: Paginación Normal (Letra con >100 productos)

```
Estado: [100 productos A (página 1)]
Usuario scroll ↓ hasta el final
   ↓
onEndReached se dispara
   ↓
hasNextPage = true
nextUrl = "/api/products/?starts_with=A&page=2"
loadMoreProducts() llama:
fetchProducts(false, true)
                    ^^^^
                    Paginación normal
   ↓
Usa nextUrl## 📋 Manejo de Paginación

### Page Size
- **Valor**: `200` productos por página (máximo del backend)
- **URL**: `/api/products/?page_size=200` productos A página 2]
   ↓
Sigue igual letra "A", más productos
## 📋 Matriz de Decisión
{{ ... }}
| Escenario | loadMore | letterStartsWith | Resultado |
|-----------|----------|------------------|-----------|
| Nueva letra (scroll) | `false` | `'B'` | Construye URL con `starts_with=B` |
| Paginación normal | `true` | - | Usa `nextUrl` |
| Clic en índice | `false` | `'M'` | Reemplazo completo (modo no alfabético) |
| Refresh | `false` | `'A'` | Reemplazo completo |

## 🎯 Logs Esperados Ahora

### Carga Exitosa de Nueva Letra

```
=== onViewableItemsChanged DISPARADO ===
Primer item visible: CACAO COLACAO 383G
Primera letra detectada: C
Letra actual (currentLetter): B
Letras cargadas (loadedLetters): ["A", "B"]
✅ Letra cambió: B → C
⚠️ Letra C NO está cargada, iniciando carga...
Dirección: APPEND (↓ abajo)
🚀 Llamando fetchProducts(false, false, '', 'C', false)
                                   ^^^^^
                                   CORREGIDO

📥 === fetchProducts LLAMADO ===
Parámetros: {
  isRefresh: false,
  loadMore: false,  ← CORREGIDO
  searchName: '',
  letterStartsWith: 'C',
  prependMode: false
}
🔤 Añadido filtro starts_with: C
🌐 URL construida: /api/products/?provider=6&ordering=name&page_size=100&starts_with=C
📦 Productos recibidos: 28
🚫 Productos filtrados (sin duplicados): 28
📄 Productos existentes: 200
⬇️ APPEND: Agregando al FINAL
✅ Total después de append: 228
🅰️ Actualizando loadedLetters: [A, B] → [A, B, C]
✅ === fetchProducts FINALIZADO ===
```

## ✅ Beneficios

1. **Carga funcional**: Las nuevas letras ahora se cargan correctamente
2. **URL correcta**: Usa `starts_with` en lugar de esperar `nextUrl`
3. **Append/Prepend**: Funciona correctamente en ambas direcciones
4. **Paginación preservada**: `loadMore=true` sigue funcionando para páginas 2, 3, etc.
5. **Logs claros**: Fácil identificar tipo de carga

## 🔍 Verificación

Para confirmar que funciona:
1. Abre la app
2. Haz scroll desde "A" hacia "B", "C", "D"
3. Observa logs: cada letra debe cargarse exitosamente
4. NO debes ver: `⚠️ loadMore=true pero no hay nextUrl, saliendo`

---

**Estado**: ✅ Problema resuelto - Nuevas letras se cargan correctamente
