import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Image, FlatList, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image as RNImage } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from '../env';
import * as SecureStore from 'expo-secure-store';
import { Modal, Dimensions, Alert } from 'react-native';


type Props = NativeStackScreenProps<RootStackParamList, "RequestForm">;

type Product = {
  name: string;
  quantity?: string;
  unit?: string;
  image?: string | null;
};

export default function RequestFormScreen({ route, navigation }: Props) {
  const requestToUpdate = route.params?.requestToUpdate;
  const [buyLocation, setBuyLocation] = useState(requestToUpdate ? requestToUpdate.product_purchase_location || '' : '');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [region, setRegion] = useState<any>(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);

  // Support editing existing request
  const category = route.params?.category || requestToUpdate?.category;
  const [estimatedPrice, setEstimatedPrice] = useState(requestToUpdate ? String(requestToUpdate.estimated_price || '') : '');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>(requestToUpdate?.payment_method || 'cod');
  // Helper to render category icon if present
  const renderCategoryIcon = () => {
    if (!category) return null;
    if (category.iconUrl) {
      return <Image source={{ uri: category.iconUrl }} style={{ width: 30, height: 30, marginRight: 10 }} />;
    }
    if (category.iconName) {
      return <RNImage source={{ uri: "https://cdn-icons-png.flaticon.com/512/2972/2972415.png" }} style={{ width: 30, height: 30, marginRight: 10 }} />;
      // Or use Ionicons/MaterialCommunityIcons if you want vector icons
      // return <MaterialCommunityIcons name={category.iconName} size={30} color="#fff" style={{ marginRight: 10 }} />;
    }
    return null;
  };
  const isPharmacy = category?.id === "pharmacy";

  const [products, setProducts] = useState<Product[]>(
    requestToUpdate
      ? (() => {
          try {
            // Add quantity/unit if missing for backward compatibility
            return JSON.parse(requestToUpdate.item_list || "[]").map((p: any) => ({
              name: p.name || "",
              quantity: p.quantity || "1",
              unit: p.unit || "pcs",
              image: p.image || null,
            }));
          } catch {
            return [{ name: "", quantity: "1", unit: "pcs", image: null }];
          }
        })()
      : [{ name: "", quantity: "1", unit: "pcs", image: null }]
  );
  const [tip, setTip] = useState(requestToUpdate ? String(requestToUpdate.tip) : "");
  const [location, setLocation] = useState(requestToUpdate ? requestToUpdate.delivery_address || "" : "");
  // On mount, prefill with user's home location
  React.useEffect(() => {
    (async () => {
      // If editing, use request's lat/lng if present
      if (requestToUpdate && requestToUpdate.latitude && requestToUpdate.longitude) {
        setLatitude(requestToUpdate.latitude);
        setLongitude(requestToUpdate.longitude);
        setRegion({
          latitude: requestToUpdate.latitude,
          longitude: requestToUpdate.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setLocation(requestToUpdate.delivery_address || "");
        return;
      }
      // Get userId from SecureStore
      let userId = await SecureStore.getItemAsync('userId');
      if (!userId) return;
      // Fetch user home location from Users table
      let { data: user, error } = await supabase.from('Users').select('latitude,longitude,address').eq('user_id', userId).single();
      if (user) {
        setLatitude(user.latitude);
        setLongitude(user.longitude);
        setRegion({
          latitude: user.latitude,
          longitude: user.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setLocation((prev: string) => prev || user.address || "");
      }
    })();
  }, []);
  const [updating, setUpdating] = useState(false);

  // Add a new empty product field
  const addProduct = () => setProducts([...products, { name: "", quantity: "1", unit: "pcs", image: null }]);
  // Remove a product field
  const removeProduct = (idx: number) => setProducts(products.filter((_, i) => i !== idx));
  // Update a product name
  const updateProductName = (text: string, idx: number) =>
    setProducts(products.map((p, i) => (i === idx ? { ...p, name: text } : p)));
  // Update a product quantity
  const updateProductQuantity = (text: string, idx: number) =>
    setProducts(products.map((p, i) => (i === idx ? { ...p, quantity: text.replace(/[^0-9.]/g, "") } : p)));
  // Update a product unit
  const updateProductUnit = (text: string, idx: number) =>
    setProducts(products.map((p, i) => (i === idx ? { ...p, unit: text } : p)));
  // Update a product image
  const updateProductImage = async (idx: number) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setProducts(products.map((p, i) => (i === idx ? { ...p, image: result.assets[0].uri } : p)));
    }
  };


  const handleSubmit = async () => {
    // Block if not signed in: check both SecureStore and Supabase session
    const userId = await SecureStore.getItemAsync('userId');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const supabaseUserId = userData?.user?.id;
    if (!userId || !supabaseUserId || userId !== supabaseUserId) {
      navigation.navigate('SignIn', {
        requestData: {
          products,
          tip,
          location,
          latitude,
          longitude,
          estimatedPrice,
          paymentMethod,
          buyLocation,
          category,
        },
      });
      return;
    }
    if (isPharmacy && !products.some(p => p.image)) {
      alert("For pharmacy, please upload at least one product photo.");
      return;
    }
    // Only block if lat/lng are truly null or undefined
    if ((latitude === null || longitude === null || typeof latitude === 'undefined' || typeof longitude === 'undefined') || !location) {
      Alert.alert('Please select a delivery location on the map.');
      return;
    }
    if (requestToUpdate) {
      // Update existing request
      setUpdating(true);
      // Ensure all products have quantity and unit before saving
      const productsToSave = products.map(p => ({
        ...p,
        quantity: p.quantity || "1",
        unit: p.unit || "pcs",
      }));
      const { error } = await supabase
        .from("Requests")
        .update({
          item_list: JSON.stringify(productsToSave),
          tip: Number(tip) || 0,
          delivery_address: location,
          latitude,
          longitude,
          estimated_price: estimatedPrice ? Number(estimatedPrice) : null,
          payment_method: paymentMethod,
          product_purchase_location: buyLocation || null,
        })
        .eq("request_id", requestToUpdate.request_id);
      setUpdating(false);
      if (error) {
        alert("Failed to update request: " + error.message);
        return;
      }
      navigation.goBack();
      return;
    }
    // Save new request directly to Requests table with estimated_price and payment_method
    setUpdating(true);
    // Ensure all products have quantity and unit before saving
    const productsToSave = products.map(p => ({
      ...p,
      quantity: p.quantity || "1",
      unit: p.unit || "pcs",
    }));
    const { data, error } = await supabase
      .from("Requests")
      .insert([
        {
          buyer_id: userId,
          item_list: JSON.stringify(productsToSave),
          tip: Number(tip) || 0,
          delivery_address: location,
          latitude,
          longitude,
          estimated_price: estimatedPrice ? Number(estimatedPrice) : null,
          payment_method: paymentMethod,
          product_purchase_location: buyLocation || null,
          status: 'pending',
        },
      ]);
    setUpdating(false);
    if (error) {
      alert("Failed to create request: " + error.message);
      return;
    }
  navigation.navigate("RequestSuccess");
  };

  return (
    <LinearGradient colors={["#141218", "#2a1b3d"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <RNImage
                source={{ uri: "https://cdn-icons-png.flaticon.com/512/271/271220.png" }}
                style={{ width: 26, height: 26, tintColor: '#fff' }}
              />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              {renderCategoryIcon()}
              <Text style={styles.header}>{category?.title || "Request"}</Text>
            </View>
            <Text style={styles.subheader}>Fill in your request details</Text>

            <Text style={styles.label}>Products to buy</Text>
            {products.map((product, index) => (
              <View key={index} style={styles.productRow}>
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  placeholder={`Product ${index + 1}`}
                  placeholderTextColor="#bdbdbd"
                  value={product.name}
                  onChangeText={text => updateProductName(text, index)}
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 6, minWidth: 40 }]}
                  placeholder="Qty"
                  placeholderTextColor="#bdbdbd"
                  value={product.quantity}
                  onChangeText={text => updateProductQuantity(text, index)}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 6, minWidth: 50 }]}
                  placeholder="Unit (e.g. pcs, kg)"
                  placeholderTextColor="#bdbdbd"
                  value={product.unit}
                  onChangeText={text => updateProductUnit(text, index)}
                  autoCapitalize="none"
                  maxLength={10}
                />
                <TouchableOpacity style={styles.productImgBtn} onPress={() => updateProductImage(index)}>
                  <RNImage
                    source={{ uri: "https://cdn-icons-png.flaticon.com/512/1829/1829586.png" }}
                    style={{ width: 22, height: 22, tintColor: '#fff' }}
                  />
                </TouchableOpacity>
                {products.length > 1 && (
                  <TouchableOpacity onPress={() => removeProduct(index)}>
                    <RNImage
                      source={{ uri: "https://cdn-icons-png.flaticon.com/512/1214/1214428.png" }}
                      style={{ width: 24, height: 24, tintColor: '#f87171' }}
                    />
                  </TouchableOpacity>
                )}
                {product.image && (
                  <Image source={{ uri: product.image }} style={styles.productImgPreview} />
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addBtn} onPress={addProduct}>
              <RNImage
                source={{ uri: "https://cdn-icons-png.flaticon.com/512/992/992651.png" }}
                style={{ width: 22, height: 22, tintColor: '#34d399', marginRight: 6 }}
              />
              <Text style={styles.addBtnText}>Add Product</Text>
            </TouchableOpacity>

            {/* Buy Location (optional) */}
            <View style={styles.inputGroup}>
              <RNImage
                source={{ uri: "https://cdn-icons-png.flaticon.com/512/535/535239.png" }}
                style={{ width: 22, height: 22, tintColor: '#fff', marginRight: 8 }}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. Supermarket, Pharmacy, Restaurant, etc. (optional)"
                placeholderTextColor="#bdbdbd"
                value={buyLocation}
                onChangeText={setBuyLocation}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>

            {/* Estimated Price (optional) */}
            <View style={styles.inputGroup}>
              <RNImage
                source={{ uri: "https://cdn-icons-png.flaticon.com/512/148/148767.png" }}
                style={{ width: 22, height: 22, tintColor: '#fff', marginRight: 8 }}
              />
              <TextInput
                style={styles.input}
                placeholder="Estimated price (optional)"
                placeholderTextColor="#bdbdbd"
                keyboardType="numeric"
                value={estimatedPrice}
                onChangeText={setEstimatedPrice}
              />
            </View>

            {/* Tip */}
            <View style={styles.inputGroup}>
              <RNImage
                source={{ uri: "https://cdn-icons-png.flaticon.com/512/25/25473.png" }}
                style={{ width: 22, height: 22, tintColor: '#fff', marginRight: 8 }}
              />
              <TextInput
                style={styles.input}
                placeholder="Tip amount (optional)"
                placeholderTextColor="#bdbdbd"
                keyboardType="numeric"
                value={tip}
                onChangeText={setTip}
              />
            </View>

            {/* Payment Method Selection */}
            <Text style={styles.label}>Payment Method</Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.paymentMethodBtn, paymentMethod === 'cod' && styles.paymentMethodBtnActive]}
                onPress={() => setPaymentMethod('cod')}
              >
                <Text style={[styles.paymentMethodText, paymentMethod === 'cod' && styles.paymentMethodTextActive]}>Cash on Delivery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentMethodBtn, paymentMethod === 'online' && styles.paymentMethodBtnActive]}
                onPress={() => setPaymentMethod('online')}
              >
                <Text style={[styles.paymentMethodText, paymentMethod === 'online' && styles.paymentMethodTextActive]}>Online Payment</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#fbbf24', fontSize: 13, marginBottom: 8 }}>
              Final price will be set by the helper’s receipt after purchase. You will pay the actual cost plus tip.
            </Text>

            <Text style={styles.label}>Delivery Location</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255,255,255,0.09)',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: '#fff',
                  fontSize: 15,
                  flex: 1,
                  marginRight: 8,
                }}
                placeholder="Delivery address"
                placeholderTextColor="#bdbdbd"
                value={location}
                onChangeText={setLocation}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={{ backgroundColor: '#34d399', borderRadius: 8, padding: 10 }}
                onPress={() => setMapModalVisible(true)}
              >
                <Ionicons name="map-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={{ height: 220, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
              <MapView
                style={{ flex: 1 }}
                region={region || {
                  latitude: latitude || 7.2906,
                  longitude: longitude || 80.6337,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
              >
                {latitude && longitude && (
                  <Marker coordinate={{ latitude, longitude }} />
                )}
              </MapView>
            </View>
            <Text style={{ color: '#bdbdbd', fontSize: 13, marginBottom: 4 }}>
              {latitude && longitude ? `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}` : 'Tap on the map to select delivery location.'}
            </Text>

            {/* Full Screen Map Modal */}
            <Modal
              visible={mapModalVisible}
              animationType="slide"
              transparent={false}
              onRequestClose={() => setMapModalVisible(false)}
            >
              <View style={{ flex: 1, backgroundColor: '#141218' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18, textAlign: 'center', marginTop: 32, marginBottom: 8 }}>Pick Delivery Location</Text>
                <MapView
                  style={{ flex: 1 }}
                  initialRegion={region || {
                    latitude: latitude || 7.2906,
                    longitude: longitude || 80.6337,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  region={region || {
                    latitude: latitude || 7.2906,
                    longitude: longitude || 80.6337,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  showsUserLocation={true}
                  onPress={(e) => {
                    setLatitude(e.nativeEvent.coordinate.latitude);
                    setLongitude(e.nativeEvent.coordinate.longitude);
                    setRegion({
                      latitude: e.nativeEvent.coordinate.latitude,
                      longitude: e.nativeEvent.coordinate.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    });
                    // Try Google Maps Geocoding API for detailed address
                    (async () => {
                      try {
                        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${e.nativeEvent.coordinate.latitude},${e.nativeEvent.coordinate.longitude}&key=${GOOGLE_MAPS_API_KEY}`);
                        const data = await response.json();
                        if (data.status === 'OK' && data.results && data.results.length > 0) {
                          // Find the most detailed result (with most address_components)
                          let bestResult = data.results[0];
                          for (const r of data.results) {
                            if (r.address_components && r.address_components.length > bestResult.address_components.length) {
                              bestResult = r;
                            }
                          }
                          // Build a detailed address string
                          const getComponent = (type: string) => {
                            const comp = bestResult.address_components.find((c: any) => c.types.includes(type));
                            return comp ? comp.long_name : '';
                          };
                          const addressParts = [
                            getComponent('route'), // road
                            getComponent('sublocality'),
                            getComponent('locality'), // city/town
                            getComponent('administrative_area_level_2'), // district
                            getComponent('administrative_area_level_1'), // state/province
                            getComponent('country'),
                            getComponent('postal_code'),
                          ].filter(Boolean);
                          const detailedAddress = addressParts.join(', ');
                          setLocation(detailedAddress || bestResult.formatted_address);
                          Alert.alert('Address auto-filled (Google)', detailedAddress || bestResult.formatted_address);
                        }
                      } catch (err) {
                        let geocode = await Location.reverseGeocodeAsync({
                          latitude: e.nativeEvent.coordinate.latitude,
                          longitude: e.nativeEvent.coordinate.longitude,
                        });
                        if (geocode && geocode.length > 0) {
                          const g = geocode[0];
                          const addressParts = [
                            g.name || '',
                            g.street || '',
                            g.subregion || '',
                            g.district || '',
                            g.city || '',
                            g.region || '',
                            g.postalCode || '',
                            g.country || ''
                          ].filter(Boolean);
                          setLocation(addressParts.join(', '));
                          Alert.alert('Address auto-filled (Expo)', addressParts.join(', '));
                        }
                      }
                    })();
                  }}
                >
                  {latitude && longitude && (
                    <Marker coordinate={{ latitude, longitude }} />
                  )}
                </MapView>
                <TouchableOpacity
                  style={{ backgroundColor: '#34d399', borderRadius: 12, padding: 16, margin: 24 }}
                  onPress={() => setMapModalVisible(false)}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>Confirm Location</Text>
                </TouchableOpacity>
              </View>
            </Modal>

            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={updating}>
              <LinearGradient colors={["#34d399", "#059669"]} style={styles.buttonGradient}>
                <Text style={styles.buttonText}>{requestToUpdate ? (updating ? "Updating..." : "Update Request") : "Submit Request"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  paymentMethodBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  paymentMethodBtnActive: {
    backgroundColor: '#34d399',
  },
  paymentMethodText: {
    color: '#bdbdbd',
    fontWeight: '600',
    fontSize: 15,
  },
  paymentMethodTextActive: {
    color: '#fff',
  },
  backBtn: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 10,
    padding: 8,
  },
  container: { flexGrow: 1, padding: 24, justifyContent: "center" },
  header: { fontSize: 24, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 8 },
  subheader: { fontSize: 14, color: "#c7c7cc", textAlign: "center", marginBottom: 24 },
  label: { color: "#bdbdbd", fontSize: 13, marginBottom: 6, marginTop: 12, fontWeight: "600" },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexWrap: "wrap",
  },
  productImgBtn: {
    marginLeft: 8,
    backgroundColor: "#232136",
    borderRadius: 8,
    padding: 4,
  },
  productImgPreview: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  addBtn: { flexDirection: "row", alignItems: "center", marginBottom: 10, marginTop: 2 },
  addBtnText: { color: "#34d399", fontWeight: "600", marginLeft: 6 },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: "#fff", fontSize: 16 },
  button: { marginTop: 18, borderRadius: 16, overflow: "hidden" },
  buttonGradient: { paddingVertical: 16, alignItems: "center", borderRadius: 16 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 1 },
});