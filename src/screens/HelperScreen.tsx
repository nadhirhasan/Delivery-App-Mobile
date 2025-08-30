import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { supabase } from "../supabase/client";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import * as Location from 'expo-location';

export default function HelperScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'nearMe' | 'nearHome'>('nearMe');
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [homeLocation, setHomeLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Helper: Haversine formula for distance in km
  function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    function toRad(x: number) { return x * Math.PI / 180; }
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      // Get current user id
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || null;
      setUserId(uid);
      // Get home location from Users table
      let homeLoc = null;
      if (uid) {
        const { data: userProfile } = await supabase.from('Users').select('latitude,longitude').eq('user_id', uid).single();
        if (userProfile && userProfile.latitude && userProfile.longitude) {
          homeLoc = { latitude: userProfile.latitude, longitude: userProfile.longitude };
          setHomeLocation(homeLoc);
        }
      }
      // Get current device location
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } else {
          setCurrentLocation(null);
        }
      } catch (e) {
        setCurrentLocation(null);
      }
      // Fetch all pending requests (with lat/lng)
      let query = supabase
        .from("Requests")
        .select("request_id, tip, delivery_address, buyer_id, item_list, status, latitude, longitude, Users(name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (uid) {
        query = query.neq("buyer_id", uid);
      }
      const { data, error } = await query;
      if (!error) setRequests(data || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Filter and sort requests by proximity
  let sortedRequests: any[] = requests;
  let locationRef = activeTab === 'nearMe' ? currentLocation : homeLocation;
  if (locationRef && requests.length > 0) {
    sortedRequests = [...requests]
      .filter(r => r.latitude && r.longitude)
      .map(r => ({ ...r, _distance: getDistanceKm(locationRef.latitude, locationRef.longitude, r.latitude, r.longitude) }))
      .sort((a, b) => a._distance - b._distance);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pending Requests</Text>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'nearMe' && styles.tabBtnActive]}
          onPress={() => setActiveTab('nearMe')}
        >
          <Text style={[styles.tabText, activeTab === 'nearMe' && styles.tabTextActive]}>Near Me</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'nearHome' && styles.tabBtnActive]}
          onPress={() => setActiveTab('nearHome')}
        >
          <Text style={[styles.tabText, activeTab === 'nearHome' && styles.tabTextActive]}>Near My Home</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#34d399" />
          <Text style={styles.loadingText}>Loading pending requests...</Text>
        </View>
      ) : sortedRequests.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No pending requests right now.</Text>
        </View>
      ) : (
        <FlatList
          data={sortedRequests}
          keyExtractor={(item, index) => {
            let key = item.request_id;
            if (!key || typeof key !== 'string') key = `idx-${index}`;
            else key = `${key}-${index}`;
            return key;
          }}
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
                {typeof item._distance === 'number' && (
                  <Text style={styles.distance}>{item._distance.toFixed(2)} km away</Text>
                )}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#232136',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#232136',
  },
  tabBtnActive: {
    backgroundColor: '#34d399',
  },
  tabText: {
    color: '#bdbdbd',
    fontWeight: '600',
    fontSize: 15,
  },
  tabTextActive: {
    color: '#232136',
  },
  distance: {
    color: '#34d399',
    fontSize: 14,
    marginBottom: 4,
  },
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