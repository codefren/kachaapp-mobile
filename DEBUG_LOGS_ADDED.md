# 🔍 Logs de Debugging Agregados

## 📋 Resumen

Se han agregado logs detallados para diagnosticar el comportamiento cuando:
1. Usuario toca letra "P" en el sidebar
2. App carga productos con "P"
3. App vuelve a letra "A" inesperadamente

## 🎯 Logs Agregados

### 1. **handleLetterPress** - Click en Letra

```
🔤 === handleLetterPress LLAMADO ===
Letra presionada: P
currentLetter actual: A
isAlphabeticalMode: true
loadedLetters: ['A', 'B']

✅ FILTRO: Activando filtro para letra: P
Desactivando modo alfabético (isAlphabeticalMode = false)
Limpiando loadedLetters
Mostrando toast para letra: P
Llamando fetchProducts(true, false, '', 'P')
✅ === handleLetterPress FINALIZADO ===
```

### 2. **fetchProducts** - Carga de Datos

```
📥 === fetchProducts LLAMADO ===
Parámetros: {
  isRefresh: true,
  loadMore: false,
  searchName: '',
  letterStartsWith: 'P'
}
Estado actual: {
  currentLetter: 'A',
  loadedLetters: ['A', 'B'],
  isAlphabeticalMode: true,
  hasNextPage: false,
  dataLength: 250
}

🔤 Añadido filtro starts_with: P
🌐 URL construida: /api/products/?provider=6&ordering=name&page_size=200&starts_with=P

📦 Respuesta recibida: {
  success: true,
  statusCode: 200,
  hasData: true
}

📊 Datos del backend: {
  count: 45,
  results_length: 45,
  next: null,
  first_product: 'Pan'
}

⚠️ NO registra letra (modo no alfabético): P

✅ === fetchProducts FINALIZADO ===
```

### 3. **onViewableItemsChanged** - Detección Visual

```
👁️ onViewableItemsChanged disparado
isAlphabeticalMode: false
viewableItems.length: 10

❌ Saliendo: modo no alfabético o sin items visibles

👁️ onViewableItemsChanged finalizado
```

**O si está en modo alfabético:**

```
👁️ onViewableItemsChanged disparado
isAlphabeticalMode: true
viewableItems.length: 10
Primer item visible: Pan
Primera letra detectada: P
currentLetter actual: A

✅ Actualizando currentLetter de A a P
⚠️ IMPORTANTE: Solo actualiza visual, NO recarga datos

👁️ onViewableItemsChanged finalizado
```

## 🔎 Qué Buscar en los Logs

### Problema: "Vuelve a A después de cargar P"

Posibles causas a investigar:

#### 1. **onViewableItemsChanged está llamándose cuando NO debería**
```
👁️ onViewableItemsChanged disparado
isAlphabeticalMode: true  ← ⚠️ DEBERÍA SER false después de click
```

**Qué revisar:**
- ¿`isAlphabeticalMode` cambió a `false` después de click en P?
- ¿El efecto de `onViewableItemsChanged` se está ejecutando con el valor antiguo?

#### 2. **handleLetterPress no está desactivando modo alfabético**
```
✅ FILTRO: Activando filtro para letra: P
Desactivando modo alfabético (isAlphabeticalMode = false)  ← ⚠️ Verifica que esto se ejecute
```

**Qué revisar:**
- ¿El log "Desactivando modo alfabético" aparece?
- ¿Se está ejecutando el branch correcto (else, no if)?

#### 3. **fetchProducts recibe parámetros incorrectos**
```
📥 === fetchProducts LLAMADO ===
Parámetros: {
  letterStartsWith: 'P'  ← ⚠️ Debería ser 'P'
}
Estado actual: {
  isAlphabeticalMode: true  ← ⚠️ Debería cambiar a false
}
```

**Qué revisar:**
- ¿El estado `isAlphabeticalMode` dentro de `fetchProducts` es el correcto?
- ¿Hay un desfase de timing entre `setIsAlphabeticalMode` y `fetchProducts`?

#### 4. **Múltiples llamadas a fetchProducts**
```
📥 === fetchProducts LLAMADO ===
Parámetros: { letterStartsWith: 'P' }
✅ === fetchProducts FINALIZADO ===

📥 === fetchProducts LLAMADO ===  ← ⚠️ Segunda llamada no esperada
Parámetros: { letterStartsWith: 'A' }
```

**Qué revisar:**
- ¿Se llama `fetchProducts` más de una vez?
- ¿Algún efecto está disparando carga adicional?

## 📊 Flujo Esperado

### Caso Correcto: Click en P

```
1. handleLetterPress('P')
   └─ isAlphabeticalMode = false
   └─ currentLetter = 'P'
   └─ loadedLetters = []
   └─ fetchProducts(true, false, '', 'P')

2. fetchProducts ejecuta
   └─ URL: ...&starts_with=P
   └─ Carga 45 productos con P
   └─ setData([productos de P])
   └─ NO registra en loadedLetters (modo no alfabético)

3. onViewableItemsChanged dispara
   └─ isAlphabeticalMode = false
   └─ ❌ Sale sin hacer nada (correcto)

4. Usuario ve productos con P
   └─ Sidebar muestra P en verde
```

### Caso Incorrecto: Vuelve a A

Si ves este patrón en los logs:

```
1. handleLetterPress('P') ✅
2. fetchProducts(..., 'P') ✅
3. onViewableItemsChanged dispara
   └─ isAlphabeticalMode = true  ← ❌ PROBLEMA
   └─ Detecta letra 'A' en items viejos
   └─ setCurrentLetter('A')
4. fetchProducts(..., 'A')  ← ❌ CARGA NO DESEADA
```

## 🧪 Cómo Probar

### Test 1: Click en P
```bash
1. Abre app
2. Abre consola
3. Toca letra "P" en sidebar
4. Observa logs en este orden:
   - 🔤 handleLetterPress LLAMADO
   - 📥 fetchProducts LLAMADO
   - 📦 Respuesta recibida
   - 👁️ onViewableItemsChanged (debería salir)
```

### Test 2: Vuelve a A
```bash
1. Con productos de P visibles
2. Scrollea hacia arriba
3. Observa logs:
   - 👁️ onViewableItemsChanged (NO debería actualizar)
   - ❌ NO debería ver "fetchProducts LLAMADO" con letra A
```

## 📝 Checklist de Diagnóstico

Cuando ejecutes el test, verifica:

- [ ] `handleLetterPress('P')` se ejecuta
- [ ] `isAlphabeticalMode` cambia a `false`
- [ ] `fetchProducts` recibe `letterStartsWith: 'P'`
- [ ] URL incluye `starts_with=P`
- [ ] Backend retorna productos con P
- [ ] `setData` actualiza con productos de P
- [ ] `onViewableItemsChanged` sale inmediatamente (modo no alfabético)
- [ ] NO hay segunda llamada a `fetchProducts`
- [ ] `currentLetter` permanece en 'P'
- [ ] Sidebar muestra P en verde

## 🎯 Próximos Pasos

1. **Ejecuta el test**: Toca "P" y observa logs
2. **Captura logs**: Copia todos los logs desde el click hasta que termina
3. **Compara con flujo esperado**: Identifica dónde se desvía
4. **Identifica la causa**: Usa los "Qué buscar" de arriba

---

**Con estos logs podremos ver exactamente qué está pasando paso a paso.** 🔍
