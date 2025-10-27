import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface QuantityControlProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  label?: string;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  minValue?: number;
  maxValue?: number;
}

export default function QuantityControl({
  value,
  onIncrement,
  onDecrement,
  label,
  unit = 'uds',
  size = 'md',
  variant = 'primary',
  disabled = false,
  minValue = 0,
  maxValue
}: QuantityControlProps) {
  const canDecrement = value > minValue && !disabled;
  const canIncrement = !disabled && (maxValue === undefined || value < maxValue);

  // Tailwind classes based on size
  const sizeClasses = {
    sm: {
      container: 'bg-slate-100 rounded-lg p-1',
      button: 'w-7 h-7 rounded-md',
      buttonText: 'text-sm font-bold',
      display: 'min-w-8 px-2',
      displayText: 'text-sm font-bold',
      unitText: 'text-xs mt-0'
    },
    md: {
      container: 'bg-slate-50 rounded-xl p-1',
      button: 'w-9 h-9 rounded-lg',
      buttonText: 'text-lg font-bold',
      display: 'min-w-12 px-3',
      displayText: 'text-xl font-bold',
      unitText: 'text-xs -mt-1'
    },
    lg: {
      container: 'bg-slate-50 rounded-2xl p-2',
      button: 'w-12 h-12 rounded-xl',
      buttonText: 'text-xl font-bold',
      display: 'min-w-16 px-4',
      displayText: 'text-2xl font-bold',
      unitText: 'text-sm -mt-1'
    }
  };

  // Tailwind classes based on variant
  const variantClasses = {
    primary: {
      decrementButton: canDecrement 
        ? 'bg-red-500 shadow-sm shadow-red-500/25' 
        : 'bg-gray-300',
      incrementButton: canIncrement 
        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/25' 
        : 'bg-gray-300',
      buttonText: canDecrement || canIncrement ? 'text-white' : 'text-gray-500',
      displayText: 'text-gray-900',
      unitText: 'text-gray-500'
    },
    secondary: {
      decrementButton: canDecrement 
        ? 'bg-orange-500 shadow-sm shadow-orange-500/25' 
        : 'bg-gray-300',
      incrementButton: canIncrement 
        ? 'bg-blue-500 shadow-sm shadow-blue-500/25' 
        : 'bg-gray-300',
      buttonText: canDecrement || canIncrement ? 'text-white' : 'text-gray-500',
      displayText: 'text-gray-900',
      unitText: 'text-gray-500'
    }
  };

  const currentSize = sizeClasses[size];
  const currentVariant = variantClasses[variant];

  return (
    <View className="flex-col">
      {label && (
        <Text className="text-sm font-semibold text-gray-700 mb-2">
          {label}
        </Text>
      )}
      
      <View className={`flex-row items-center justify-center ${currentSize.container}`}>
        {/* Decrement Button */}
        <Pressable
          className={`${currentSize.button} ${currentVariant.decrementButton} items-center justify-center`}
          onPress={onDecrement}
          disabled={!canDecrement}
        >
          <Text className={`${currentSize.buttonText} ${currentVariant.buttonText}`}>
            −
          </Text>
        </Pressable>

        {/* Display */}
        <View className={`${currentSize.display} items-center`}>
          <Text className={`${currentSize.displayText} ${currentVariant.displayText}`}>
            {value}
          </Text>
          <Text className={`${currentSize.unitText} ${currentVariant.unitText} font-medium`}>
            {unit}
          </Text>
        </View>

        {/* Increment Button */}
        <Pressable
          className={`${currentSize.button} ${currentVariant.incrementButton} items-center justify-center`}
          onPress={onIncrement}
          disabled={!canIncrement}
        >
          <Text className={`${currentSize.buttonText} ${currentVariant.buttonText}`}>
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
