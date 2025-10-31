# 🔄 Scroll Bidireccional Alfabético

## ✨ Nueva Funcionalidad Implementada

Se ha agregado **scroll bidireccional** al sistema de paginación alfabética:
- **Scroll ↓ (abajo)**: Carga siguiente letra (D si estás en C)
- **Scroll ↑ (arriba)**: Carga letra anterior (B si estás en C)

## 🎯 Cómo Funciona

### Scroll hacia ABAJO (⬇️)
```
Estás viendo productos con "C"
       ↓
Haces scroll hacia abajo
       ↓
Llegas al final de "C"
       ↓
Toast "D" (800ms)
       ↓
Automáticamente carga "D"
       ↓
Los productos "D" aparecen DESPUÉS de "C"
```

### Scroll hacia ARRIBA (⬆️) - ¡NUEVO!
```
Estás viendo productos con "C"
       ↓
Haces scroll hacia arriba
       ↓
Llegas cerca del inicio (< 100px)
       ↓
Toast "B" (800ms)
       ↓
Automáticamente carga "B"
       ↓
Los productos "B" aparecen ANTES de "C"
```

## 📱 Experiencia Visual

```
┌──────────────────────────┐
│ [Cargando B...]      ↑   │ ← Indicador superior
│ ────────────────          │
│ 📦 Bebida (B)            │ ← Agregado al inicio
│ 📦 Bolsas (B)            │
│ ────────────────          │
│ 📦 Café (C)          ◄── │ Estabas aquí
│ 📦 Canela (C)            │
│ 📦 Chocolate (C)         │
│ ────────────────          │
│ 📦 Detergente (D)        │ ← Agregado al final
│ 📦 Dulces (D)            │
│ ────────────────          │
│ [Cargando E...]      ↓   │ ← Indicador inferior
└──────────────────────────┘
```

## 🛠️ Implementación Técnica

### Estados Nuevos

```typescript
// Control de carga hacia arriba
const [isLoadingPrevious, setIsLoadingPrevious] = useState<boolean>(false);

// Posición del scroll para detectar dirección
const [scrollY, setScrollY] = useState<number>(0);
```

### Funciones Principales

#### 1. `getPreviousLetter()`
Obtiene la letra anterior que no ha sido cargada:

```typescript
const getPreviousLetter = () => {
  if (!isAlphabeticalMode) return null;
  
  // Obtener la primera letra cargada
  const firstLoadedLetter = loadedLetters.sort()[0];
  const firstLoadedIndex = availableLetters.indexOf(firstLoadedLetter);
  
  // Buscar hacia atrás
  for (let i = firstLoadedIndex - 1; i >= 0; i--) {
    const letter = availableLetters[i];
    if (!loadedLetters.includes(letter)) {
      return letter;
    }
  }
  
  return null; // No hay letras anteriores
};
```

#### 2. `loadPreviousProducts()`
Carga productos de la letra anterior:

```typescript
const loadPreviousProducts = async () => {
  if (isLoadingPrevious || !isAlphabeticalMode) return;
  
  const previousLetter = getPreviousLetter();
  
  if (previousLetter) {
    console.log(`Cargando letra anterior: ${previousLetter}`);
    setIsLoadingPrevious(true);
    
    // Toast visual
    setShowLetterToast(true);
    setTimeout(() => setShowLetterToast(false), 800);
    
    try {
      // Modo PREPEND: agregar al inicio
      await fetchProducts(false, true, '', previousLetter, true);
    } finally {
      setIsLoadingPrevious(false);
    }
  }
};
```

#### 3. `handleScroll()`
Detecta scroll hacia arriba:

```typescript
const handleScroll = (event) => {
  const currentScrollY = event.nativeEvent.contentOffset.y;
  
  // Si estamos cerca del inicio (< 100px)
  if (currentScrollY < 100 && isAlphabeticalMode && !isLoadingPrevious) {
    // Y el scroll anterior era mayor (scroll hacia arriba)
    if (scrollY > currentScrollY && scrollY > 200) {
      loadPreviousProducts();
    }
  }
  
  setScrollY(currentScrollY);
};
```

#### 4. `fetchProducts()` - Actualizado
Soporta modo prepend:

```typescript
const fetchProducts = async (...params, prependMode = false) => {
  // ...
  
  if (loadMore && dataRef.current) {
    const newProducts = ...;
    
    if (prependMode) {
      // Agregar al INICIO (scroll hacia arriba)
      setData([...newProducts, ...dataRef.current]);
    } else {
      // Agregar al FINAL (scroll hacia abajo)
      setData([...dataRef.current, ...newProducts]);
    }
  }
};
```

## 🎮 Flujo de Datos

### Estructura de datos durante scroll bidireccional

**Estado inicial (letra C):**
```javascript
{
  data: [productos con C],
  loadedLetters: ['C'],
  currentLetter: 'C',
  scrollY: 300
}
```

**Usuario hace scroll ↑ hacia arriba:**
```javascript
// scrollY disminuye: 300 → 150 → 80
handleScroll detecta: scrollY < 100 && scrollPrevio > scrollActual

→ loadPreviousProducts()
→ getPreviousLetter() → 'B'
→ fetchProducts(..., 'B', prependMode=true)

Resultado:
{
  data: [productos B, productos C],
  loadedLetters: ['B', 'C'],
  currentLetter: 'B', // se actualiza
  scrollY: 80
}
```

**Usuario hace scroll ↓ hacia abajo:**
```javascript
// Llega al final de productos C
onEndReached se dispara

→ loadMoreProducts()
→ getNextLetter() → 'D'
→ fetchProducts(..., 'D', prependMode=false)

Resultado:
{
  data: [productos B, productos C, productos D],
  loadedLetters: ['B', 'C', 'D'],
  currentLetter: 'D',
  scrollY: 1200
}
```

## 📊 Comparación de Modos

| Aspecto | Scroll ↓ (Abajo) | Scroll ↑ (Arriba) |
|---------|------------------|-------------------|
| **Función** | `loadMoreProducts()` | `loadPreviousProducts()` |
| **Trigger** | `onEndReached` | `onScroll` + lógica |
| **Threshold** | 30% del final | < 100px del inicio |
| **Modo fetch** | `prependMode=false` | `prependMode=true` |
| **Agregado** | Al FINAL | Al INICIO |
| **Estado** | `loadingMore` | `isLoadingPrevious` |
| **Indicador** | Abajo (footer) | Arriba (header) |

## 🎯 Casos de Uso

### Caso 1: Navegación Completa A→Z
```
Usuario entra → Empieza en "A"
Scroll ↓ → B, C, D, E, ...
Sigue hasta "Z"
✅ Carga progresiva completa
```

### Caso 2: Salto y Retroceso
```
Usuario entra → Empieza en "A"
Toca "M" en índice → Salta a "M"
Hace scroll ↑ → Carga L, K, J, ...
Hace scroll ↓ → Carga N, O, P, ...
✅ Navegación bidireccional flexible
```

### Caso 3: Exploración Rápida
```
Usuario entra → Empieza en "A"
Scroll rápido ↓ → B, C, D cargados
Scroll rápido ↑ → Vuelve a ver A, B, C
✅ Sin recargas innecesarias
```

## 🔍 Ventajas del Sistema

### 1. **Experiencia Natural**
- ✅ Scroll funciona en ambas direcciones
- ✅ No hay "fin de lista" bloqueador
- ✅ Navegación fluida e intuitiva

### 2. **Optimización Inteligente**
- ✅ Solo carga letras necesarias
- ✅ No recarga letras ya vistas
- ✅ Memoria eficiente

### 3. **Feedback Visual**
- ✅ Indicador superior "Cargando productos anteriores..."
- ✅ Indicador inferior "Cargando más productos..."
- ✅ Toast con letra actual

### 4. **Prevención de Duplicados**
- ✅ Verifica IDs existentes
- ✅ Solo agrega productos nuevos
- ✅ Mantiene orden alfabético

## 📋 Indicadores Visuales

### Header (Superior)
```tsx
{isLoadingPrevious && (
  <View>
    <ActivityIndicator color="#10b981" />
    <Text>Cargando productos anteriores...</Text>
  </View>
)}
```

### Footer (Inferior)
```tsx
{loadingMore && (
  <View>
    <ActivityIndicator color="#10b981" />
    <Text>Cargando más productos...</Text>
  </View>
)}
```

### Toast (Centro)
```tsx
{showLetterToast && currentLetter && (
  <View style="center">
    <Text style="7xl">{currentLetter}</Text>
  </View>
)}
```

## 🚀 Configuración de Detección

### onScroll del FlatList
```tsx
<FlatList
  onScroll={handleScroll}
  scrollEventThrottle={16}  // Actualiza cada 16ms
  onEndReached={loadMoreProducts}
  onEndReachedThreshold={0.3}  // 30% antes del final
/>
```

### Parámetros de Detección
```typescript
const SCROLL_UP_THRESHOLD = 100;    // px desde el inicio
const SCROLL_UP_MINIMUM = 200;       // Scroll mínimo para activar
const SCROLL_DOWN_THRESHOLD = 0.3;   // 30% del final
```

## 🎨 Flujo Visual Completo

```
INICIO (A)
    │
    ├─ Scroll ↓ → B (append al final)
    │   │
    │   ├─ Scroll ↓ → C (append al final)
    │   │   │
    │   │   ├─ Scroll ↑ → B (ya cargado, no recarga)
    │   │   │
    │   │   └─ Scroll ↑ → A (ya cargado, no recarga)
    │   │
    │   └─ Scroll ↓ → D (append al final)
    │
    └─ Resultado: [A, B, C, D] en memoria
```

## 🔧 Debugging

Para monitorear el scroll bidireccional:

```javascript
console.log('Scroll Y:', scrollY);
console.log('Dirección:', scrollY > prevScrollY ? '↓' : '↑');
console.log('Letras cargadas:', loadedLetters);
console.log('Cargando anterior:', isLoadingPrevious);
console.log('Cargando siguiente:', loadingMore);
console.log('Letra previa disponible:', getPreviousLetter());
console.log('Letra siguiente disponible:', getNextLetter());
```

## ⚡ Optimizaciones

### 1. Throttle de Scroll
- `scrollEventThrottle={16}` (60 FPS)
- Evita llamadas excesivas

### 2. Flags de Estado
- `isLoadingPrevious` previene múltiples cargas
- `loadingMore` previene cargas simultáneas

### 3. Cálculo Inteligente
- Solo verifica letras NO cargadas
- Cache de letras disponibles

## 📝 Notas Técnicas

### Prepend vs Append
```typescript
// APPEND (scroll hacia abajo)
setData([...existingData, ...newData]);

// PREPEND (scroll hacia arriba)
setData([...newData, ...existingData]);
```

### Detección de Dirección
```typescript
// Scroll hacia arriba: scrollY disminuye
if (scrollY > currentScrollY) {
  // Usuario está scrolleando ↑
}

// Scroll hacia abajo: scrollY aumenta
if (scrollY < currentScrollY) {
  // Usuario está scrolleando ↓
}
```

## ✅ Checklist de Funcionalidad

- ✅ Scroll hacia abajo carga siguiente letra
- ✅ Scroll hacia arriba carga letra anterior
- ✅ Toast muestra letra al cambiar
- ✅ Indicador superior para carga previa
- ✅ Indicador inferior para carga siguiente
- ✅ No duplica productos
- ✅ Mantiene orden alfabético
- ✅ Previene cargas simultáneas
- ✅ Funciona con modo alfabético
- ✅ Compatible con selección manual de letra

## 🎉 Resultado Final

El scroll bidireccional alfabético está **completamente funcional**:

1. **Inicia con "A"**
2. **Scroll ↓** → B, C, D, ...
3. **Scroll ↑** → Vuelve y carga letras previas
4. **Navegación natural** en ambas direcciones
5. **Feedback visual claro** en todo momento

¡Disfruta de la navegación fluida en cualquier dirección! 🚀📖
