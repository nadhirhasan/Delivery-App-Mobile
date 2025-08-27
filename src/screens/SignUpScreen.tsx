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

type Props = NativeStackScreenProps<RootStackParamList, "SignUp">;

export default function SignUpScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "helper">("buyer");
  const [loading, setLoading] = useState(false);

  // Get pending request data if present
  const requestData = route.params?.requestData;

  const handleSignUp = async () => {
    if (!email || !name || !phone || !password) {
      Alert.alert("All fields are required!");
      return;
    }
    setLoading(true);
    try {
      // 1. Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error || !data.user) throw error || new Error("No user returned");

      // 2. Insert extra info into Users table
      const { error: userError } = await supabase.from("Users").insert([
        {
          user_id: data.user.id,
          name,
          phone,
          role,
          verified: false,
          rating: 0,
        },
      ]);
      if (userError) throw userError;

      // 3. Store user id or session as needed
      await SecureStore.setItemAsync("userId", data.user.id);

      // 4. Continue pending request if exists
      if (requestData) {
        navigation.replace("SubmitRequest", { requestData });
      } else {
        navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      }
    } catch (e: any) {
      Alert.alert("Sign up failed", e.message || "Please try again.");
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
            <Text style={styles.header}>Create Account</Text>
            <Text style={styles.subheader}>Join and start helping or requesting!</Text>

            <View style={styles.inputGroup}>
              <Ionicons name="mail-outline" size={22} color="#fff" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#bdbdbd"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="person-outline" size={22} color="#fff" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#bdbdbd"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <View style={styles.inputGroup}>
              <Ionicons name="call-outline" size={22} color="#fff" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#bdbdbd"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
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
              />
            </View>
            <View style={styles.roleSwitch}>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  role === "buyer" && styles.roleBtnActive,
                ]}
                onPress={() => setRole("buyer")}
              >
                <Ionicons name="cart-outline" size={18} color="#fff" />
                <Text style={styles.roleBtnText}>Buyer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  role === "helper" && styles.roleBtnActive,
                ]}
                onPress={() => setRole("helper")}
              >
                <Ionicons name="hand-left-outline" size={18} color="#fff" />
                <Text style={styles.roleBtnText}>Helper</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSignUp}
              disabled={loading}
            >
              <LinearGradient
                colors={["#34d399", "#059669"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Creating..." : "Sign Up"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 24 }}
              onPress={() => navigation.navigate("SignIn", { requestData })}
            >
              <Text style={{ color: "#bdbdbd", textAlign: "center" }}>
                Already have an account?{" "}
                <Text style={{ color: "#34d399", fontWeight: "bold" }}>
                  Sign In
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
  roleSwitch: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    marginTop: 4,
  },
  roleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#232136",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  roleBtnActive: {
    borderColor: "#34d399",
    backgroundColor: "#1e293b",
  },
  roleBtnText: { color: "#fff", marginLeft: 8, fontWeight: "600" },
  button: { marginTop: 12, borderRadius: 16, overflow: "hidden" },
  buttonGradient: { paddingVertical: 16, alignItems: "center", borderRadius: 16 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 1 },
});