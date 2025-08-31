
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";

type Props = NativeStackScreenProps<RootStackParamList, "HelperOrderProgress">;

export default function HelperOrderProgressScreen({ route, navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inProgress, setInProgress] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [helperId, setHelperId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    // Get current helper id
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      setLoading(false);
      Alert.alert("Not signed in", "Please sign in again.");
      navigation.navigate("SignIn", {});
      return;
    }
    const helper_id = userData.user.id;
    setHelperId(helper_id);
    // Get all matches for this helper
    const { data: matches, error: matchError } = await supabase
      .from("Matches")
      .select("request_id, accepted_at, Requests(request_id, status, tip, delivery_address, item_list, Users(name))")
      .eq("helper_id", helper_id)
      .order("accepted_at", { ascending: false });
    if (matchError) {
      setLoading(false);
      Alert.alert("Error", matchError.message);
      return;
    }
    // Separate in-progress and completed
    const inProg = [];
    const comp = [];
    for (const m of matches || []) {
      // If Requests is an array (shouldn't be, but just in case), use the first element
      const req = Array.isArray(m.Requests) ? m.Requests[0] : m.Requests;
      if (req?.status === "on_progress") inProg.push({ ...m, Requests: req });
      else if (req?.status === "completed") comp.push({ ...m, Requests: req });
    }
    setInProgress(inProg);
    setCompleted(comp);
    setLoading(false);
  }, [navigation]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders().finally(() => setRefreshing(false));
  }, [fetchOrders]);

  const handleComplete = async (request_id: string) => {
    // Mark order as completed
    const { error } = await supabase
      .from("Requests")
      .update({ status: "completed" })
      .eq("request_id", request_id);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      fetchOrders();
    }
  };

  const renderOrder = (item: any, isInProgress: boolean) => {
    const req = item.Requests;
    let items: { name: string; image?: string }[] = [];
    try {
      items = JSON.parse(req?.item_list || "[]");
    } catch {
      items = [];
    }
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("RequestDetail", { request: req })}
        activeOpacity={0.9}
      >
        <Text style={styles.buyerName}>{req?.Users?.name ? `Buyer: ${req.Users.name}` : "Buyer"}</Text>
        <Text style={styles.address}>Address: {req?.delivery_address}</Text>
        <Text style={styles.tip}>Tip: <Text style={styles.tipHighlight}>${req?.tip}</Text></Text>
        <Text style={styles.itemsPreview}>{items.length > 0 ? `Items: ${items.length}` : "No items listed."}</Text>
        {isInProgress && req?.status === 'on_progress' && (
          <TouchableOpacity
            style={[styles.uploadBtn, { marginTop: 12 }]}
            onPress={() => navigation.navigate('PaymentUpload', { requestId: req.request_id })}
          >
            <Text style={styles.uploadText}>Upload Receipt</Text>
          </TouchableOpacity>
        )}
        {isInProgress && req?.status === 'receipt_uploaded' && (
          <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(req.request_id)}>
            <Text style={styles.completeText}>Mark as Completed</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#34d399" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Orders In Progress</Text>
      {inProgress.length === 0 ? (
        <Text style={styles.emptyText}>No in-progress orders.</Text>
      ) : (
        <FlatList
          data={inProgress}
          keyExtractor={(item) => item.request_id}
          renderItem={({ item }) => renderOrder(item, true)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
      <Text style={styles.header}>Completed Orders</Text>
      {completed.length === 0 ? (
        <Text style={styles.emptyText}>No completed orders yet.</Text>
      ) : (
        <FlatList
          data={completed}
          keyExtractor={(item) => item.request_id}
          renderItem={({ item }) => renderOrder(item, false)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate("Helper")}> 
        <Text style={styles.backText}>Back to Helper Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#141218", padding: 16 },
  header: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 16, marginTop: 18 },
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
  completeBtn: {
    marginTop: 14,
    backgroundColor: "#34d399",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: "flex-start",
  },
  uploadBtn: {
    backgroundColor: '#fbbf24',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  uploadText: {
    color: '#232136',
    fontWeight: '700',
    fontSize: 15,
  },
  completeText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  backBtn: { marginTop: 32, backgroundColor: "#232136", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 32, borderWidth: 1, borderColor: "#c7c7cc", alignSelf: "center" },
  backText: { color: "#c7c7cc", fontWeight: "700", fontSize: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#141218" },
  loadingText: { color: "#fff", marginTop: 12 },
  emptyText: { color: "#c7c7cc", fontSize: 16, marginBottom: 12 },
});
