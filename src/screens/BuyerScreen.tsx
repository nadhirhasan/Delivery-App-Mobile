import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator"; // adjust path if needed

type Props = NativeStackScreenProps<RootStackParamList, "Buyer">;

type Category = {
  id: string;
  title: string;
  subtitle: string;
  icon: JSX.Element;
  gradient: string[];
};

const BuyerScreen: React.FC<Props> = ({ navigation }) => {
  const categories: Category[] = [
    {
      id: "groceries",
      title: "Groceries",
      subtitle: "Fresh produce, pantry items",
  icon: <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/263/263142.png" }} style={{ width: 30, height: 30 }} />,
      gradient: ["#34d399", "#059669"],
    },
    {
      id: "pharmacy",
      title: "Pharmacy",
      subtitle: "Medicine, health products",
  icon: <MaterialCommunityIcons name="pill" size={30} color="#fff" />,
      gradient: ["#f472b6", "#db2777"],
    },
    {
      id: "food",
      title: "Food",
      subtitle: "Restaurants, fast food",
  icon: <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png" }} style={{ width: 30, height: 30 }} />,
      gradient: ["#facc15", "#ca8a04"],
    },
    {
      id: "other",
      title: "Other",
      subtitle: "Everything else",
  icon: <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/565/565547.png" }} style={{ width: 30, height: 30 }} />,
      gradient: ["#a78bfa", "#6d28d9"],
    },
  ];

  const handleCategorySelect = (category: Category) => {
    navigation.navigate("RequestForm" as any, { category }); // replace 'any' with proper screen if exists
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => handleCategorySelect(item)}
      style={styles.categoryWrapper}
    >
      <LinearGradient colors={item.gradient} style={styles.categoryCard}>
        <View style={styles.iconWrapper}>{item.icon}</View>
        <Text style={styles.categoryTitle}>{item.title}</Text>
        <Text style={styles.categorySubtitle}>{item.subtitle}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={["#141218", "#2a1b3d"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.header}>What do you need?</Text>
        <Text style={styles.subheader}>Choose a category to get started</Text>

        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          contentContainerStyle={{ marginTop: 20 }}
        />

        <View style={styles.footer}>
          <Ionicons name="flash-outline" size={18} color="#ffd60a" />
          <Text style={styles.footerText}>
            Instant Help: Helpers get paid immediately after delivery through
            our secure system
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  header: { fontSize: 22, fontWeight: "700", color: "#fff", paddingTop: 20, textAlign: "center" },
  subheader: { fontSize: 14, color: "#c7c7cc", marginTop: 6, textAlign: "center" },
  categoryWrapper: { flex: 1, marginVertical: 10, marginHorizontal: 5, textAlign: "center" },
  categoryCard: { borderRadius: 18, paddingVertical: 25, paddingHorizontal: 15, alignItems: "center" },
  iconWrapper: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 40, padding: 12, marginBottom: 10 },
  categoryTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  categorySubtitle: { fontSize: 12, color: "#e5e5e5", marginTop: 4, textAlign: "center" },
  footer: { marginTop: "auto", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center" },
  footerText: { fontSize: 12, color: "#fefefe", marginLeft: 8, flex: 1 },
});

export default BuyerScreen;
