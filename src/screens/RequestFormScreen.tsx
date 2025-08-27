import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Image, FlatList, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image as RNImage } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";


type Props = NativeStackScreenProps<RootStackParamList, "RequestForm">;

type Product = {
  name: string;
  image?: string | null;
};

export default function RequestFormScreen({ route, navigation }: Props) {

  // Support editing existing request
  const requestToUpdate = route.params?.requestToUpdate;
  const category = route.params?.category || requestToUpdate?.category;
  const isPharmacy = category?.id === "pharmacy";

  const [products, setProducts] = useState<Product[]>(
    requestToUpdate
      ? (() => {
          try {
            return JSON.parse(requestToUpdate.item_list || "[]");
          } catch {
            return [{ name: "", image: null }];
          }
        })()
      : [{ name: "", image: null }]
  );
  const [tip, setTip] = useState(requestToUpdate ? String(requestToUpdate.tip) : "");
  const [location, setLocation] = useState(requestToUpdate ? requestToUpdate.delivery_address || "" : "");
  const [updating, setUpdating] = useState(false);

  // Add a new empty product field
  const addProduct = () => setProducts([...products, { name: "", image: null }]);
  // Remove a product field
  const removeProduct = (idx: number) => setProducts(products.filter((_, i) => i !== idx));
  // Update a product name
  const updateProductName = (text: string, idx: number) =>
    setProducts(products.map((p, i) => (i === idx ? { ...p, name: text } : p)));
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
    if (isPharmacy && !products.some(p => p.image)) {
      alert("For pharmacy, please upload at least one product photo.");
      return;
    }
    if (requestToUpdate) {
      // Update existing request
      setUpdating(true);
      const { error } = await supabase
        .from("Requests")
        .update({
          item_list: JSON.stringify(products),
          tip: Number(tip) || 0,
          delivery_address: location,
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
    navigation.navigate("AuthCheck", {
      requestData: {
        products,
        tip,
        location,
        category,
      },
    });
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
            <Text style={styles.header}>{category?.title || "Request"}</Text>
            <Text style={styles.subheader}>Fill in your request details</Text>

            <Text style={styles.label}>Products to buy</Text>
            {products.map((product, index) => (
              <View key={index} style={styles.productRow}>
                <TextInput
                  style={styles.input}
                  placeholder={`Product ${index + 1}`}
                  placeholderTextColor="#bdbdbd"
                  value={product.name}
                  onChangeText={text => updateProductName(text, index)}
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

            <View style={styles.inputGroup}>
              <RNImage
                source={{ uri: "https://cdn-icons-png.flaticon.com/512/684/684908.png" }}
                style={{ width: 22, height: 22, tintColor: '#fff', marginRight: 8 }}
              />
              <TextInput
                style={styles.input}
                placeholder="Delivery location"
                placeholderTextColor="#bdbdbd"
                value={location}
                onChangeText={setLocation}
              />
            </View>

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