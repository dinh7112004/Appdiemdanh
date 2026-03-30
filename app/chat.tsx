import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { ChevronLeft, Send } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../constants/Config';
// Lưu ý: ADMIN_ID này bây giờ chỉ dùng làm mục tiêu gửi tin, 
// việc nhận tin sẽ linh hoạt hơn theo luồng của server.
const ADMIN_ID = "69c38de04767ecb904c8ec79";

export default function ChatScreen() {
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const socketRef = useRef<Socket | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // 1. Lấy thông tin User hiện tại
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const data = await AsyncStorage.getItem('currentUser');
                if (data) {
                    const parsed = JSON.parse(data);
                    const myId = String(parsed._id || parsed.id || "");
                    setCurrentUser({ ...parsed, _id: myId });
                }
            } catch (e) {
                console.error("Lỗi lấy thông tin user:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    // 2. Kết nối Socket & Tải lịch sử chat
    useEffect(() => {
        if (!currentUser?._id) return;

        // --- SỬA LẠI: FETCH LỊCH SỬ CHỈ VỚI 1 ID NHÂN VIÊN ---
        const fetchHistory = async () => {
            try {
                console.log("📡 Đang tải lịch sử luồng chat của nhân viên...");
                const res = await axios.get(`${API_BASE}/messages/${currentUser._id}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });

                const history = res.data.map((msg: any) => ({
                    id: msg._id,
                    text: msg.text,
                    isAdmin: msg.isAdmin,
                    time: new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                }));
                setMessages(history);
            } catch (error) {
                console.log("Lỗi tải lịch sử chat:", error);
            }
        };
        fetchHistory();

        // --- SỬA LẠI: KHỞI TẠO SOCKET VỚI FLAG isAdmin: 'false' ---
        if (!socketRef.current) {
            socketRef.current = io(API_BASE, {
                query: { userId: currentUser._id, isAdmin: 'false' },
                transports: ['websocket']
            });
        }

        // Nghe tin nhắn
        socketRef.current.on('receiveMessage', (msg: any) => {
            console.log("📩 Nhận tin mới từ server:", msg.text);

            // CHỈ CẦN KIỂM TRA: Nếu mình là người nhận HOẶC mình là người gửi (đồng bộ thiết bị)
            if (msg.receiverId === currentUser._id || msg.senderId === currentUser._id) {
                const incomingMsg = {
                    id: msg._id || Date.now().toString(),
                    text: msg.text,
                    isAdmin: msg.isAdmin,
                    time: new Date(msg.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                };

                setMessages((prev) => {
                    if (prev.find(m => m.id === incomingMsg.id)) return prev;
                    return [...prev, incomingMsg];
                });
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.off('receiveMessage');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [currentUser?._id]);

    // 3. Gửi tin nhắn
    const handleSend = async () => {
        if (!inputText.trim() || !currentUser?._id) return;

        const textToSend = inputText.trim();
        setInputText('');

        // Tạo tin nhắn tạm thời để hiển thị ngay (UX mượt)
        const tempId = Date.now().toString();
        const newMessage = {
            id: tempId,
            text: textToSend,
            isAdmin: false,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };

        // CẬP NHẬT NGAY LẬP TỨC LÊN MÀN HÌNH
        setMessages((prev) => [...prev, newMessage]);

        const payload = {
            senderId: currentUser._id,
            receiverId: ADMIN_ID,
            text: textToSend,
            isAdmin: false,
        };

        try {
            await axios.post(`${API_BASE}/messages`, payload);
            // Tin nhắn đã lên server thành công
        } catch (error) {
            console.error("Lỗi gửi tin nhắn:", error);
            // Nếu lỗi thì xóa tin nhắn tạm hoặc báo lỗi (tùy sếp)
            Alert.alert("Lỗi", "Không thể gửi tin nhắn");
        }
    };

    // Tự động cuộn xuống cuối
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 300);
        }
    }, [messages]);

    const renderMessage = ({ item }: any) => {
        const isMe = !item.isAdmin;
        return (
            <View style={[styles.messageWrapper, isMe ? styles.messageMeWrapper : styles.messageAdminWrapper]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleAdmin]}>
                    <Text style={[styles.messageText, { color: isMe ? '#FFF' : '#2A2640' }]}>{item.text}</Text>
                </View>
                <Text style={styles.timeText}>{item.time}</Text>
            </View>
        );
    };

    if (loading) return <View style={styles.loadingBox}><ActivityIndicator color="#6345E5" /></View>;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={28} color="#2A2640" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Hỗ trợ trực tuyến</Text>
                    <View style={styles.onlineStatus}>
                        <View style={styles.dot} />
                        <Text style={styles.headerSub}>Ban quản lý đang online</Text>
                    </View>
                </View>
                <View style={{ width: 28 }} />
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                renderItem={renderMessage}
                contentContainerStyle={styles.chatContainer}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Nhập nội dung cần hỗ trợ..."
                    placeholderTextColor="#A0A0B5"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]}
                    onPress={handleSend}
                    disabled={!inputText.trim()}
                >
                    <Send size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FE' },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#FFF',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        elevation: 2,
    },
    backBtn: { padding: 4 },
    headerInfo: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#2A2640' },
    onlineStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 },
    headerSub: { fontSize: 11, color: '#10B981', fontWeight: '600' },
    chatContainer: { padding: 20, flexGrow: 1, paddingBottom: 40 },
    messageWrapper: { marginBottom: 16, maxWidth: '85%' },
    messageMeWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    messageAdminWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    bubble: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18 },
    bubbleMe: { backgroundColor: '#6345E5', borderBottomRightRadius: 2 },
    bubbleAdmin: { backgroundColor: '#FFF', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#EEE' },
    messageText: { fontSize: 15, lineHeight: 21 },
    timeText: { fontSize: 10, color: '#A0A0B5', marginTop: 4, fontWeight: '500' },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingBottom: Platform.OS === 'ios' ? 35 : 12
    },
    input: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 15,
        maxHeight: 100,
        color: '#333'
    },
    sendButton: {
        backgroundColor: '#6345E5',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10
    },
});