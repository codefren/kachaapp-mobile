import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Datos de ejemplo para el trabajador
const workerData = {
  name: "Juan Pérez",
  position: "Vendedor",
  todayStats: {
    sales: 15,
    target: 20,
    revenue: 1250.50,
    customers: 12
  },
  weeklyProgress: 75,
  monthlyProgress: 68
};

const tasks = [
  { id: 1, title: "Revisar inventario matutino", completed: true, priority: "high", time: "09:00" },
  { id: 2, title: "Atender cliente VIP - Sr. García", completed: false, priority: "high", time: "10:30" },
  { id: 3, title: "Actualizar precios en sistema", completed: false, priority: "medium", time: "14:00" },
  { id: 4, title: "Preparar reporte de ventas", completed: false, priority: "medium", time: "16:00" },
  { id: 5, title: "Limpieza de área de trabajo", completed: true, priority: "low", time: "18:00" },
];

const recentActivities = [
  { id: 1, action: "Venta realizada", amount: "€85.20", time: "hace 15 min" },
  { id: 2, action: "Cliente registrado", customer: "María López", time: "hace 32 min" },
  { id: 3, action: "Inventario actualizado", items: "12 productos", time: "hace 1h" },
];

export default function DashboardWorkerScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('overview');

  const toggleTask = (taskId: number) => {
    // Aquí implementarías la lógica para marcar/desmarcar tareas
    console.log(`Toggle task ${taskId}`);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>¡Hola, {workerData.name}!</Text>
          <Text style={styles.position}>{workerData.position}</Text>
        </View>
        <Pressable style={styles.profileButton}>
          <Text style={styles.profileIcon}>👤</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable 
          style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
            Resumen
          </Text>
        </Pressable>
        <Pressable 
          style={[styles.tab, selectedTab === 'tasks' && styles.activeTab]}
          onPress={() => setSelectedTab('tasks')}
        >
          <Text style={[styles.tabText, selectedTab === 'tasks' && styles.activeTabText]}>
            Tareas
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'overview' ? (
          <>
            {/* Performance Cards */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{workerData.todayStats.sales}</Text>
                <Text style={styles.statLabel}>Ventas Hoy</Text>
                <Text style={styles.statTarget}>Meta: {workerData.todayStats.target}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>€{workerData.todayStats.revenue}</Text>
                <Text style={styles.statLabel}>Ingresos</Text>
                <Text style={styles.statProgress}>+12% vs ayer</Text>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{workerData.todayStats.customers}</Text>
                <Text style={styles.statLabel}>Clientes</Text>
                <Text style={styles.statProgress}>Atendidos hoy</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{workerData.weeklyProgress}%</Text>
                <Text style={styles.statLabel}>Progreso</Text>
                <Text style={styles.statProgress}>Esta semana</Text>
              </View>
            </View>

            {/* Progress Bars */}
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>Rendimiento</Text>
              
              <View style={styles.progressItem}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Meta Semanal</Text>
                  <Text style={styles.progressValue}>{workerData.weeklyProgress}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${workerData.weeklyProgress}%` }]} />
                </View>
              </View>

              <View style={styles.progressItem}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Meta Mensual</Text>
                  <Text style={styles.progressValue}>{workerData.monthlyProgress}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${workerData.monthlyProgress}%`, backgroundColor: '#f59e0b' }]} />
                </View>
              </View>
            </View>

            {/* Recent Activities */}
            <View style={styles.activitiesSection}>
              <Text style={styles.sectionTitle}>Actividad Reciente</Text>
              {recentActivities.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Text style={styles.activityEmoji}>
                      {activity.action.includes('Venta') ? '💰' : 
                       activity.action.includes('Cliente') ? '👥' : '📦'}
                    </Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityAction}>{activity.action}</Text>
                    <Text style={styles.activityDetail}>
                      {activity.amount || activity.customer || activity.items}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          /* Tasks Tab */
          <View style={styles.tasksSection}>
            <Text style={styles.sectionTitle}>Tareas del Día</Text>
            {tasks.map((task) => (
              <Pressable 
                key={task.id} 
                style={styles.taskItem}
                onPress={() => toggleTask(task.id)}
              >
                <View style={styles.taskLeft}>
                  <View style={[
                    styles.taskCheckbox, 
                    task.completed && styles.taskCompleted
                  ]}>
                    {task.completed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.taskContent}>
                    <Text style={[
                      styles.taskTitle, 
                      task.completed && styles.taskTitleCompleted
                    ]}>
                      {task.title}
                    </Text>
                    <Text style={styles.taskTime}>{task.time}</Text>
                  </View>
                </View>
                <View style={[
                  styles.priorityIndicator, 
                  { backgroundColor: getPriorityColor(task.priority) }
                ]} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable 
          style={styles.navButton}
          onPress={() => router.back()}
        >
          <Text style={styles.navIcon}>🗺️</Text>
          <Text style={styles.navText}>Mapa</Text>
        </Pressable>
        <Pressable 
          style={[styles.navButton, styles.activeNavButton]}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={[styles.navText, styles.activeNavText]}>Dashboard</Text>
        </Pressable>
        <Pressable 
          style={styles.navButton}
          onPress={() => router.push('/menu')}
        >
          <Text style={styles.navIcon}>📱</Text>
          <Text style={styles.navText}>Menú</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  position: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 2,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#10b981',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#10b981',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: (width - 60) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  statTarget: {
    fontSize: 12,
    color: '#ef4444',
  },
  statProgress: {
    fontSize: 12,
    color: '#10b981',
  },
  progressSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  progressItem: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#374151',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  activitiesSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityEmoji: {
    fontSize: 18,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  activityDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  tasksSection: {
    marginBottom: 100,
  },
  taskItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  taskTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  priorityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavButton: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeNavText: {
    color: '#10b981',
    fontWeight: '600',
  },
});
