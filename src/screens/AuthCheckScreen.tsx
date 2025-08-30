import React, { useEffect } from "react";
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { supabase } from "../supabase/client";

type Props = NativeStackScreenProps<RootStackParamList, 'AuthCheck'>;

const AuthCheckScreen: React.FC<Props> = ({ route, navigation }) => {
  const { requestData, acceptRequestId } = route.params || {};

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const userIsSignedIn = !!data?.user;

      if (userIsSignedIn) {
        if (acceptRequestId) {
          navigation.replace("AcceptRequest", { acceptRequestId });
        } else {
          navigation.replace("SubmitRequest", { requestData });
        }
      }
      // else: show sign in/up options below
    };
    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#34d399" />
      <Text style={styles.text}>Checking authentication...</Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => navigation.navigate("SignIn", { requestData, acceptRequestId })}>
          <Text style={styles.link}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("SignUp", { requestData, acceptRequestId })}>
          <Text style={styles.link}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#141218" },
  text: { color: "#fff", marginTop: 16 },
  actions: { flexDirection: "row", marginTop: 24 },
  link: { color: "#34d399", fontWeight: "bold", marginHorizontal: 16, fontSize: 16 },
});

export default AuthCheckScreen;