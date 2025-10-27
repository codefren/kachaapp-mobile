import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

interface BottomMenuProps {
  activeTab: 'home' | 'ranking' | 'tools' | 'profile';
}

export default function BottomMenu({ activeTab }: BottomMenuProps) {
  const router = useRouter();

  const handleNavigation = (route: string) => {
    switch (route) {
      case '/menu':
        router.push('/menu');
        break;
      case '/dashboard':
        router.push('/dashboard');
        break;
      default:
        console.log(`Navegando a: ${route}`);
        break;
    }
  };

  const menuItems = [
    { id: 'home', icon: '⌂', label: 'Home', route: '/menu' },
    { id: 'ranking', icon: '★', label: 'Ranking', route: '/ranking' },
    { id: 'tools', icon: '⚒', label: 'Tools', route: '/tools' },
    { id: 'profile', icon: '○', label: 'Yo', route: '/dashboard' },
  ];

  return (
    <View style={styles.bottomMenu}>
      {menuItems.map((item) => (
        <Pressable
          key={item.id}
          style={[
            styles.menuItem,
            activeTab === item.id && styles.menuItemActive
          ]}
          onPress={() => handleNavigation(item.route)}
        >
          <View style={[
            styles.iconContainer,
            activeTab === item.id && styles.iconContainerActive
          ]}>
            <View style={[
              styles.iconCircle,
              activeTab === item.id && styles.iconCircleActive
            ]}>
              <Text style={[
                styles.menuIcon,
                activeTab === item.id && styles.menuIconActive
              ]}>
                {item.icon}
              </Text>
            </View>
          </View>
          <Text style={[
            styles.menuLabel,
            activeTab === item.id && styles.menuLabelActive
          ]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomMenu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 85,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 56,
  },
  menuItemActive: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconContainer: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    transform: [{ scale: 1.05 }],
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  iconCircleActive: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  menuIcon: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  menuIconActive: {
    color: '#ffffff',
    fontSize: 18,
  },
  menuLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },
  menuLabelActive: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 12,
  },
});
