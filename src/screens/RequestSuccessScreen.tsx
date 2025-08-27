import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "RequestSuccess">;

const RequestSuccessScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <LinearGradient colors={["#141218", "#2a1b3d"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, justifyContent: "center" }}>
        <View style={styles.container}>
          <View style={styles.iconWrapper}>
            <Ionicons name="checkmark-circle" size={80} color="#34d399" />
          </View>
          <Text style={styles.header}>Request Submitted!</Text>
          <Text style={styles.subheader}>
            Thank you for your request. Our helpers will see it soon.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] })}
          >
            <LinearGradient colors={["#34d399", "#059669"]} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Go to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.replace("Buyer")}
          >
            <Text style={styles.secondaryBtnText}>Make Another Request</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  iconWrapper: {
    backgroundColor: "#232136",
    borderRadius: 60,
    padding: 18,
    marginBottom: 24,
    shadowColor: "#34d399",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  header: { fontSize: 28, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 12 },
  subheader: { fontSize: 16, color: "#c7c7cc", textAlign: "center", marginBottom: 32 },
  button: { width: "100%", borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  buttonGradient: { paddingVertical: 16, alignItems: "center", borderRadius: 16 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 1 },
  secondaryBtn: { marginTop: 4 },
  secondaryBtnText: { color: "#34d399", fontWeight: "600", fontSize: 16, textAlign: "center" },
});

export default RequestSuccessScreen;