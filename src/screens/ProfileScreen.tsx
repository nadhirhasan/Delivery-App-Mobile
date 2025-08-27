
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        // Optionally fetch user profile from Users table
        const { data: userProfile } = await supabase
          .from("Users")
          .select("name")
          .eq("user_id", data.user.id)
          .single();
        setUser({ ...data.user, ...userProfile });
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Sign out failed", error.message);
    else navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  };

  if (loading) {
    return (
      <View style={styles.container}><ActivityIndicator size="large" color="#34d399" /></View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Account</Text>
      {user ? (
        <>
          <View style={styles.profileCard}>
            <Text style={styles.profileName}>{user.name || user.email}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
          </View>
        </>
      ) : (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("SignIn", { requestData: undefined })}>
          <Text style={styles.cardTitle}>Sign In / Sign Up</Text>
          <Text style={styles.cardDesc}>Access your account or create a new one</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardTitle}>Payment</Text>
        <Text style={styles.cardDesc}>Manage your payment methods</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardTitle}>About Us</Text>
        <Text style={styles.cardDesc}>Learn more about our service</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardTitle}>Help & Support</Text>
        <Text style={styles.cardDesc}>Get help or contact support</Text>
      </TouchableOpacity>
      {user && (
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#141218", padding: 18, paddingTop: 32 },
  header: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 24, alignSelf: "center" },
  profileCard: {
    backgroundColor: "#232136",
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
    alignItems: "center",
  },
  profileName: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 4 },
  profileEmail: { color: "#c7c7cc", fontSize: 15, marginBottom: 2 },
  card: {
    backgroundColor: "#232136",
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
    shadowColor: "#34d399",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  cardDesc: { color: "#c7c7cc", fontSize: 14 },
  signOutBtn: {
    marginTop: 32,
    backgroundColor: "#e11d48",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
