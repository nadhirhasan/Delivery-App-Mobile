import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();

  // Dummy image URLs (replace with your assets later)
  const receiverImg = "https://cdn-icons-png.flaticon.com/512/3081/3081559.png";
  const helperImg = "https://cdn-icons-png.flaticon.com/512/3209/3209265.png";
  const logoImg = "https://cdn-icons-png.flaticon.com/512/833/833472.png";
  const arrowImg = "https://cdn-icons-png.flaticon.com/512/271/271228.png"; // right arrow icon

  // Typing animation for main phrase
  const phrase = "Get what you need, help others and earn!";
  const [displayedText, setDisplayedText] = useState("");

  // Track user session
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(phrase.slice(0, i + 1));
      i++;
      if (i === phrase.length) clearInterval(interval);
    }, 90);
    return () => clearInterval(interval);
  }, []);

  // Check user session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    checkSession();
  }, []);

  // RoleCard Component
  const RoleCard = ({
    title,
    subtitle,
    extra,
    colors,
    icon,
    onPress,
  }: {
    title: string;
    subtitle: string;
    extra: string;
    colors: string[];
    icon: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ marginBottom: 16 }}>
      <LinearGradient colors={colors} style={[styles.roleCard, { width: width * 0.85 }]}> 
        <Image source={{ uri: icon }} style={styles.roleIcon} />
        <View style={styles.roleTextContainer}>
          <Text style={styles.roleTitle}>{title}</Text>
          <Text style={styles.roleSubtitle}>{subtitle}</Text>
          <Text style={styles.roleExtra}>{extra}</Text>
        </View>
        <Image source={{ uri: arrowImg }} style={{ width: 22, height: 22, marginLeft: 8, tintColor: '#fff' }} />
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={["#141218", "#2a1b3d"]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Logo */}
        <View style={styles.topLogo}>
          <Image source={{ uri: logoImg }} style={styles.logo} />
        </View>

        {/* Main Phrase */}
        <View style={styles.centerTextContainer}>
          <Text style={styles.centerText}>{displayedText}</Text>
          <Text style={styles.subPhrase}>
            “Helping each other, one step at a time”
          </Text>
        </View>

        {/* Show user info if signed in */}
        {user && (
          <View style={styles.userInfo}>
            <Ionicons name="person-circle" size={36} color="#34d399" />
            <Text style={styles.userText}>
              Signed in as:{" "}
              <Text style={{ fontWeight: "bold", color: "#fff" }}>
                {user.email}
              </Text>
            </Text>
          </View>
        )}

        {/* Role Cards */}
        <View style={styles.cardsContainer}>
          <RoleCard
            title="I Need Something"
            subtitle="Request items from nearby helpers"
            extra="Groceries • Pharmacy • Food • More"
            colors={["#9333ea", "#06b6d4"]}
            icon={receiverImg}
            onPress={() => navigation.navigate("Buyer")}
          />
          <RoleCard
            title="I Can Help Others"
            subtitle="Earn money helping your community"
            extra="Instant payouts • Flexible schedule"
            colors={["#06b6d4", "#16a34a"]}
            icon={helperImg}
            onPress={() => navigation.navigate("Helper")}
          />
        </View>

        {/* Footer */}
        <Text style={styles.footerNote}>Switch modes anytime in settings</Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    alignItems: "center",
  },
  topLogo: { marginTop: 30, alignItems: "center" },
  logo: { width: 80, height: 80 },
  centerTextContainer: {
    alignItems: "center",
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  centerText: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 30,
  },
  subPhrase: {
    color: "#c7c7cc",
    marginTop: 8,
    fontStyle: "italic",
    fontSize: 14,
    textAlign: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#232136",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 10,
    marginTop: 8,
    alignSelf: "center",
  },
  userText: {
    color: "#c7c7cc",
    marginLeft: 10,
    fontSize: 15,
  },
  cardsContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
  },
  roleIcon: { width: 50, height: 50, borderRadius: 12, marginRight: 16 },
  roleTextContainer: { flex: 1 },
  roleTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  roleSubtitle: { color: "#e0e0e0", fontSize: 14, marginTop: 4 },
  roleExtra: { color: "#d1d5db", fontSize: 12, marginTop: 2 },
  footerNote: {
    textAlign: "center",
    color: "#a1a1aa",
    marginBottom: 20,
    fontSize: 13,
  },
});
