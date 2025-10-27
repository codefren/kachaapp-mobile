import React from 'react';
import { View, Text } from 'react-native';

interface StockInfoProps {
  stockAmount: number;
  unit?: string;
  lowStockThreshold?: number;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function StockInfo({
  stockAmount,
  unit = 'cajas',
  lowStockThreshold = 5,
  showBadge = true,
  size = 'md'
}: StockInfoProps) {
  const isOutOfStock = stockAmount === 0;
  const isLowStock = stockAmount > 0 && stockAmount <= lowStockThreshold;

  // Tailwind classes based on size
  const sizeClasses = {
    sm: {
      container: 'flex-row items-center gap-2',
      stockText: 'text-sm font-semibold',
      badgeText: 'text-xs font-semibold px-2 py-1 rounded'
    },
    md: {
      container: 'flex-row items-center gap-2',
      stockText: 'text-base font-semibold',
      badgeText: 'text-xs font-semibold px-2 py-1 rounded-md'
    },
    lg: {
      container: 'flex-row items-center gap-3',
      stockText: 'text-lg font-bold',
      badgeText: 'text-sm font-bold px-3 py-1.5 rounded-lg'
    }
  };

  // Stock status styling
  const getStockTextColor = () => {
    if (isOutOfStock) return 'text-red-600';
    if (isLowStock) return 'text-orange-600';
    return 'text-gray-700';
  };

  const getBadgeClasses = () => {
    if (isOutOfStock) {
      return 'bg-red-100 text-red-800 border border-red-200';
    }
    if (isLowStock) {
      return 'bg-orange-100 text-orange-800 border border-orange-200';
    }
    return '';
  };

  const getBadgeText = () => {
    if (isOutOfStock) return 'Sin stock';
    if (isLowStock) return 'Stock bajo';
    return '';
  };

  const currentSize = sizeClasses[size];

  return (
    <View className={currentSize.container}>
      <Text className={`${currentSize.stockText} ${getStockTextColor()}`}>
        {stockAmount} {unit}
      </Text>
      
      {showBadge && isOutOfStock && (
        <View className="bg-red-100 border border-red-200 px-2 py-1 rounded-md">
          <Text className="text-xs font-semibold text-red-800">
            Sin stock
          </Text>
        </View>
      )}
      
      {showBadge && isLowStock && (
        <View className="bg-orange-100 border border-orange-200 px-2 py-1 rounded-md">
          <Text className="text-xs font-semibold text-orange-800">
            Stock bajo
          </Text>
        </View>
      )}
    </View>
  );
}
