
import React, { useState, useEffect, useRef } from "react";
import PendingRequestCard from '../components/PendingRequestCard';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Image as RNImage } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";

export default function ActivitiesScreen() {
  // Fetch activities and helper payment info (only when sign in state changes)
  useEffect(() => {
    let interval;
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      setIsSignedIn(!!user);
      setUserId(user?.id || null);
      if (user) {
        // Fetch helper activities: requests the user has accepted to help (Matches where helper_id = user.id)
        const { data: matches } = await supabase
          .from("Matches")
          .select("request_id, accepted_at, Requests(request_id, status, tip, delivery_address, item_list, Users(name))")
          .eq("helper_id", user.id)
          .order("accepted_at", { ascending: false });
        const helperActs = (matches || []).map(m => {
          const r = Array.isArray(m.Requests) ? m.Requests[0] : m.Requests;
          return { ...m, Requests: r };
        });
        setHelperActivities(helperActs);

        // Fetch request activities (where user is buyer)
        const { data: requests } = await supabase
          .from("Requests")
          .select("*, Users(name)")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false });
        setRequestActivities(requests || []);
      } else {
        setHelperActivities([]);
        setRequestActivities([]);
      }
      setLoading(false);
    };
    fetchData();
    interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);
  const [activeTab, setActiveTab] = useState<'helper' | 'requests'>('helper');
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [helperActivities, setHelperActivities] = useState<any[]>([]);
  const [requestActivities, setRequestActivities] = useState<any[]>([]);
  const [paymentInfoMap, setPaymentInfoMap] = useState<{ [requestId: string]: any }>({});
  const [buyerPaymentInfoMap, setBuyerPaymentInfoMap] = useState<{ [requestId: string]: any }>({});
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFirstLoad = useRef(true);


  // Fetch activities and helper payment info (only when sign in state changes)
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'helper' && styles.activeTab]}
          onPress={() => setActiveTab('helper')}
        >
          <Text style={[styles.tabText, activeTab === 'helper' && styles.activeTabText]}>Helper</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requests</Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'helper' && renderHelperTab({ isSignedIn, helperActivities, navigation, paymentInfoMap })}
      {activeTab === 'requests' && (
        isSignedIn ? (
          requestActivities.length === 0 ? (
            <Text style={styles.placeholder}>No requests yet.</Text>
          ) : (
            <FlatList
              data={requestActivities}
              keyExtractor={item => item.request_id}
              renderItem={({ item }) => <PendingRequestCard item={item} navigation={navigation} />}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          )
        ) : (
          <View style={styles.centered}>
            <Text style={styles.placeholder}>Sign in to view your requests.</Text>
            <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate("SignIn", { requestData: undefined })}>
              <Text style={styles.signInText}>Sign In / Sign Up</Text>
            </TouchableOpacity>
          </View>
        )
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#141218", paddingTop: 32 },
  tabBar: { flexDirection: "row", backgroundColor: "#232136", borderRadius: 12, margin: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  activeTab: { backgroundColor: "#34d399", borderRadius: 12 },
  tabText: { color: "#c7c7cc", fontSize: 16, fontWeight: "600" },
  activeTabText: { color: "#fff" },
  placeholder: { color: "#fff", fontSize: 18, textAlign: "center", marginTop: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  signInBtn: { marginTop: 18, backgroundColor: "#34d399", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  signInText: { color: "#fff", fontWeight: "700", fontSize: 16 },
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
  status: { color: "#bdbdbd", fontSize: 13, marginTop: 4 },
  completeBtn: {
    marginTop: 14,
    backgroundColor: "#34d399",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: "flex-start",
  },
  completeText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 4,
  },
});

// Helper tab split view rendering as a separate function (now after styles)
function renderHelperTab({ isSignedIn, helperActivities, navigation, paymentInfoMap }: {
  isSignedIn: boolean;
  helperActivities: any[];
  navigation: any;
  paymentInfoMap: { [requestId: string]: any };
}) {
  if (!isSignedIn) {
    return (
      <View style={styles.centered}>
        <Text style={styles.placeholder}>Sign in to view your helper activities.</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate("SignIn", { requestData: undefined })}>
          <Text style={styles.signInText}>Sign In / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (helperActivities.length === 0) {
    return <Text style={styles.placeholder}>No helper activities yet.</Text>;
  }
  return (
    <View>
      {/* In Progress Orders */}
      <Text style={[styles.header, { marginBottom: 8 }]}>In Progress</Text>
      <FlatList
        data={helperActivities.filter(item => item.Requests?.status === 'on_progress')}
        keyExtractor={item => `${item.request_id}_${item.Requests?.status || ''}_${item.accepted_at}`}
        renderItem={({ item }) => {
          const req = item.Requests;
          let items: { name: string; image?: string }[] = [];
          try { items = JSON.parse(req?.item_list || "[]"); } catch { items = []; }
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("RequestDetail", { request: req })}
            >
              <Text style={styles.buyerName}>{req?.Users?.name ? `Buyer: ${req.Users.name}` : "Buyer"}</Text>
              <Text style={styles.address}>Address: {req?.delivery_address}</Text>
              <Text style={styles.tip}>Tip: <Text style={styles.tipHighlight}>${req?.tip}</Text></Text>
              <Text style={styles.itemsPreview}>{items.length > 0 ? `Items: ${items.length}` : "No items listed."}</Text>
              <Text style={styles.status}>Status: {req?.status}</Text>
              <View style={{ flexDirection: 'row', marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.completeBtn, { marginRight: 12, backgroundColor: '#2563eb' }]}
                  onPress={async () => {
                    // Update status to 'receipt_uploaded' and navigate to PaymentUploadScreen
                    await supabase
                      .from("Requests")
                      .update({ status: "receipt_uploaded" })
                      .eq("request_id", req.request_id);
                    navigation.navigate("PaymentUpload", { requestId: req.request_id });
                  }}
                >
                  <Text style={styles.completeText}>Upload Receipt</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* Payment Waiting (Receipt Uploaded) Orders */}
      <Text style={[styles.header, { marginTop: 24, marginBottom: 8 }]}>Payment Waiting</Text>
      <FlatList
        data={helperActivities.filter(item => item.Requests?.status === 'receipt_uploaded')}
        keyExtractor={item => `${item.request_id}_${item.Requests?.status || ''}_${item.accepted_at}`}
        renderItem={({ item }) => {
          const req = item.Requests;
          const payment = paymentInfoMap[req.request_id];
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("RequestDetail", { request: req })}
            >
              <Text style={styles.buyerName}>{req?.Users?.name ? `Buyer: ${req.Users.name}` : "Buyer"}</Text>
              <Text style={styles.address}>Address: {req?.delivery_address}</Text>
              <Text style={styles.tip}>Tip: <Text style={styles.tipHighlight}>${req?.tip}</Text></Text>
              <Text style={styles.itemsPreview}>{payment ? `Final Price: $${payment.final_price}` : 'Loading payment info...'}</Text>
              <Text style={styles.status}>Status: {payment ? payment.status : 'pending'}</Text>
              <View style={{ flexDirection: 'row', marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.completeBtn, { backgroundColor: '#34d399' }]}
                  onPress={async (e) => {
                    e.stopPropagation && e.stopPropagation();
                    await supabase
                      .from("Requests")
                      .update({ status: "completed" })
                      .eq("request_id", req.request_id);
                    // Optionally refresh list here
                  }}
                >
                  <Text style={styles.completeText}>Mark as Completed</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
      {/* Completed Orders */}
      <Text style={[styles.header, { marginTop: 24, marginBottom: 8 }]}>Completed</Text>
      <FlatList
        data={helperActivities.filter(item => item.Requests?.status === 'completed')}
        keyExtractor={item => `${item.request_id}_${item.Requests?.status || ''}_${item.accepted_at}`}
        renderItem={({ item }) => {
          const req = item.Requests;
          let items: { name: string; image?: string }[] = [];
          try { items = JSON.parse(req?.item_list || "[]"); } catch { items = []; }
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("RequestDetail", { request: req })}
            >
              <Text style={styles.buyerName}>{req?.Users?.name ? `Buyer: ${req.Users.name}` : "Buyer"}</Text>
              <Text style={styles.address}>Address: {req?.delivery_address}</Text>
              <Text style={styles.tip}>Tip: <Text style={styles.tipHighlight}>${req?.tip}</Text></Text>
              <Text style={styles.itemsPreview}>{items.length > 0 ? `Items: ${items.length}` : "No items listed."}</Text>
              <Text style={styles.status}>Status: {req?.status}</Text>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

