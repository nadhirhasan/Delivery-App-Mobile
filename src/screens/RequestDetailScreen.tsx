import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";

const styles = StyleSheet.create({
  scrollContainer: { paddingTop: 48, flexGrow: 1 },
  container: { flex: 1, backgroundColor: "#141218", padding: 24, borderRadius: 18 },
  header: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 18 },
  label: { color: "#c7c7cc", fontSize: 15, marginTop: 14 },
  value: { color: "#fff", fontSize: 17, fontWeight: "600", marginTop: 2 },
  tip: { color: "#34d399", fontSize: 20, fontWeight: "bold", marginTop: 2 },
  itemsCount: { color: "#34d399", fontSize: 15, fontWeight: "bold", marginBottom: 8, marginTop: 2 },
  itemsContainer: { marginTop: 8 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#232136",
    borderRadius: 10,
    padding: 8,
  },
  itemImage: { width: 44, height: 44, borderRadius: 8, marginRight: 12, backgroundColor: "#222" },
  itemImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#232136",
    borderWidth: 1,
    borderColor: "#444",
  },
  itemName: { color: "#fff", fontSize: 16 },
  actions: { flexDirection: "row", marginTop: 32, justifyContent: "space-between" },
  acceptBtn: {
    backgroundColor: "#34d399",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginRight: 12,
  },
  acceptText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  declineBtn: {
    backgroundColor: "#232136",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "#c7c7cc",
  },
  declineText: { color: "#c7c7cc", fontWeight: "700", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    height: "50%",
    backgroundColor: "#232136",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  modalImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
});

type Props = NativeStackScreenProps<RootStackParamList, "RequestDetail">;

function RequestDetailScreen({ route, navigation }: Props) {
  const { request: initialRequest } = route.params;
  const [request, setRequest] = useState(initialRequest);
  const [items, setItems] = useState<{ name: string; image?: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch latest request data on mount
  useEffect(() => {
    const fetchLatest = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("Requests")
        .select("*, Users(name)")
        .eq("request_id", initialRequest.request_id)
        .single();
      if (data) {
        setRequest(data);
        try {
          setItems(JSON.parse(data.item_list || "[]"));
        } catch {
          setItems([]);
        }
      } else {
        setRequest(initialRequest);
        try {
          setItems(JSON.parse(initialRequest.item_list || "[]"));
        } catch {
          setItems([]);
        }
      }
      setLoading(false);
    };
    fetchLatest();
  }, [initialRequest]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      // 1. Check if helper is signed in
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        setAccepting(false);
        navigation.navigate("AuthCheck", { requestData: { request } });
        return;
      }
      const helper_id = userData.user.id;
      const buyer_id = request.buyer_id;
      // 2. Prevent self-match
      if (helper_id === buyer_id) {
        setAccepting(false);
        Alert.alert("Error", "You cannot accept your own request.");
        return;
      }
      // 3. Update Requests table
      const { error: reqError } = await supabase
        .from("Requests")
        .update({ status: "on_progress" })
        .eq("request_id", request.request_id);
      if (reqError) throw reqError;
      // 4. Insert into Matches table
      const { error: matchError } = await supabase
        .from("Matches")
        .insert([
          {
            request_id: request.request_id,
            helper_id,
            buyer_id,
            accepted_at: new Date().toISOString(),
          },
        ]);
      if (matchError) throw matchError;
      setAccepting(false);
      navigation.replace("HelperOrderProgress", { requestId: request.request_id });
    } catch (e) {
      setAccepting(false);
      const message = e instanceof Error ? e.message : typeof e === "string" ? e : "Please try again.";
      Alert.alert("Failed to accept request", message);
    }
  };

  // Determine if this is a request detail preview (from ActivitiesScreen requests tab)
  const isReadOnly = !request.status || ["completed", "on_progress"].includes(request.status);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#141218' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Loading request details...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {/* Image Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Pressable>
      </Modal>

      <View style={styles.container}>
        <Text style={styles.header}>Request Details</Text>
        <Text style={styles.label}>Buyer:</Text>
        <Text style={styles.value}>{request.Users?.name || "Unknown"}</Text>
        <Text style={styles.label}>Address:</Text>
        <Text style={styles.value}>{request.delivery_address}</Text>
        <Text style={styles.label}>Tip:</Text>
        <Text style={styles.tip}>${request.tip}</Text>

        <Text style={styles.label}>Items:</Text>
        <Text style={styles.itemsCount}>Total Items: {items.length}</Text>
        <View style={styles.itemsContainer}>
          {items.length === 0 && (
            <Text style={styles.value}>No items listed.</Text>
          )}
          {items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              {item.image ? (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(item.image!);
                    setModalVisible(true);
                  }}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <Ionicons name="help-circle-outline" size={28} color="#888" style={{ alignSelf: 'center', marginTop: 7 }} />
                </View>
              )}
              <Text style={styles.itemName}>{item.name}</Text>
            </View>
          ))}
        </View>

        {/* Only show Accept/Not Interested if not read-only (i.e., not from ActivitiesScreen requests tab) */}
        {!isReadOnly && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} disabled={accepting}>
              <Text style={styles.acceptText}>{accepting ? "Accepting..." : "Accept"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => navigation.goBack()}
              disabled={accepting}
            >
              <Text style={styles.declineText}>Not Interested</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

export default RequestDetailScreen;