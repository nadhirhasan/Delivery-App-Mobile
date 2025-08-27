import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "react-native";
import HomeScreen from "../screens/HomeScreen";
import ActivitiesScreen from "../screens/ActivitiesScreen";
import NotificationScreen from "../screens/NotificationScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#232136", borderTopColor: "#232136" },
        tabBarActiveTintColor: "#34d399",
        tabBarInactiveTintColor: "#c7c7cc",
        tabBarIcon: ({ color, size, focused }) => {
          let iconUrl = "https://cdn-icons-png.flaticon.com/512/833/833472.png"; // default logo
          if (route.name === "Home") iconUrl = "https://cdn-icons-png.flaticon.com/512/1946/1946436.png"; // house icon
          else if (route.name === "Activities") iconUrl = "https://cdn-icons-png.flaticon.com/512/3209/3209265.png";
          else if (route.name === "Notifications") iconUrl = "https://cdn-icons-png.flaticon.com/512/1827/1827392.png";
          else if (route.name === "Account") iconUrl = "https://cdn-icons-png.flaticon.com/512/1077/1077063.png";
          return (
            <Image
              source={{ uri: iconUrl }}
              style={{ width: size, height: size, tintColor: color, opacity: focused ? 1 : 0.7 }}
              resizeMode="contain"
            />
          );
        },
      })}
    >
  <Tab.Screen name="Home" component={HomeScreen} />
  <Tab.Screen name="Activities" component={ActivitiesScreen} />
  <Tab.Screen name="Notifications" component={NotificationScreen} />
  <Tab.Screen name="Account" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
