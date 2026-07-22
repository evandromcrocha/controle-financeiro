import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.bgAlt,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Resumo',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="lancamentos"
        options={{
          title: 'Lançamentos',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cartoes"
        options={{
          title: 'Cartões',
          tabBarIcon: ({ color, size }) => <Ionicons name="card" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
