import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Image as RNImage } from "react-native";

type PendingRequestCardProps = {
  item: any;
  navigation: any;
};

type LatLng = { latitude: number; longitude: number };

export default function PendingRequestCard({ item, navigation }: PendingRequestCardProps) {
  let items: { name: string; image?: string }[] = [];
  try { items = JSON.parse(item?.item_list || "[]"); } catch { items = []; }

  return (
    <View style={{ marginBottom: 16, backgroundColor: '#232136', borderRadius: 12, padding: 16 }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate("RequestDetail", { request: item })}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{item?.Users?.name ? `Buyer: ${item.Users.name}` : "Buyer"}</Text>
        <Text style={{ color: '#c7c7cc', marginTop: 2 }}>Address: {item?.delivery_address}</Text>
        <Text style={{ color: '#34d399', marginTop: 2 }}>Tip: ${item?.tip}</Text>
        <Text style={{ color: '#bdbdbd', marginTop: 2 }}>{items.length > 0 ? `Items: ${items.length}` : "No items listed."}</Text>
        <Text style={{ color: '#bdbdbd', marginTop: 2 }}>Status: {item?.status}</Text>
  {/* No map preview in card for requests tab */}
      </TouchableOpacity>
    </View>
  );
}
