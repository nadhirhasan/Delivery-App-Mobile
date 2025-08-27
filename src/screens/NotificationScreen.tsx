import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function NotificationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>No notifications yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#141218", alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontSize: 18 },
});
