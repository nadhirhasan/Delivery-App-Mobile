import React, { useState } from "react";
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Modal,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";
import { GOOGLE_MAPS_API_KEY } from '../env';


type Props = NativeStackScreenProps<RootStackParamList, "SignUp">;

export default function SignUpScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "helper">("buyer");
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  // Home location state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [locationPermission, setLocationPermission] = useState(false);
  const [region, setRegion] = useState<any>(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const mapRef = React.useRef<MapView>(null);

  // Request location permission, get current location, and reverse geocode address
  React.useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermission(false);
        return;
      }
      setLocationPermission(true);
      let loc = await Location.getCurrentPositionAsync({});
      // Always set lat/lng from detected location if not already set (i.e., user hasn't tapped map yet)
      setLatitude((prev) => prev ?? loc.coords.latitude);
      setLongitude((prev) => prev ?? loc.coords.longitude);
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      // Try Google Maps Geocoding API for detailed address
      try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${loc.coords.latitude},${loc.coords.longitude}&key=${GOOGLE_MAPS_API_KEY}`);
        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const result = data.results[0];
          setAddress((prev) => prev || result.formatted_address);
        } else {
          throw new Error('No Google geocode result');
        }
      } catch (err) {
        // Fallback to Expo reverse geocode
        let geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
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
          setAddress((prev) => prev || addressParts.join(', '));
        }
      }
    })();
  }, []);

  // Get pending request data if present
  const requestData = route?.params?.requestData;

  // Handler to pick profile picture
  const handlePickProfilePic = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setProfilePic(result.assets[0].uri);
    }
  };

  // Handler for sign up
  const handleSignUp = async () => {
    if (!email || !name || !phone || !password || !latitude || !longitude || !address) {
      Alert.alert("All fields are required, including home location and address!");
      return;
    }
    setLoading(true);
    try {
      // 1. Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error || !data.user) throw error || new Error("No user returned");

      // 2. Upload profile picture if selected
      let uploadedPicUrl = null;
      if (profilePic) {
        const fileName = `${data.user.id}.png`;
        // Always upload as PNG
        let uint8array;
        let contentType = 'image/png';
        try {
          const FileSystem = require('expo-file-system');
          const base64 = await FileSystem.readAsStringAsync(profilePic, { encoding: FileSystem.EncodingType.Base64 });
          const binaryString = atob(base64);
          const len = binaryString.length;
          uint8array = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            uint8array[i] = binaryString.charCodeAt(i);
          }
          if (uint8array.length === 0) throw new Error('Image data is empty.');
        } catch (e) {
          setLoading(false);
          Alert.alert("Failed to read profile image file (base64)", e instanceof Error ? e.message : String(e));
          return;
        }
        const { error: uploadError } = await supabase.storage.from('profile-pics').upload(fileName, uint8array, { upsert: true, contentType });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('profile-pics').getPublicUrl(fileName);
        uploadedPicUrl = publicUrlData?.publicUrl;
      }

      // 3. Insert extra info into Users table
      const { error: userError } = await supabase.from("Users").insert([
        {
          user_id: data.user.id,
          name,
          phone,
          role,
          verified: false,
          rating: 0,
          profile_pic: uploadedPicUrl,
          latitude,
          longitude,
          address,
        },
      ]);
      if (userError) throw userError;

      // 3. Store user id or session as needed
      await SecureStore.setItemAsync("userId", data.user.id);

      // 4. Continue pending request if exists
      if (requestData) {
        navigation.replace("SubmitRequest", { requestData });
      } else {
        navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      }
    } catch (e: any) {
      Alert.alert("Sign up failed", e.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ...existing code...

  return (
    <LinearGradient colors={["#141218", "#2a1b3d"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView
              contentContainerStyle={[styles.container, { minHeight: Dimensions.get('window').height, paddingBottom: 120 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.header}>Create Account</Text>
            {/* Profile Picture Upload */}
            <TouchableOpacity style={{ alignSelf: 'center', marginBottom: 18 }} onPress={handlePickProfilePic}>
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#34d399' }} />
              ) : (
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#232136', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#232136' }}>
                  <Ionicons name="camera-outline" size={32} color="#bdbdbd" />
                </View>
              )}
              <Text style={{ color: '#bdbdbd', marginTop: 6, textAlign: 'center' }}>Add Profile Picture</Text>
            </TouchableOpacity>
            <Text style={styles.subheader}>Join and start helping or requesting!</Text>

            <View style={styles.inputGroup}>
              <Ionicons name="mail-outline" size={22} color="#fff" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#bdbdbd"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Home Location Picker with Apple Map and Manual Search */}
            <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 6, marginTop: 8 }}>Select Your Home Location</Text>
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
                placeholder="Home address"
                placeholderTextColor="#bdbdbd"
                value={address}
                onChangeText={setAddress}
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
                ref={mapRef}
                style={{ flex: 1 }}
                region={region || {
                  latitude: latitude || 7.2906,
                  longitude: longitude || 80.6337,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={locationPermission}
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
                        const result = data.results[0];
                        setAddress(result.formatted_address);
                        // console.log('Google Geocode result:', result);
                        Alert.alert('Address auto-filled (Google)', result.formatted_address);
                      } else {
                        throw new Error('No Google geocode result');
                      }
                    } catch (err) {
                      // Fallback to Expo reverse geocode
                      let geocode = await Location.reverseGeocodeAsync({
                        latitude: e.nativeEvent.coordinate.latitude,
                        longitude: e.nativeEvent.coordinate.longitude,
                      });
                      if (geocode && geocode.length > 0) {
                        const g = geocode[0];
                        // console.log('Expo reverse geocode result:', g);
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
                        setAddress(addressParts.join(', '));
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
            </View>
            <Text style={{ color: '#bdbdbd', fontSize: 13, marginBottom: 4 }}>
              {latitude && longitude ? `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}` : 'Tap on the map to select your home location.'}
            </Text>
            {/* Full Screen Map Modal */}
            <Modal
              visible={mapModalVisible}
              animationType="slide"
              transparent={false}
              onRequestClose={() => setMapModalVisible(false)}
            >
              <View style={{ flex: 1, backgroundColor: '#141218' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18, textAlign: 'center', marginTop: 32, marginBottom: 8 }}>Pick Your Home Location</Text>
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
                  showsUserLocation={locationPermission}
                  onPress={(e) => {
                    setLatitude(e.nativeEvent.coordinate.latitude);
                    setLongitude(e.nativeEvent.coordinate.longitude);
                    setRegion({
                      latitude: e.nativeEvent.coordinate.latitude,
                      longitude: e.nativeEvent.coordinate.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    });
                    // Reverse geocode for new location
                    Location.reverseGeocodeAsync({
                      latitude: e.nativeEvent.coordinate.latitude,
                      longitude: e.nativeEvent.coordinate.longitude,
                    }).then(geocode => {
                      if (geocode && geocode.length > 0) {
                        const g = geocode[0];
                        setAddress(`${g.name ? g.name + ', ' : ''}${g.street ? g.street + ', ' : ''}${g.city ? g.city + ', ' : ''}${g.region ? g.region + ', ' : ''}${g.country ? g.country : ''}`.replace(/, $/, ''));
                      }
                    });
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
            <View style={styles.inputGroup}>
              <Ionicons name="location-outline" size={22} color="#fff" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Home Address (enter manually)"
                placeholderTextColor="#bdbdbd"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="person-outline" size={22} color="#fff" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#bdbdbd"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <View style={styles.inputGroup}>
              <Ionicons name="call-outline" size={22} color="#fff" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#bdbdbd"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={22} color="#fff" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#bdbdbd"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
            <View style={styles.roleSwitch}>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  role === "buyer" && styles.roleBtnActive,
                ]}
                onPress={() => setRole("buyer")}
              >
                <Ionicons name="cart-outline" size={18} color="#fff" />
                <Text style={styles.roleBtnText}>Buyer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  role === "helper" && styles.roleBtnActive,
                ]}
                onPress={() => setRole("helper")}
              >
                <Ionicons name="hand-left-outline" size={18} color="#fff" />
                <Text style={styles.roleBtnText}>Helper</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSignUp}
              disabled={loading}
            >
              <LinearGradient
                colors={["#34d399", "#059669"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Creating..." : "Sign Up"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 24 }}
              onPress={() => navigation.navigate("SignIn", { requestData })}
            >
              <Text style={{ color: "#bdbdbd", textAlign: "center" }}>
                Already have an account?{" "}
                <Text style={{ color: "#34d399", fontWeight: "bold" }}>
                  Sign In
                </Text>
              </Text>
            </TouchableOpacity>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 120 },
  header: { fontSize: 24, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 8 },
  subheader: { fontSize: 14, color: "#c7c7cc", textAlign: "center", marginBottom: 32 },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: "#fff", fontSize: 16 },
  roleSwitch: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
    marginTop: 4,
  },
  roleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#232136",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  roleBtnActive: {
    borderColor: "#34d399",
    backgroundColor: "#1e293b",
  },
  roleBtnText: { color: "#fff", marginLeft: 8, fontWeight: "600" },
  button: { marginTop: 12, borderRadius: 16, overflow: "hidden" },
  buttonGradient: { paddingVertical: 16, alignItems: "center", borderRadius: 16 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 1 },
});