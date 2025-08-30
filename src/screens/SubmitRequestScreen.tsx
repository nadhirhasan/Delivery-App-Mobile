import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";

type Props = NativeStackScreenProps<RootStackParamList, 'SubmitRequest'>;

const SubmitRequestScreen: React.FC<Props> = ({ route, navigation }) => {
  const { requestData } = route.params || {};

  useEffect(() => {
    const submit = async () => {
      try {
        // 1. Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user?.id) throw userError || new Error("User not found");
        const buyer_id = userData.user.id;

        // 2. Prepare request data (all fields)
        const {
          products,
          tip,
          location,
          latitude,
          longitude,
          estimatedPrice,
          paymentMethod,
          buyLocation,
          category,
        } = requestData;
        const item_list = JSON.stringify(products);
        const status = "pending";

        // 3. Insert into Requests table with all fields
        const { error } = await supabase.from("Requests").insert([
          {
            buyer_id,
            item_list,
            tip: Number(tip) || 0,
            status,
            delivery_address: location,
            latitude,
            longitude,
            estimated_price: estimatedPrice ? Number(estimatedPrice) : null,
            payment_method: paymentMethod,
            product_purchase_location: buyLocation || null,
            category_id: category?.id || null,
          },
        ]);
        if (error) throw error;

        // 4. Navigate to Buyer screen
        navigation.replace("RequestSuccess");
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : typeof e === "string"
            ? e
            : "Please try again.";
        Alert.alert("Request failed", message);
        navigation.goBack();
      }
    };
    submit();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#34d399" />
      <Text style={styles.text}>Submitting your request...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#141218" },
  text: { color: "#fff", marginTop: 16 },
});

export default SubmitRequestScreen;