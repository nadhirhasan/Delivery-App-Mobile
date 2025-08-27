import React from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  gradientColors?: string[];
  small?: boolean;
  style?: ViewStyle;
};

export default function PrimaryButton({
  label,
  onPress,
  icon,
  gradientColors = ["#9333ea", "#7c3aed"],
  small = false,
  style,
}: Props) {
  const { width } = useWindowDimensions();

  return (
    <TouchableOpacity onPress={onPress} style={[style, { marginVertical: width * 0.02 }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.button,
          small ? { paddingVertical: width * 0.03 } : { paddingVertical: width * 0.045 },
        ]}
      >
        <View style={styles.content}>
          {icon && <View style={{ marginRight: width * 0.02 }}>{icon}</View>}
          <Text style={[styles.label, { fontSize: small ? width * 0.04 : width * 0.045 }]}>
            {label}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    alignItems: "center",
    width: "100%",
  },
  content: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    color: "white",
    fontWeight: "600",
  },
});
