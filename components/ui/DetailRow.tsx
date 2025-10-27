import React from 'react';
import { View, Text } from 'react-native';

interface DetailRowProps {
  icon: string;
  label: string;
  value?: string;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function DetailRow({
  icon,
  label,
  value,
  children,
  size = 'md'
}: DetailRowProps) {
  // Tailwind classes based on size
  const sizeClasses = {
    sm: {
      container: 'flex-row items-center gap-2 py-1',
      iconContainer: 'w-6 h-6 rounded-md bg-slate-100 items-center justify-center',
      iconText: 'text-sm',
      labelText: 'text-xs font-medium text-gray-600',
      valueText: 'text-sm font-semibold text-gray-900'
    },
    md: {
      container: 'flex-row items-center gap-3 py-2',
      iconContainer: 'w-8 h-8 rounded-lg bg-slate-100 items-center justify-center',
      iconText: 'text-base',
      labelText: 'text-xs font-medium text-gray-600 mb-1',
      valueText: 'text-sm font-semibold text-gray-900'
    },
    lg: {
      container: 'flex-row items-center gap-4 py-3',
      iconContainer: 'w-10 h-10 rounded-xl bg-slate-100 items-center justify-center',
      iconText: 'text-lg',
      labelText: 'text-sm font-medium text-gray-600 mb-1',
      valueText: 'text-base font-semibold text-gray-900'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <View className={currentSize.container}>
      {/* Icon */}
      <View className={currentSize.iconContainer}>
        <Text className={currentSize.iconText}>
          {icon}
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text className={currentSize.labelText}>
          {label}
        </Text>
        
        {value && (
          <Text className={currentSize.valueText}>
            {value}
          </Text>
        )}
        
        {children && (
          <View className="mt-1">
            {children}
          </View>
        )}
      </View>
    </View>
  );
}
