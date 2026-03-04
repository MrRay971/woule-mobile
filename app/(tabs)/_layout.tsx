import { Tabs } from 'expo-router'
import { Colors } from '@/constants/Colors'
import { Text, View } from 'react-native'

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 6 }}>
      <Text style={{ fontSize: focused ? 22 : 20 }}>{emoji}</Text>
      <Text style={{
        fontSize: 10, fontWeight: focused ? '700' : '500',
        color: focused ? Colors.yellow : Colors.gray,
        marginTop: 2,
      }}>
        {label}
      </Text>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.darkCard,
          borderTopColor: Colors.darkBorder,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Accueil" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="campagnes"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📢" label="Campagnes" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tracking"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: focused ? Colors.yellow : 'rgba(255,219,21,0.2)',
              justifyContent: 'center', alignItems: 'center',
              marginTop: -20,
              shadowColor: Colors.yellow,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: focused ? 0.6 : 0.2,
              shadowRadius: 12,
              elevation: 8,
            }}>
              <Text style={{ fontSize: 24 }}>🚗</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="gains"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" label="Gains" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profil" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
