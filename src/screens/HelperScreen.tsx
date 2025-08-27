import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { supabase } from "../supabase/client";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

export default function HelperScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      // Get current user id
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const uid = userData?.user?.id || null;
      setUserId(uid);
      // Join with Users table to get buyer name, exclude own requests
      let query = supabase
        .from("Requests")
        .select("request_id, tip, delivery_address, buyer_id, item_list, Users(name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (uid) {
        query = query.neq("buyer_id", uid);
      }
      const { data, error } = await query;
      if (!error) setRequests(data || []);
      setLoading(false);
    };
    fetchRequests();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#34d399" />
        <Text style={styles.loadingText}>Loading pending requests...</Text>
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No pending requests right now.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pending Requests</Text>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.request_id}
        renderItem={({ item }) => {
          let items: { name: string; image?: string }[] = [];
          try {
            items = JSON.parse(item.item_list || "[]");
          } catch {
            items = [];
          }
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("RequestDetail", { request: item })}
              activeOpacity={0.9}
            >
              <Text style={styles.buyerName}>
                {item.Users?.name ? `Buyer: ${item.Users.name}` : "Buyer"}
              </Text>
              <Text style={styles.address}>Address: {item.delivery_address}</Text>
              <Text style={styles.tip}>
                Tip: <Text style={styles.tipHighlight}>${item.tip}</Text>
              </Text>
              <Text style={styles.itemsPreview}>
                {items.length > 0
                  ? `Items: ${items.length}`
                  : "No items listed."}
              </Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#141218", padding: 16 },
  header: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 16 },
  card: {
    backgroundColor: "#232136",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#34d399",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  buyerName: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 6 },
  address: { color: "#c7c7cc", fontSize: 15, marginBottom: 8 },
  tip: { color: "#fff", fontSize: 15 },
  tipHighlight: {
    color: "#34d399",
    fontWeight: "bold",
    fontSize: 18,
    marginLeft: 4,
  },
  itemsPreview: { color: "#bdbdbd", fontSize: 13, marginTop: 6 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#141218" },
  loadingText: { color: "#fff", marginTop: 12 },
  emptyText: { color: "#c7c7cc", fontSize: 16 },
});