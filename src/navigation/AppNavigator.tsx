import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";


import HomeScreen from "../screens/HomeScreen";
import BuyerScreen from "../screens/BuyerScreen";
import HelperScreen from "../screens/HelperScreen";
import SignInScreen from "../screens/SignInScreen";
import SignUpScreen from "../screens/SignUpScreen";
import PaymentScreen from "../screens/PaymentScreen";
import RequestFormScreen from "../screens/RequestFormScreen";
import AuthCheckScreen from "../screens/AuthCheckScreen";
import SubmitRequestScreen from "../screens/SubmitRequestScreen";
import RequestSuccessScreen from "../screens/RequestSuccessScreen";
import RequestDetailScreen from "../screens/RequestDetailScreen";
import MainTabNavigator from "./MainTabNavigator";


export type RootStackParamList = {
  MainTabs: undefined;
  Home: undefined;
  Buyer: undefined;
  Helper: undefined;
  SignIn: { requestData?: any };
  SignUp: { requestData?: any };
  PaymentScreen: undefined;
  RequestForm: { category?: any; requestToUpdate?: any };
  AuthCheck: { requestData: any };
  SubmitRequest: { requestData: any };
  RequestSuccess: undefined;
  RequestDetail: { request: any };
  HelperOrderProgress: { requestId: string };
  Chat: { request_id: string; currentUserId: string };
  PaymentUpload: { requestId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
  <Stack.Navigator initialRouteName="MainTabs">
        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Buyer" component={BuyerScreen} />
        <Stack.Screen name="Helper" component={HelperScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
        <Stack.Screen name="RequestForm" component={RequestFormScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AuthCheck" component={AuthCheckScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SubmitRequest" component={SubmitRequestScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RequestSuccess" component={RequestSuccessScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RequestDetail" component={RequestDetailScreen} options={{ headerShown: false }} />
  <Stack.Screen name="HelperOrderProgress" component={require("../screens/HelperOrderProgressScreen").default} options={{ headerShown: false }} />
  <Stack.Screen name="Chat" component={require("../screens/ChatScreen").default} options={{ headerShown: false }} />
  <Stack.Screen name="PaymentUpload" component={require("../screens/PaymentUploadScreen").default} options={{ headerShown: true, title: 'Upload Receipt' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
