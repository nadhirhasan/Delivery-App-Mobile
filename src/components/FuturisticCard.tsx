import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  gradientColors: string[];
  onPress?: () => void;
};

export default function FuturisticCard({ icon, title, subtitle, gradientColors, onPress }: Props) {
  const { width } = useWindowDimensions();
  const [scale] = useState(new Animated.Value(1));

  const handlePressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    onPress && onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], marginVertical: width * 0.03 }}>
      <TouchableOpacity activeOpacity={0.9} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { padding: width * 0.05, borderRadius: width * 0.05 }]}
        >
          <View style={{ alignItems: "center" }}>
            {icon}
            <Text style={[styles.title, { fontSize: width * 0.06 }]}>{title}</Text>
            {subtitle && <Text style={[styles.subtitle, { fontSize: width * 0.035 }]}>{subtitle}</Text>}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#8e2de2",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
    alignItems: "center",
  },
  title: { color: "#fff", fontWeight: "800", marginTop: 12 },
  subtitle: { color: "#d1d5db", marginTop: 6, textAlign: "center" },
});
