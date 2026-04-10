import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ImagePlus, MoreVertical, Paperclip, Send, Sticker, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList,
    Keyboard, KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { API_BASE } from '../constants/Config';
import { useSocket } from '../context/SocketContext';

const PRIMARY_PURPLE = "#6345E5";
const ADMIN_ID = "69c38de04767ecb904c8ec79";

const SAMPLE_STICKERS = [
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2Z5OGwwcms3OXIyeHJjcmIwaDY3MW1jejB2NndibHMzcHJmaGg2ZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1D7ryE8SDYuq8kGGGQ/giphy.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMndycWdlYmFpdDVjaXkxdGt5b2xuemlrcDhsbWI5cXZsbTFvYmJqaSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/cXblnKXr2BQOaYnTni/200.webp",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGlmenBvY25oZTU2OG5yNDd4NjBlaTdodWNsa2loOHFjdW9ma29rMyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/AAsj7jdrHjtp6/giphy.webp",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjh1cHhraXRwM2h5dThoMHY0enJkMDlvMDByMDBqZnhmemRyNW9neSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/nR4L10XlJcSeQ/200.webp",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjh1cHhraXRwM2h5dThoMHY0enJkMDlvMDByMDBqZnhmemRyNW9neSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xTiTnMhJTwNHChdTZS/giphy.webp",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXhxdzA0MG45MzNuaGwxdWw1emszOTdmcGcyZXJuYWg3dXo3ejlsayZlcD12MV9naWZzX3NlYXJjaCZjdD1n/RILsqUte1MME7TzQJ9/giphy.webp",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExamtpMWo2MnAwYnlzeWdhcDFqb2N6ZHp6bWtkeDA4amN4OHgxcDg5NiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/tIeCLkB8geYtW/200.webp",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExamtpMWo2MnAwYnlzeWdhcDFqb2N6ZHp6bWtkeDA4amN4OHgxcDg5NiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/rMEJyjch7L1tlRlCl3/200.webp",
    "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif", "https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif",
    "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif", "https://media.giphy.com/media/l41YkxvU8c7J7Bba0/giphy.gif",
    "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif", "https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif"
];

export default function ChatScreen() {
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const router = useRouter();
    const params = useLocalSearchParams();
    const messageId = params.messageId as string | undefined;

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [isSending, setIsSending] = useState(false);
    const [showStickers, setShowStickers] = useState(false);
    const [targetMessageId, setTargetMessageId] = useState<string | null>(null);

    const { socket } = useSocket();
    const flatListRef = useRef<FlatList>(null);

    const isImageFile = (fileName: string) => /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(fileName);

    const getFullUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://') || url.startsWith('data:')) {
            return url;
        }
        return `${API_BASE}${url}`;
    };

    const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

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

    useEffect(() => {
        if (!currentUser?._id) return;
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${API_BASE}/messages/${currentUser._id}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                const history = res.data.map((msg: any) => ({
                    id: msg._id,
                    text: msg.text,
                    isAdmin: msg.isAdmin,
                    file: msg.fileName ? { name: msg.fileName, url: msg.fileUrl } : null,
                    time: new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                }));
                setMessages(history);
            } catch (error) {
                console.log("Lỗi tải lịch sử chat:", error);
            }
        };
        fetchHistory();
    }, [currentUser?._id]);

    // Xử lý cuộn tới tin nhắn
    useEffect(() => {
        if (messageId && reversedMessages.length > 0) {
            setTargetMessageId(messageId);
            const targetIndex = reversedMessages.findIndex(m => m.id === messageId);

            if (targetIndex !== -1) {
                setTimeout(() => {
                    try {
                        flatListRef.current?.scrollToIndex({
                            index: targetIndex,
                            animated: true,
                            viewPosition: 0.5
                        });
                    } catch (e) {
                        console.log("Chưa render kịp", e);
                    }
                }, 500);
            }
        }
    }, [messageId, reversedMessages.length]);

    // Tự động tắt highlight
    useEffect(() => {
        if (targetMessageId) {
            const timer = setTimeout(() => {
                setTargetMessageId(null);
                router.setParams({ messageId: '' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [targetMessageId]);

    useEffect(() => {
        if (!socket || !currentUser?._id) return;
        const handleReceiveMessage = (msg: any) => {
            if (msg.receiverId === currentUser._id || msg.senderId === currentUser._id) {
                const incomingMsg = {
                    id: msg._id || Date.now().toString(),
                    text: msg.text,
                    isAdmin: msg.isAdmin,
                    file: msg.fileName ? { name: msg.fileName, url: msg.fileUrl } : null,
                    time: new Date(msg.createdAt || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages((prev) => {
                    if (prev.find(m => m.id === incomingMsg.id)) return prev;
                    return [...prev, incomingMsg];
                });
            }
        };
        socket.on('receiveMessage', handleReceiveMessage);
        return () => { socket.off('receiveMessage', handleReceiveMessage); };
    }, [socket, currentUser?._id]);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                setSelectedFile(result.assets[0]);
                setShowStickers(false);
            }
        } catch (err) {
            console.error("Lỗi chọn tệp:", err);
        }
    };

    const pickImage = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setSelectedFile({
                    uri: asset.uri,
                    name: asset.fileName || asset.uri.split('/').pop() || 'image.jpg',
                    mimeType: asset.mimeType || 'image/jpeg',
                });
                setShowStickers(false);
            }
        } catch (err) {
            console.error("Lỗi chọn ảnh:", err);
        }
    };

    const sendSticker = async (stickerUrl: string) => {
        if (!currentUser?._id || isSending) return;
        const textToSend = `[STICKER]${stickerUrl}`;
        const tempId = Date.now().toString();

        setMessages((prev) => [...prev, { id: tempId, text: textToSend, isAdmin: false, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), file: null }]);
        setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 10);
        setShowStickers(false);

        try {
            const formData = new FormData();
            formData.append('senderId', currentUser._id);
            formData.append('receiverId', ADMIN_ID);
            formData.append('text', textToSend);
            formData.append('isAdmin', 'false');
            await axios.post(`${API_BASE}/messages`, formData, { headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' } });
        } catch (error) { console.error("Lỗi gửi sticker:", error); }
    };

    const handleSend = async () => {
        if ((!inputText.trim() && !selectedFile) || !currentUser?._id || isSending) return;

        const textToSend = inputText.trim();
        const fileToSend = selectedFile;

        setInputText('');
        setSelectedFile(null);
        setIsSending(true);

        const tempId = Date.now().toString();

        const newMessage = {
            id: tempId,
            text: textToSend,
            isAdmin: false,
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            file: fileToSend ? { name: fileToSend.name, url: fileToSend.uri } : null
        };

        setMessages((prev) => [...prev, newMessage]);
        setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 10);

        try {
            const formData = new FormData();
            formData.append('senderId', currentUser._id);
            formData.append('receiverId', ADMIN_ID);
            formData.append('text', textToSend);
            formData.append('isAdmin', 'false');

            if (fileToSend) {
                formData.append('file', {
                    uri: Platform.OS === 'ios' ? fileToSend.uri.replace('file://', '') : fileToSend.uri,
                    name: fileToSend.name,
                    type: fileToSend.mimeType || 'application/octet-stream',
                } as any);
            }

            await axios.post(`${API_BASE}/messages`, formData, { headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' } });
        } catch (error) {
            console.error("Lỗi gửi tin nhắn:", error);
            Alert.alert("Lỗi", "Không thể gửi tin nhắn. Hãy kiểm tra kết nối mạng.");
        } finally {
            setIsSending(false);
        }
    };

    const renderMessage = ({ item }: any) => {
        const isMe = !item.isAdmin;
        const isSticker = item.text && item.text.startsWith('[STICKER]');
        const stickerUrl = isSticker ? item.text.replace('[STICKER]', '') : null;
        const isOnlyImage = item.file && isImageFile(item.file.name) && !item.text;
        const isTarget = item.id === targetMessageId;

        const handleOpenFile = async (url: string, fileName: string) => {
            if (!url) return;
            const fullUrl = getFullUrl(url);

            if (isImageFile(fileName)) {
                setPreviewImage(fullUrl);
            } else {
                try {
                    await Linking.openURL(fullUrl);
                } catch (error) {
                    Alert.alert("Lỗi", "Không thể mở tệp tin này.");
                }
            }
        };

        return (
            <View style={[
                styles.messageWrapper,
                isMe ? styles.messageMeWrapper : styles.messageAdminWrapper,
                isTarget && { backgroundColor: '#FEF08A', padding: 8, borderRadius: 16 }
            ]}>
                {isSticker ? (
                    <Image source={{ uri: stickerUrl }} style={{ width: 100, height: 100 }} contentFit="contain" />
                ) : (
                    <View style={[
                        styles.bubble,
                        isMe ? styles.bubbleMe : styles.bubbleAdmin,
                        isOnlyImage && styles.bubbleImageOnly
                    ]}>
                        {item.file && (
                            <TouchableOpacity
                                onPress={() => handleOpenFile(item.file.url, item.file.name)}
                                style={{ marginBottom: item.text ? 8 : 0 }}
                                disabled={!item.file.url}
                            >
                                {isImageFile(item.file.name) && item.file.url ? (
                                    <Image
                                        source={{ uri: getFullUrl(item.file.url) }}
                                        style={{ width: 200, height: 260, borderRadius: 16 }}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View style={styles.filePreviewInBubble}>
                                        <Paperclip size={16} color={isMe ? '#FFF' : PRIMARY_PURPLE} />
                                        <Text style={[styles.fileNameInBubble, { color: isMe ? '#FFF' : PRIMARY_PURPLE, textDecorationLine: 'underline' }]} numberOfLines={1}>
                                            {item.file.name}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                        {item.text ? <Text style={[styles.messageText, { color: (isMe && !isOnlyImage) ? '#FFF' : '#2A2640' }]}>{item.text}</Text> : null}
                    </View>
                )}
                <Text style={styles.timeText}>{item.time}</Text>
            </View>
        );
    };

    if (loading) return <View style={styles.loadingBox}><ActivityIndicator color={PRIMARY_PURPLE} size="large" /></View>;

    const renderStickerItem = ({ item: stickerUrl }: any) => {
        return (
            <TouchableOpacity style={styles.stickerItem} onPress={() => sendSticker(stickerUrl)}>
                <View style={styles.stickerImageContainer}>
                    <Image source={{ uri: stickerUrl }} style={styles.stickerImage} contentFit="contain" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient colors={['#FFF', '#F4F4FA']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><ChevronLeft size={28} color="#2A2640" /></TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>Hỗ trợ trực tuyến</Text>
                        <View style={styles.onlineStatus}>
                            <View style={styles.dot} /><Text style={styles.headerSub}>Ban quản lý đang sẵn sàng</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.moreBtn}><MoreVertical size={20} color="#8B8B9B" /></TouchableOpacity>
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={reversedMessages}
                    inverted={true}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.chatContainer}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={Platform.OS === 'android'}
                    initialNumToRender={20}
                    maxToRenderPerBatch={20}
                    onScrollToIndexFailed={(info) => {
                        const wait = new Promise(resolve => setTimeout(resolve, 500));
                        wait.then(() => {
                            flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                        });
                    }}
                />

                <View style={styles.inputArea}>
                    {selectedFile && (
                        <View style={styles.filePreviewBar}>
                            <View style={styles.fileInfo}>
                                {selectedFile.mimeType?.startsWith('image/') || isImageFile(selectedFile.name) ? (
                                    <Image source={{ uri: selectedFile.uri }} style={{ width: 45, height: 45, borderRadius: 8, marginRight: 8 }} />
                                ) : (
                                    <Paperclip size={16} color={PRIMARY_PURPLE} />
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                                    <Text style={{ fontSize: 10, color: '#A0A0B5', marginLeft: 8 }}>Sẵn sàng gửi</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedFile(null)} style={{ padding: 5 }}><X size={20} color="#EF4444" /></TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputContainer}>
                        <TouchableOpacity style={styles.attachmentBtn} onPress={pickImage}><ImagePlus size={20} color="#8B8B9B" /></TouchableOpacity>
                        <TouchableOpacity style={styles.attachmentBtn} onPress={pickDocument}><Paperclip size={20} color="#8B8B9B" /></TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập tin nhắn..."
                            placeholderTextColor="#A0A0B5"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            onFocus={() => { setShowStickers(false); setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 10); }}
                        />
                        <TouchableOpacity
                            style={styles.emojiBtn}
                            onPress={() => { Keyboard.dismiss(); setShowStickers(!showStickers); setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 10); }}
                        >
                            <Sticker size={20} color={showStickers ? PRIMARY_PURPLE : "#8B8B9B"} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.sendButton, { opacity: (inputText.trim() || selectedFile) && !isSending ? 1 : 0.6 }]} onPress={handleSend} disabled={(!inputText.trim() && !selectedFile) || isSending}>
                            <LinearGradient colors={['#6345E5', '#3F2B96']} style={styles.sendGradient}>
                                {isSending ? <ActivityIndicator size="small" color="#FFF" /> : <Send size={18} color="#FFF" />}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {showStickers && (
                    <View style={styles.stickerPanel}>
                        <View style={styles.stickerHeader}><Text style={styles.stickerTitle}>Nhãn dán nổi bật</Text></View>
                        <FlatList data={SAMPLE_STICKERS} keyExtractor={(item) => item} numColumns={4} showsVerticalScrollIndicator={false} contentContainerStyle={styles.stickerListContainer} renderItem={renderStickerItem} />
                        <View style={styles.stickerTabs}>
                            <TouchableOpacity style={styles.activeTab}><Sticker size={16} color={PRIMARY_PURPLE} /></TouchableOpacity>
                            <TouchableOpacity style={styles.inactiveTab}><X size={16} color="#8B8B9B" /></TouchableOpacity>
                        </View>
                    </View>
                )}

                <Modal visible={!!previewImage} transparent={true} animationType="fade" onRequestClose={() => setPreviewImage(null)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
                        <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }} onPress={() => setPreviewImage(null)}>
                            <X size={28} color="#FFF" />
                        </TouchableOpacity>
                        {previewImage && <Image source={{ uri: previewImage }} style={{ width: '100%', height: '80%' }} contentFit="contain" />}
                    </View>
                </Modal>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FE' },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F5', backgroundColor: '#FFF', zIndex: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
    headerInfo: { flex: 1, marginLeft: 12 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#2A2640' },
    onlineStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6, borderWidth: 1.5, borderColor: '#FFF' },
    headerSub: { fontSize: 12, color: '#10B981', fontWeight: '800' },
    moreBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    chatContainer: { padding: 20, paddingBottom: 20 },
    messageWrapper: { marginBottom: 16, maxWidth: '82%' },
    messageMeWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    messageAdminWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
    bubbleMe: { backgroundColor: PRIMARY_PURPLE, borderBottomRightRadius: 4 },
    bubbleAdmin: { backgroundColor: '#FFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F0F0F5' },
    bubbleImageOnly: { paddingHorizontal: 0, paddingVertical: 0, backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0, elevation: 0 },
    messageText: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
    timeText: { fontSize: 10, color: '#A0A0B5', marginTop: 6, fontWeight: '700', paddingHorizontal: 4 },
    inputArea: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F0F0F5' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F4FA', borderRadius: 24, paddingHorizontal: 4, paddingVertical: 2 },
    attachmentBtn: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
    emojiBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
    input: { flex: 1, fontSize: 15, fontWeight: '600', color: '#2A2640', paddingHorizontal: 4, paddingTop: Platform.OS === 'ios' ? 10 : 8, paddingBottom: Platform.OS === 'ios' ? 10 : 8, maxHeight: 100 },
    sendButton: { marginLeft: 2 },
    sendGradient: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: PRIMARY_PURPLE, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    filePreviewBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0EDFD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 12 },
    fileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    fileName: { fontSize: 13, color: PRIMARY_PURPLE, fontWeight: '600', marginLeft: 8, maxWidth: '80%' },
    filePreviewInBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    fileNameInBubble: { fontSize: 13, fontWeight: '700', marginLeft: 6, maxWidth: 160 },
    stickerPanel: { backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F5', height: 280 },
    stickerHeader: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
    stickerTitle: { fontSize: 14, fontWeight: '700', color: '#8B8B9B', alignSelf: 'center' },
    stickerListContainer: { padding: 5, justifyContent: 'center' },
    stickerItem: { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', margin: 4, maxWidth: 75 },
    stickerImageContainer: { width: 70, height: 70, backgroundColor: '#F8F9FE', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    stickerImage: { width: 55, height: 55 },
    stickerTabs: { flexDirection: 'row', padding: 8, backgroundColor: '#F4F4FA', borderTopWidth: 1, borderTopColor: '#F0F0F5', justifyContent: 'center' },
    activeTab: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(99, 69, 229, 0.1)', justifyContent: 'center', alignItems: 'center', marginHorizontal: 8 },
    inactiveTab: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginHorizontal: 8 },
});