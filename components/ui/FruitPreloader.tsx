import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface FruitPreloaderProps {
  message?: string;
  showProgress?: boolean;
  minDuration?: number; // Duración mínima en ms
  onComplete?: () => void; // Callback cuando termina
}

// Emojis de frutas para las animaciones
const FRUITS = [
  '🍎', '🍊', '🍌', '🍇', '🍓', '🥝', '🍑', '🍒', '🥭', '🍍',
  '🥥', '🍈', '🍉', '🍋', '🫐', '🥑', '🍅', '🌶️', '🥕', '🌽',
  '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥔', '🍠', '🥜', '🌰',
  '🫘', '🥖', '🥐', '🧇', '🥞', '🍯', '🫖', '☕', '🧃', '🥤'
];

// Componente individual de fruta animada
const AnimatedFruit = ({ 
  emoji, 
  delay, 
  duration, 
  startX, 
  startY 
}: { 
  emoji: string; 
  delay: number; 
  duration: number; 
  startX: number; 
  startY: number; 
}) => {
  const translateY = useRef(new Animated.Value(startY)).current;
  const translateX = useRef(new Animated.Value(startX)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current; // Empezar en tamaño normal
  const opacity = useRef(new Animated.Value(1)).current; // Empezar visible

  useEffect(() => {
    // console.log(`🍇 AnimatedFruit ${emoji} iniciando animaciones continuas`);
    
    const startAnimation = () => {

      // Animación de flotación ultra suave
      const floatRange = 5 + Math.random() * 5; // Rango muy sutil 5-10px
      const floatSpeed = 5000 + Math.random() * 3000; // Velocidad ultra lenta
      
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: startY - floatRange,
            duration: floatSpeed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: startY + floatRange,
            duration: floatSpeed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      // Animación de rotación ultra suave
      const rotateSpeed = 12000 + Math.random() * 8000; // Velocidad extremadamente lenta
      const rotateDirection = Math.random() > 0.5 ? 0.3 : -0.3; // Rotación muy sutil
      
      const rotateAnimation = Animated.loop(
        Animated.timing(rotate, {
          toValue: rotateDirection,
          duration: rotateSpeed,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      // Animación de pulso ocasional para pocas frutas
      const shouldPulse = Math.random() > 0.8; // Solo 20% de probabilidad
      let pulseAnimation: Animated.CompositeAnimation | null = null;
      
      if (shouldPulse) {
        pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.08, // Pulso muy sutil
              duration: 3000, // Ultra lento
              easing: Easing.inOut(Easing.sin), // Easing más suave
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 3000, // Ultra lento
              easing: Easing.inOut(Easing.sin), // Easing más suave
              useNativeDriver: true,
            }),
            Animated.delay(8000 + Math.random() * 12000), // Pausa muy larga
          ])
        );
      }

      // Iniciar animaciones inmediatamente
      floatAnimation.start();
      rotateAnimation.start();
      
      if (shouldPulse && pulseAnimation) {
        setTimeout(() => {
          pulseAnimation.start();
        }, Math.random() * 2000); // Sin delay inicial
      }
    };

    startAnimation();

    return () => {
      translateY.stopAnimation();
      translateX.stopAnimation();
      rotate.stopAnimation();
      scale.stopAnimation();
      opacity.stopAnimation();
    };
  }, [delay, duration, startX, startY, translateY, translateX, rotate, scale, opacity]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-0.3, 0.3],
    outputRange: ['-30deg', '30deg'], // Rotación muy sutil
  });

  return (
    <Animated.View
      style={[
        styles.fruitContainer,
        {
          transform: [
            { translateX },
            { translateY },
            { rotate: rotateInterpolate },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      <Text style={styles.fruitEmoji}>{emoji}</Text>
    </Animated.View>
  );
};

// Componente principal del preloader
export default function FruitPreloader({ 
  message = 'Cargando...', 
  showProgress = false,
  minDuration = 3000,
  onComplete
}: FruitPreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current; // Empezar visible
  const exitAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let progressInterval: any;
    let completionTimeout: any;

    // El preloader ya está visible desde el inicio

    // Animación de pulso ultra suave para el texto principal
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02, // Pulso muy sutil
          duration: 4000, // Ultra lento
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 4000, // Ultra lento
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    // Simulador de progreso si está habilitado
    if (showProgress) {
      progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 12;
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return newProgress;
        });
      }, 150);
    } else {
      // Si no hay progreso, simular progreso interno para la duración mínima
      progressInterval = setInterval(() => {
        setProgress(prev => {
          const increment = 100 / (minDuration / 100); // Calcular incremento para completar en minDuration
          const newProgress = prev + increment;
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return newProgress;
        });
      }, 100);
    }

    // Timeout para duración mínima
    completionTimeout = setTimeout(() => {
      setIsCompleting(true);
      
      // Animación de salida
      Animated.parallel([
        Animated.timing(exitAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        })
      ]).start(() => {
        onComplete?.();
      });
    }, minDuration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(completionTimeout);
      pulseAnimation.stop();
    };
  }, [pulseAnim, fadeAnim, exitAnim, showProgress, minDuration, onComplete]);

  // Generar frutas flotantes optimizadas
  const generateFruits = () => {
    // Selección aleatoria de frutas variadas
    const selectedFruits = FRUITS.sort(() => 0.5 - Math.random()).slice(0, 20);
    
    return selectedFruits.map((fruit, index) => {
      // Distribución más uniforme evitando el centro
      const angle = (index / selectedFruits.length) * 2 * Math.PI;
      const radius = Math.random() * (width * 0.3) + width * 0.15;
      const centerX = width / 2;
      const centerY = height / 2;
      
      const startX = centerX + Math.cos(angle) * radius;
      const startY = centerY + Math.sin(angle) * radius * 0.6; // Más achatado verticalmente
      
      const delay = 0; // Sin delay, aparecen inmediatamente
      const duration = 4000 + Math.random() * 1000; // Duración más lenta

      return (
        <AnimatedFruit
          key={`${fruit}-${index}-${Math.random()}`}
          emoji={fruit}
          delay={delay}
          duration={duration}
          startX={startX}
          startY={startY}
        />
      );
    });
  };


  return (
    <Animated.View style={[
      styles.container, 
      { 
        opacity: fadeAnim,
        transform: [
          { scale: exitAnim },
          { 
            translateY: exitAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-50, 0]
            })
          }
        ]
      }
    ]}>
      {/* Fondo con gradiente suave */}
      <View style={styles.background} />
      
      {/* Frutas flotantes */}
      {generateFruits()}
      
      {/* Contenido principal */}
      <View style={styles.contentContainer}>
        {/* Logo o icono principal */}
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.logoEmoji}>🛒</Text>
          <Text style={styles.logoText}>KCH Digital</Text>
        </Animated.View>
        
        {/* Mensaje de carga */}
        <Text style={styles.loadingMessage}>{message}</Text>
        
        {/* Barra de progreso opcional */}
        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${Math.min(progress, 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
        
        {/* Indicador de carga animado */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <AnimatedDot key={index} delay={index * 200} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// Componente de punto animado para el indicador de carga
const AnimatedDot = ({ delay }: { delay: number }) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.5,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [scaleAnim, opacityAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f8fafc',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    opacity: 0.1,
  },
  fruitContainer: {
    position: 'absolute',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fruitEmoji: {
    fontSize: 36, // Más grande para mejor visibilidad
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    letterSpacing: 1,
  },
  loadingMessage: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    marginHorizontal: 4,
  },
});
