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
        name="tracking"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 60, height: 60, borderRadius: 30,
              backgroundColor: focused ? Colors.yellow : Colors.yellow + '25',
              justifyContent: 'center', alignItems: 'center',
              marginTop: -22,
              shadowColor: Colors.yellow,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: focused ? 0.7 : 0.3,
              shadowRadius: 14,
              elevation: 10,
            }}>
              <Text style={{ fontSize: 26 }}>🏷️</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profil" focused={focused} />,
        }}
      />
      {/* Hide campagnes and gains from tab bar but keep them accessible */}
      <Tabs.Screen name="campagnes" options={{ href: null }} />
      <Tabs.Screen name="gains" options={{ href: null }} />
    </Tabs>
  )
}
