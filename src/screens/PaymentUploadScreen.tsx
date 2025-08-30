import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../supabase/client";
import * as SecureStore from 'expo-secure-store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentUpload'>;

export default function PaymentUploadScreen({ route, navigation }: Props) {
  const { requestId } = route.params;
  const [finalPrice, setFinalPrice] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setReceiptImage(result.assets[0].uri as string);
    }
  };

  const handleSubmit = async () => {
    if (!finalPrice || !receiptImage) {
      Alert.alert("Please enter the final price and upload a receipt image.");
      return;
    }
    setUploading(true);
    // Upload image to Supabase Storage (iOS fix: use base64 -> Uint8Array)
    const fileExt = receiptImage ? receiptImage.split('.').pop()?.toLowerCase() : 'jpg';
    const fileName = `${requestId}_${Date.now()}.${fileExt}`;
    // Detect MIME type
    let contentType = 'image/jpeg';
    if (fileExt === 'png') contentType = 'image/png';
    else if (fileExt === 'jpg' || fileExt === 'jpeg') contentType = 'image/jpeg';
    else if (fileExt === 'webp') contentType = 'image/webp';

    let uint8array;
    try {
      // Read file as base64
      const base64 = await require('expo-file-system').readAsStringAsync(receiptImage, { encoding: require('expo-file-system').EncodingType.Base64 });
      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const len = binaryString.length;
      uint8array = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        uint8array[i] = binaryString.charCodeAt(i);
      }
      if (uint8array.length === 0) throw new Error('Image data is empty.');
    } catch (e) {
      setUploading(false);
      Alert.alert("Failed to read image file (base64)", e instanceof Error ? e.message : String(e));
      return;
    }
    const { data: imgData, error: imgError } = await supabase.storage.from('receipts').upload(fileName, uint8array, { upsert: true, contentType });
    if (imgError) {
      setUploading(false);
      Alert.alert("Failed to upload receipt image", imgError.message);
      return;
    }
    const receiptUrl = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl;
    // Get helper_id from SecureStore
    const helperId = await SecureStore.getItemAsync('userId');
    // Get tip from Requests table
    const { data: reqData, error: reqError } = await supabase.from('Requests').select('tip').eq('request_id', requestId).single();
    const tip = reqData?.tip || 0;
    // Insert Payments record
    const { error: payError } = await supabase.from('Payments').insert([
      {
        request_id: requestId,
        helper_id: helperId,
        final_price: Number(finalPrice),
        amount_total: Number(finalPrice) + Number(tip),
        receipt_url: receiptUrl,
        status: 'pending',
      }
    ]);
    if (payError) {
      setUploading(false);
      Alert.alert("Failed to create payment record", payError.message);
      return;
    }
    // Update Requests status to 'receipt_uploaded'
    await supabase.from('Requests').update({ status: 'receipt_uploaded' }).eq('request_id', requestId);
    setUploading(false);
    Alert.alert("Success", "Receipt uploaded and payment info submitted.", [
      { text: "OK", onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Upload Receipt & Enter Final Price</Text>
        <TextInput
          style={styles.input}
          placeholder="Final product price"
          placeholderTextColor="#bdbdbd"
          keyboardType="numeric"
          value={finalPrice}
          onChangeText={setFinalPrice}
        />
        <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
          <Text style={styles.imageBtnText}>{receiptImage ? "Change Receipt Image" : "Upload Receipt Image"}</Text>
        </TouchableOpacity>
        {receiptImage && <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#141218', justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 24 },
  input: { backgroundColor: 'rgba(255,255,255,0.07)', color: '#fff', borderRadius: 10, padding: 14, fontSize: 16, width: '100%', marginBottom: 18 },
  imageBtn: { backgroundColor: '#34d399', borderRadius: 10, padding: 12, marginBottom: 12 },
  imageBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  receiptPreview: { width: 180, height: 180, borderRadius: 12, marginBottom: 18 },
  submitBtn: { backgroundColor: '#059669', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
