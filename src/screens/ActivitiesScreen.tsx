import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";

export default function ActivitiesScreen() {
  const [activeTab, setActiveTab] = useState<'helper' | 'requests'>('helper');
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [helperActivities, setHelperActivities] = useState<any[]>([]);
  const [requestActivities, setRequestActivities] = useState<any[]>([]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    useEffect(() => {
      let interval: NodeJS.Timeout;
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
          setHelperActivities((matches || []).map(m => {
            const r = Array.isArray(m.Requests) ? m.Requests[0] : m.Requests;
            return { ...m, Requests: r };
          }));

          // Fetch request activities (fix: use buyer_id)
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
      interval = setInterval(fetchData, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }, [isSignedIn]);

    // Helper tab split view rendering
    const renderHelperTab = () => {
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
                      style={[styles.completeBtn, { marginRight: 12 }]}
                      onPress={async () => {
                        await supabase
                          .from("Requests")
                          .update({ status: "completed" })
                          .eq("request_id", req.request_id);
                        // Optionally refresh activities
                        const { data: matches } = await supabase
                          .from("Matches")
                          .select("request_id, accepted_at, Requests(request_id, status, tip, delivery_address, item_list, Users(name))")
                          .eq("helper_id", userId)
                          .order("accepted_at", { ascending: false });
                        setHelperActivities((matches || []).map(m => {
                          const r = Array.isArray(m.Requests) ? m.Requests[0] : m.Requests;
                          return { ...m, Requests: r };
                        }));
                      }}
                    >
                      <Text style={styles.completeText}>Completed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.completeBtn, { backgroundColor: '#e11d48' }]}
                      onPress={async () => {
                        await supabase
                          .from("Requests")
                          .update({ status: "pending" })
                          .eq("request_id", req.request_id);
                        // Optionally refresh activities
                        const { data: matches } = await supabase
                          .from("Matches")
                          .select("request_id, accepted_at, Requests(request_id, status, tip, delivery_address, item_list, Users(name))")
                          .eq("helper_id", userId)
                          .order("accepted_at", { ascending: false });
                        setHelperActivities((matches || []).map(m => {
                          const r = Array.isArray(m.Requests) ? m.Requests[0] : m.Requests;
                          return { ...m, Requests: r };
                        }));
                      }}
                    >
                      <Text style={styles.completeText}>Reject</Text>
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
    };

    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#34d399" />
        </View>
      );
    }

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
        {activeTab === 'helper' ? (
          renderHelperTab()
        ) : (
          isSignedIn ? (
            requestActivities.length === 0 ? (
              <Text style={styles.placeholder}>No requests yet.</Text>
            ) : (
              <FlatList
                data={requestActivities}
                keyExtractor={item => item.request_id}
                renderItem={({ item }) => {
                  let items: { name: string; image?: string }[] = [];
                  try { items = JSON.parse(item?.item_list || "[]"); } catch { items = []; }
                  const isPending = item.status === 'pending';
                  return (
                    <View style={styles.card}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate("RequestDetail", { request: item })}
                      >
                        <Text style={styles.buyerName}>{item?.Users?.name ? `Buyer: ${item.Users.name}` : "Buyer"}</Text>
                        <Text style={styles.address}>Address: {item?.delivery_address}</Text>
                        <Text style={styles.tip}>Tip: <Text style={styles.tipHighlight}>${item?.tip}</Text></Text>
                        <Text style={styles.itemsPreview}>{items.length > 0 ? `Items: ${items.length}` : "No items listed."}</Text>
                        <Text style={styles.status}>Status: {item?.status}</Text>
                      </TouchableOpacity>
                      {isPending && (
                        <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' }}>
                          <TouchableOpacity
                            style={[styles.completeBtn, { backgroundColor: '#e11d48', marginRight: 10 }]}
                            onPress={async () => {
                              await supabase
                                .from("Requests")
                                .delete()
                                .eq("request_id", item.request_id);
                              // Refresh list
                              const { data: requests } = await supabase
                                .from("Requests")
                                .select("*, Users(name)")
                                .eq("buyer_id", userId)
                                .order("created_at", { ascending: false });
                              setRequestActivities(requests || []);
                            }}
                          >
                            <Text style={styles.completeText}>Delete</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.completeBtn, { backgroundColor: '#2563eb' }]}
                            onPress={() => navigation.navigate("RequestForm", { requestToUpdate: item })}
                          >
                            <Text style={styles.completeText}>Update</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                }}
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
}
);
