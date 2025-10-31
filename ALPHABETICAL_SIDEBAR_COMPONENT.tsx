// 📍 Componente de Barra Lateral Alfabética
// Este es el estilo del índice alfabético lateral que se muestra en el lado derecho

{/* Índice alfabético lateral */}
{availableLetters.length > 0 && (
  <View 
    style={{ 
      position: 'absolute',
      right: 4,
      top: 200, 
      bottom: 100,
      justifyContent: 'center',
      zIndex: 50 
    }}
  >
    <View className="bg-white/98 rounded-2xl py-3 px-2 shadow-2xl border-2 border-gray-200">
      {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map((letter) => {
        const isAvailable = availableLetters.includes(letter);
        const isActive = currentLetter === letter;
        
        return (
          <Pressable
            key={letter}
            onPress={() => {
              if (isAvailable) {
                handleLetterPress(letter);
              }
            }}
            disabled={!isAvailable}
            style={{
              paddingVertical: 4,
              paddingHorizontal: 8,
              marginVertical: 2,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 32,
              minHeight: 24,
              backgroundColor: isActive ? '#10b981' : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: '800',
              color: !isAvailable ? '#d1d5db' : isActive ? '#ffffff' : '#1f2937'
            }}>
              {letter}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
)}

// 🎨 ESTILOS Y CARACTERÍSTICAS:

/**
 * 📐 Posicionamiento:
 * - position: 'absolute'
 * - right: 4 (4px del borde derecho)
 * - top: 200 (200px desde arriba, debajo del header)
 * - bottom: 100 (100px desde abajo, encima del menú)
 * - justifyContent: 'center' (centrado verticalmente)
 * - zIndex: 50 (encima de otros elementos)
 */

/**
 * 🎨 Contenedor Principal:
 * - bg-white/98 (fondo blanco con 98% opacidad)
 * - rounded-2xl (bordes redondeados extra grandes)
 * - py-3 px-2 (padding vertical 12px, horizontal 8px)
 * - shadow-2xl (sombra grande)
 * - border-2 border-gray-200 (borde gris claro de 2px)
 */

/**
 * 🔤 Botón de Letra (Pressable):
 * - paddingVertical: 4 (4px arriba y abajo)
 * - paddingHorizontal: 8 (8px izquierda y derecha)
 * - marginVertical: 2 (2px arriba y abajo entre letras)
 * - borderRadius: 8 (bordes redondeados)
 * - minWidth: 32 (ancho mínimo 32px)
 * - minHeight: 24 (alto mínimo 24px)
 * - backgroundColor: 
 *     - '#10b981' (verde) si es la letra activa
 *     - 'transparent' si no está activa
 */

/**
 * ✍️ Texto de Letra:
 * - fontSize: 12 (tamaño de fuente 12px)
 * - fontWeight: '800' (negrita extra)
 * - color:
 *     - '#d1d5db' (gris claro) si la letra NO está disponible
 *     - '#ffffff' (blanco) si es la letra activa
 *     - '#1f2937' (gris oscuro) si está disponible pero no activa
 */

/**
 * 🎯 Estados de Letra:
 * 
 * 1. Letra NO disponible (no hay productos):
 *    - Deshabilitada (disabled={true})
 *    - Texto gris claro (#d1d5db)
 *    - Fondo transparente
 *    - No responde a clicks
 * 
 * 2. Letra disponible (hay productos):
 *    - Habilitada
 *    - Texto gris oscuro (#1f2937)
 *    - Fondo transparente
 *    - Responde a clicks
 * 
 * 3. Letra activa (actualmente visible):
 *    - Habilitada
 *    - Texto blanco (#ffffff)
 *    - Fondo verde (#10b981)
 *    - Responde a clicks
 */

/**
 * 🖱️ Interactividad:
 * - onPress: Llama a handleLetterPress(letter) si está disponible
 * - disabled: true si la letra NO está en availableLetters
 */

/**
 * 📝 Variables necesarias:
 * - availableLetters: string[] (letras que tienen productos)
 * - currentLetter: string | null (letra actualmente visible)
 * - handleLetterPress: (letter: string) => void (función para cambiar a una letra)
 */

// 🎨 Colores Usados:
const COLORS = {
  // Fondo del contenedor
  containerBg: 'bg-white/98',          // Blanco con 98% opacidad
  containerBorder: 'border-gray-200',  // Gris claro
  
  // Letra activa
  activeBackground: '#10b981',         // Verde emerald-500
  activeText: '#ffffff',               // Blanco
  
  // Letra disponible (no activa)
  availableText: '#1f2937',            // Gris oscuro
  
  // Letra NO disponible
  unavailableText: '#d1d5db',          // Gris claro
  
  // Fondo transparente
  transparentBg: 'transparent'
};

// 📏 Medidas:
const DIMENSIONS = {
  // Posicionamiento
  right: 4,
  top: 200,
  bottom: 100,
  
  // Contenedor
  containerPaddingY: 12,  // py-3
  containerPaddingX: 8,   // px-2
  borderWidth: 2,
  borderRadius: 16,       // rounded-2xl
  
  // Botón
  buttonPaddingY: 4,
  buttonPaddingX: 8,
  buttonMarginY: 2,
  buttonBorderRadius: 8,
  buttonMinWidth: 32,
  buttonMinHeight: 24,
  
  // Texto
  fontSize: 12,
  fontWeight: '800',
};
