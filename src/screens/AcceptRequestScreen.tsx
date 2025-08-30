import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";

// AcceptRequestScreen: Handles accepting a request after sign-in

type Props = NativeStackScreenProps<RootStackParamList, 'AcceptRequest'>;

const AcceptRequestScreen: React.FC<Props> = ({ route, navigation }) => {
  const { acceptRequestId } = route.params;

  useEffect(() => {
    const accept = async () => {
      try {
        // 1. Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user?.id) throw userError || new Error("User not found");
        const helper_id = userData.user.id;

        // 2. Fetch the request
        const { data: req, error: reqError } = await supabase
          .from("Requests")
          .select("*")
          .eq("request_id", acceptRequestId)
          .single();
        if (reqError || !req) throw reqError || new Error("Request not found");
        const buyer_id = req.buyer_id;
        if (helper_id === buyer_id) throw new Error("You cannot accept your own request.");
        if (req.status !== "pending") throw new Error("Request is no longer available.");

        // 3. Update Requests table (ensure atomic update)
        const { error: updateError } = await supabase
          .from("Requests")
          .update({ status: "on_progress" })
          .eq("request_id", acceptRequestId)
          .eq("status", "pending");
        if (updateError) throw updateError;

        // 4. Insert into Matches table
        const { error: matchError } = await supabase
          .from("Matches")
          .insert([
            {
              request_id: acceptRequestId,
              helper_id,
              buyer_id,
              accepted_at: new Date().toISOString(),
            },
          ]);
        if (matchError) throw matchError;

        // 5. Navigate to HelperOrderProgress
        navigation.replace("HelperOrderProgress", { requestId: acceptRequestId });
      } catch (e) {
        const message = e instanceof Error ? e.message : typeof e === "string" ? e : "Please try again.";
        Alert.alert("Failed to accept request", message);
        navigation.goBack();
      }
    };
    accept();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#34d399" />
      <Text style={styles.text}>Accepting request...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#141218" },
  text: { color: "#fff", marginTop: 16 },
});

export default AcceptRequestScreen;
