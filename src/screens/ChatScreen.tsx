import React, { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Image as RNImage, Linking } from "react-native";
import { supabase } from "../supabase/client";
import { Ionicons } from "@expo/vector-icons";


interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  seen?: boolean;
  seen_at?: string;
}

interface ChatUser {
  id?: string;
  name?: string;
  avatar_url?: string;
  phone?: string;
  profile_pic?: string;
}

interface ChatScreenProps {
  route: { params: { request_id: string; currentUserId: string } };
}

export default function ChatScreen({ route }: ChatScreenProps) {
  const { request_id, currentUserId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [receiver, setReceiver] = useState<ChatUser | null>(null);
  const [isHelper, setIsHelper] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  // Fetch receiver info (the other user in the chat)
  useEffect(() => {
    const fetchReceiver = async () => {
      // Get request info to find buyer and helper
      const { data: req, error } = await supabase
        .from("Requests")
        .select("*")
        .eq("request_id", request_id)
        .single();
      console.log('ChatScreen req (no join):', req, 'error:', error);
      console.log('ChatScreen currentUserId:', currentUserId);
      if (!req) return;
      // Fetch helper_id from Matches table for this request
      let helperId: string | null = null;
      const { data: matchRow } = await supabase
        .from("Matches")
        .select("helper_id")
        .eq("request_id", request_id)
        .order("accepted_at", { ascending: false })
        .limit(1)
        .single();
      if (matchRow && matchRow.helper_id) {
        helperId = matchRow.helper_id;
      }
      let otherUserId = null;
        if (helperId && helperId === currentUserId) {
          otherUserId = req.buyer_id;
          setIsHelper(true);
        } else if (req.buyer_id === currentUserId) {
          otherUserId = helperId;
          setIsHelper(false);
        }
      // Robust: always set isHelper true if currentUserId matches helper_id
      if (String(req.helper_id) === String(currentUserId)) {
        setIsHelper(true);
      }
      // If user is the helper for this request, always set isHelper true
      if (req.helper_id === currentUserId) {
        setIsHelper(true);
      }
      // If no helper assigned yet, fallback to buyer_id
      if (!otherUserId) {
        otherUserId = req.buyer_id === currentUserId ? req.helper_id : req.buyer_id;
      }
      let receiverInfo: ChatUser = { id: otherUserId };
      if (otherUserId) {
        const { data: userRow } = await supabase
          .from("Users")
          .select("user_id, name, phone, profile_pic")
          .eq("user_id", otherUserId)
          .single();
        if (userRow) {
          receiverInfo = {
            id: userRow.user_id,
            name: userRow.name,
            phone: userRow.phone?.toString?.() ?? (userRow.phone ? String(userRow.phone) : undefined),
            profile_pic: userRow.profile_pic,
            avatar_url: userRow.profile_pic
          };
        }
      }
      setReceiver(receiverInfo);
    };
    fetchReceiver();
  }, [request_id, currentUserId]);

  // Fetch messages and subscribe to new ones
  useEffect(() => {
    let subscription: any;
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("Messages")
        .select("*")
        .eq("request_id", request_id)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();
    subscription = supabase
      .channel('public:Messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Messages', filter: `request_id=eq.${request_id}` }, payload => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new as Message]);
        }
        if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      })
      .subscribe();
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [request_id]);

  // Mark all unseen messages from the other user as seen when chat is opened or messages change
  useEffect(() => {
    const markSeen = async () => {
      if (!currentUserId || !messages.length) return;
      const unseen = messages.filter(m => m.sender_id !== currentUserId && !m.seen);
      if (unseen.length === 0) return;
      const ids = unseen.map(m => m.id);
      await supabase
        .from("Messages")
        .update({ seen: true, seen_at: new Date().toISOString() })
        .in('id', ids);
    };
    markSeen();
  }, [messages, currentUserId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    await supabase.from("Messages").insert({
      request_id,
      sender_id: currentUserId,
      content: input.trim(),
    });
    setInput("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Find the last message sent by the current user that has been seen by the other user
  const lastSeenMsgId = (() => {
    const sentByMe = messages.filter(m => m.sender_id === currentUserId);
    const seenMsgs = sentByMe.filter(m => m.seen);
    return seenMsgs.length > 0 ? seenMsgs[seenMsgs.length - 1].id : null;
  })();

  const renderItem = ({ item }: { item: Message }) => {
    const isSelf = item.sender_id === currentUserId;
    return (
      <View style={[styles.bubble, isSelf ? styles.bubbleSelf : styles.bubbleOther]}>
        <Text style={styles.bubbleText}>{item.content}</Text>
          <Text style={styles.bubbleTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        {isSelf && item.id === lastSeenMsgId && (
            <Text style={{ color: '#111111ff', fontSize: 11, marginTop: 2, alignSelf: 'flex-end' }}>Seen</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#141218' }}>
      {/* Chat Header */}
      <View style={styles.headerRow}>
        <RNImage
          source={{ uri: receiver?.avatar_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
          style={styles.avatar}
        />
  <Text style={styles.headerName}>{receiver?.name || receiver?.id || 'User'}</Text>
        {/* Only show call button if user is helper */}
        {(() => { console.log('isHelper:', isHelper, 'receiver:', receiver); return null; })()}
        {isHelper && receiver?.phone && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={styles.headerCall} onPress={() => Linking.openURL(`tel:${receiver.phone}`)}>
              <RNImage source={{ uri: 'https://cdn-icons-png.flaticon.com/512/724/724664.png' }} style={{ width: 22, height: 22 }} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerCall, { marginLeft: 6, backgroundColor: '#25D366' }]} onPress={() => Linking.openURL(`https://wa.me/${receiver.phone}`)}>
              <RNImage source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2111/2111728.png' }} style={{ width: 22, height: 22 }} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#bdbdbd"
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <RNImage source={{ uri: 'https://cdn-icons-png.flaticon.com/512/9217/9217990.png' }} style={{ width: 22, height: 22 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196f3',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  headerName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    flex: 1,
  },
  headerCall: {
    marginLeft: 10,
    padding: 6,
    backgroundColor: '#34d399',
    borderRadius: 20,
  },
  list: { flexGrow: 1, padding: 16 },
  bubble: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 10,
    borderRadius: 16,
  },
  bubbleSelf: {
    backgroundColor: '#34d399',
    alignSelf: 'flex-end',
  },
  bubbleOther: {
    backgroundColor: '#232136',
    alignSelf: 'flex-start',
  },
  bubbleText: { color: '#fff', fontSize: 16 },
  bubbleTime: { color: '#c7c7cc', fontSize: 11, marginTop: 2, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#232136',
  },
  input: {
    flex: 1,
    backgroundColor: '#181825',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#34d399',
    borderRadius: 20,
    padding: 10,
  },
});
