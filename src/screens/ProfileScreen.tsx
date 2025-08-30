
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        // Optionally fetch user profile from Users table
        const { data: userProfile } = await supabase
          .from("Users")
          .select("name, profile_pic")
          .eq("user_id", data.user.id)
          .single();
        setUser({ ...data.user, ...userProfile });
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handlePickProfilePic = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets[0].uri && user) {
      const fileName = `${user.id || user.user_id}.png`;
      // Always upload as PNG
      let uint8array;
      let contentType = 'image/png';
      try {
        const FileSystem = require('expo-file-system');
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
        const binaryString = atob(base64);
        const len = binaryString.length;
        uint8array = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          uint8array[i] = binaryString.charCodeAt(i);
        }
        if (uint8array.length === 0) throw new Error('Image data is empty.');
      } catch (e) {
        Alert.alert('Failed to read profile image file (base64)', e instanceof Error ? e.message : String(e));
        return;
      }
      const { error: uploadError } = await supabase.storage.from('profile-pics').upload(fileName, uint8array, { upsert: true, contentType });
      if (uploadError) {
        Alert.alert('Upload failed', uploadError.message);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('profile-pics').getPublicUrl(fileName);
      const newPic = publicUrlData?.publicUrl;
      // Update Users table
      await supabase.from('Users').update({ profile_pic: newPic }).eq('user_id', user.id || user.user_id);
      setUser((u: any) => ({ ...u, profile_pic: newPic }));
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Sign out failed", error.message);
    else navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  };

  if (loading) {
    return (
      <View style={styles.container}><ActivityIndicator size="large" color="#34d399" /></View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Account</Text>
      {user ? (
        <>
          <View style={styles.profileCard}>
            <TouchableOpacity onPress={handlePickProfilePic} style={{ alignItems: 'center', marginBottom: 10 }}>
              <Image
                source={{ uri: user.profile_pic || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
                style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#34d399', marginBottom: 6 }}
              />
              <Text style={{ color: '#bdbdbd', fontSize: 13 }}>Change Profile Picture</Text>
            </TouchableOpacity>
            <Text style={styles.profileName}>{user.name || user.email}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
          </View>
        </>
      ) : (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("SignIn", { requestData: undefined })}>
          <Text style={styles.cardTitle}>Sign In / Sign Up</Text>
          <Text style={styles.cardDesc}>Access your account or create a new one</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardTitle}>Payment</Text>
        <Text style={styles.cardDesc}>Manage your payment methods</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardTitle}>About Us</Text>
        <Text style={styles.cardDesc}>Learn more about our service</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardTitle}>Help & Support</Text>
        <Text style={styles.cardDesc}>Get help or contact support</Text>
      </TouchableOpacity>
      {user && (
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#141218", padding: 18, paddingTop: 32 },
  header: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 24, alignSelf: "center" },
  profileCard: {
    backgroundColor: "#232136",
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
    alignItems: "center",
  },
  profileName: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 4 },
  profileEmail: { color: "#c7c7cc", fontSize: 15, marginBottom: 2 },
  card: {
    backgroundColor: "#232136",
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
    shadowColor: "#34d399",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  cardDesc: { color: "#c7c7cc", fontSize: 14 },
  signOutBtn: {
    marginTop: 32,
    backgroundColor: "#e11d48",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
