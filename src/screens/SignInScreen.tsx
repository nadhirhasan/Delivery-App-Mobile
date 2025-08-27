import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";

// Dummy sign-in for demo (replace with real backend call)
const fakeSignIn = async (phone: string, password: string) => {
  await new Promise((res) => setTimeout(res, 1000));
  if (phone === "123" && password === "123") {
    return { token: "fake-jwt-token", userId: "uuid-demo" };
  }
  throw new Error("Invalid credentials");
};

type Props = NativeStackScreenProps<RootStackParamList, "SignIn">;

export default function SignInScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Get pending request data if present
  const requestData = route.params?.requestData;

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.user) throw error || new Error("Invalid credentials");

      await SecureStore.setItemAsync("userId", data.user.id);

      // If there was a pending request, continue it
      if (requestData) {
        navigation.replace("SubmitRequest", { requestData });
      } else {
        navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      }
    } catch (e: any) {
      Alert.alert("Sign in failed", e.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#141218", "#2a1b3d"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.container}>
            <Text style={styles.header}>Sign In</Text>
            <Text style={styles.subheader}>Welcome back! Please sign in.</Text>

            <View style={styles.inputGroup}>
              <Ionicons name="mail-outline" size={22} color="#fff" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#bdbdbd"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>
            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={22} color="#fff" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#bdbdbd"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoComplete="password"
                textContentType="password"
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSignIn}
              disabled={loading}
            >
              <LinearGradient
                colors={["#34d399", "#059669"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Signing In..." : "Sign In"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 24 }}
              onPress={() => navigation.navigate("SignUp",{ requestData })}
            >
              <Text style={{ color: "#bdbdbd", textAlign: "center" }}>
                Don't have an account?{" "}
                <Text style={{ color: "#34d399", fontWeight: "bold" }}>
                  Sign Up
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  header: { fontSize: 24, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 8 },
  subheader: { fontSize: 14, color: "#c7c7cc", textAlign: "center", marginBottom: 32 },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: "#fff", fontSize: 16 },
  button: { marginTop: 12, borderRadius: 16, overflow: "hidden" },
  buttonGradient: { paddingVertical: 16, alignItems: "center", borderRadius: 16 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 1 },
});
