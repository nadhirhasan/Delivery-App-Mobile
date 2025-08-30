import React, { useState, useEffect, useRef } from "react";
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
import { Image as RNImage } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import polyline from '@mapbox/polyline';
import { GOOGLE_MAPS_API_KEY } from '../env';

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
  const isFirstLoad = useRef(true);
  const [items, setItems] = useState<{ name: string; image?: string; quantity?: string; unit?: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Cache user's location for the session
  const userLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [helperLocation, setHelperLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [routeDuration, setRouteDuration] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);


  // Fetch receipt image and final price from Payments table if available
  useEffect(() => {
    if (!initialRequest?.request_id) return;
    const fetchPayment = async () => {
      const { data } = await supabase
        .from('Payments')
        .select('receipt_url, final_price')
        .eq('request_id', initialRequest.request_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data && data.receipt_url) {
        setReceiptUrl(data.receipt_url);
      } else {
        setReceiptUrl(null);
      }
      if (data && typeof data.final_price === 'number') {
        setFinalPrice(data.final_price);
      } else {
        setFinalPrice(null);
      }
    };
    fetchPayment();
  }, [initialRequest.request_id]);

  // Fetch helper's current location and route to buyer
  useEffect(() => {
    let isMounted = true;
    async function fetchLocationAndRoute() {
      if (!request || !request.latitude || !request.longitude) return;
      setRouteLoading(true);
      try {
        // Use cached location if available
        let origin = userLocationRef.current;
        if (!origin) {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setRouteLoading(false);
            return;
          }
          let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          origin = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          userLocationRef.current = origin;
        }
        if (isMounted) setHelperLocation(origin);

        // Show static map instantly (no route yet)
        setRouteCoords(null);
        setRouteDistance(null);
        setRouteDuration(null);

        // Fetch route from Google Directions API
        const dest = `${request.latitude},${request.longitude}`;
        const orig = `${origin.latitude},${origin.longitude}`;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${orig}&destination=${dest}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const points = data.routes[0].overview_polyline.points;
          const coords = polyline.decode(points).map(([lat, lng]: [number, number]) => ({ latitude: lat, longitude: lng }));
          if (isMounted) {
            setRouteCoords(coords);
            setRouteDistance(data.routes[0].legs[0].distance.text);
            setRouteDuration(data.routes[0].legs[0].duration.text);
          }
        } else {
          if (isMounted) {
            setRouteCoords(null);
            setRouteDistance(null);
            setRouteDuration(null);
          }
        }
      } catch (e) {
        if (isMounted) {
          setRouteCoords(null);
          setRouteDistance(null);
          setRouteDuration(null);
        }
      } finally {
        if (isMounted) setRouteLoading(false);
      }
    }
    fetchLocationAndRoute();
    return () => { isMounted = false; };
  }, [request.latitude, request.longitude]);

  // Get current user ID for chat
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setCurrentUserId(data.user.id);
    });
  }, []);

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
        navigation.navigate("AuthCheck", { acceptRequestId: request.request_id });
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
      // 3. Update Requests table (ensure atomic update)
      const { error: reqError } = await supabase
        .from("Requests")
        .update({ status: "on_progress" })
        .eq("request_id", request.request_id)
        .eq("status", "pending"); // Only update if still pending
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

  // Only show full-screen loading if it's the first load and no data is available
  if (loading && isFirstLoad.current && !request) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#141218' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Loading request details...</Text>
      </View>
    );
  }

  // After first load, always show content and overlay spinner if loading
  if (!loading && isFirstLoad.current) {
    isFirstLoad.current = false;
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Overlay loading spinner if loading and not first load */}
        {loading && !isFirstLoad.current && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, backgroundColor: 'rgba(20,18,24,0.25)', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Refreshing...</Text>
          </View>
        )}
        {/* Map showing path from helper to delivery location */}
        {/* Only show map and address if not completed */}
        {request.status !== 'completed' && helperLocation && request.latitude && request.longitude && (
          <>
            {(routeDistance || routeDuration) && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                {routeDistance && (
                  <Text style={{ color: '#34d399', fontWeight: 'bold', fontSize: 15, marginRight: 12 }}>Distance: {routeDistance}</Text>
                )}
                {routeDuration && (
                  <Text style={{ color: '#bdbdbd', fontWeight: 'bold', fontSize: 15 }}>ETA: {routeDuration}</Text>
                )}
              </View>
            )}
            <View style={{ height: 220, borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
              <MapView
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: (helperLocation.latitude + request.latitude) / 2,
                  longitude: (helperLocation.longitude + request.longitude) / 2,
                  latitudeDelta: Math.abs(helperLocation.latitude - request.latitude) * 2 + 0.02,
                  longitudeDelta: Math.abs(helperLocation.longitude - request.longitude) * 2 + 0.02,
                }}
              >
                {/* User's location as blue circle */}
                <Marker
                  coordinate={{ latitude: helperLocation.latitude, longitude: helperLocation.longitude }}
                  title="Your Location"
                  pinColor="#2196f3" // blue
                >
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(33,150,243,0.3)', borderWidth: 2, borderColor: '#2196f3', justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#2196f3' }} />
                  </View>
                </Marker>
                {/* Buyer location as green marker */}
                <Marker
                  coordinate={{ latitude: request.latitude, longitude: request.longitude }}
                  title="Buyer Location"
                  pinColor="#34d399" // green
                />
                {/* Route polyline if available */}
                {routeCoords && routeCoords.length > 1 && (
                  <Polyline
                    coordinates={routeCoords}
                    strokeColor="#34d399"
                    strokeWidth={4}
                  />
                )}
              </MapView>
              {routeLoading && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(20,18,24,0.5)' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Loading route...</Text>
                </View>
              )}
            </View>
          </>
        )}
        <Text style={styles.header}>Request Details</Text>
  {/* Chat button, show for on_progress and payment waiting (receipt_uploaded) statuses if user is signed in */}
  {(request.status === 'on_progress' || request.status === 'receipt_uploaded') && currentUserId && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginBottom: 10 }}
            onPress={() => navigation.navigate('Chat', { request_id: request.request_id, currentUserId })}
          >
            <RNImage
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2462/2462719.png' }}
              style={{ width: 22, height: 22, tintColor: '#34d399', marginRight: 6 }}
            />
            <Text style={{ color: '#34d399', fontWeight: 'bold', fontSize: 16 }}>Chat</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.label}>Buyer:</Text>
        <Text style={styles.value}>{request.Users?.name || "Unknown"}</Text>

        {/* Show buy location if present */}
        {request.product_purchase_location && (
          <>
            <Text style={styles.label}>Buy Location:</Text>
            <Text style={styles.value}>{request.product_purchase_location}</Text>
          </>
        )}
        {/* Only show address if not completed */}
        {request.status !== 'completed' && (
          <>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{request.delivery_address}</Text>
          </>
        )}

        {/* Always show tip, and show final price if completed */}
        <Text style={styles.label}>Tip:</Text>
        <Text style={styles.tip}>${request.tip}</Text>
        {request.status === 'completed' && (
          <>
            <Text style={styles.label}>Final Price:</Text>
            <Text style={styles.tip}>{finalPrice !== null ? `$${finalPrice}` : 'N/A'}</Text>
          </>
        )}

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
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                {(item.quantity || item.unit) && (
                  <Text style={{ color: '#bdbdbd', fontSize: 13, marginTop: 2 }}>
                    {item.quantity || '1'} {item.unit || 'pcs'}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Receipt Preview Section - always clickable, shows full screen on click */}
        {receiptUrl && (
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={[styles.label, { marginBottom: 8 }]}>Receipt Image:</Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedImage(receiptUrl);
                setModalVisible(true);
              }}
              style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#34d399' }}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: receiptUrl }}
                style={{ width: 180, height: 180, borderRadius: 12, backgroundColor: '#232136' }}
                resizeMode="cover"
              />
            </TouchableOpacity>
            {/* Full screen modal for receipt image */}
            <Modal
              visible={modalVisible && selectedImage === receiptUrl}
              transparent
              animationType="fade"
              onRequestClose={() => setModalVisible(false)}
            >
              <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                <View style={styles.modalContent}>
                  <Image
                    source={{ uri: receiptUrl }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                </View>
              </Pressable>
            </Modal>
          </View>
        )}
  {/* Only show Accept/Not Interested if not read-only and not in progress/completed */}
  {!isReadOnly && request.status === 'pending' && (
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
        {/* If already in progress or completed, do not show any action buttons */}
      </View>
    </ScrollView>
  );
}

export default RequestDetailScreen;