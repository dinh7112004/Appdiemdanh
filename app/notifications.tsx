import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Stack, useRouter } from 'expo-router';
import {
    Bell,
    BellOff,
    Calendar,
    CheckSquare,
    ChevronLeft,
    Clock,
    MessageSquare
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE } from '../constants/Config';

const PRIMARY_PURPLE = "#6345E5";

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const fetchNotifications = async () => {
        try {
            const userData = await AsyncStorage.getItem('currentUser');
            if (!userData) {
                setLoading(false);
                return;
            }
            const user = JSON.parse(userData);
            const userId = user._id || user.id;

            const res = await axios.get(`${API_BASE}/notifications/user/${userId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });

            if (Array.isArray(res.data)) {
                const sortedData = res.data.sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                setNotifications(sortedData);

                // Mark read
                const unreadItems = sortedData.filter(n => !n.isRead);
                if (unreadItems.length > 0) {
                    await Promise.all(unreadItems.map(item =>
                        axios.patch(`${API_BASE}/notifications/${item._id}/read`, {}, {
                            headers: { 'ngrok-skip-browser-warning': 'true' }
                        }).catch(e => console.log(`Error reading:`, e))
                    ));

                    setTimeout(() => {
                        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    }, 2000);
                }
            }
        } catch (err) {
            console.log("Error fetching notifications:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' +
            date.toLocaleDateString('vi-VN');
    };

    const handlePressNotification = (item: any) => {
        if (!item.type) return;
        switch (item.type) {
            case 'LEAVE':
            case 'LEAVE_STATUS':
                router.navigate('/(tabs)/history');
                break;
            case 'CHAT':
                // 👇 THÊM PARAMS MESSAGE ID Ở ĐÂY
                if (item.messageId) {
                    router.push({
                        pathname: '/chat',
                        params: { messageId: item.messageId } // Truyền ID sang màn chat
                    });
                } else {
                    router.push('/chat');
                }
                break;
            case 'TASK':
                router.navigate('/(tabs)/tasks');
                break;
            case 'ATTENDANCE':
                router.navigate('/(tabs)');
                break;
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'ATTENDANCE': return { icon: Clock, color: '#F59E0B' };
            case 'LEAVE': return { icon: Calendar, color: '#6345E5' };
            case 'TASK': return { icon: CheckSquare, color: '#3B82F6' };
            case 'CHAT': return { icon: MessageSquare, color: '#10B981' };
            default: return { icon: Bell, color: '#64748B' };
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const { icon: Icon, color } = getIcon(item.type);
        return (
            <TouchableOpacity
                style={[styles.card, !item.isRead ? styles.cardUnread : styles.cardRead]}
                onPress={() => handlePressNotification(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconBox, { backgroundColor: `${color}10` }]}>
                    <Icon size={20} color={color} />
                </View>

                <View style={styles.content}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, !item.isRead && styles.titleBold]}>{item.title}</Text>
                        {!item.isRead && <View style={styles.newBadge}><Text style={styles.newText}>MỚI</Text></View>}
                    </View>
                    <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                    <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.screenHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={28} color={PRIMARY_PURPLE} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thông báo</Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY_PURPLE} /></View>
            ) : notifications.length === 0 ? (
                <View style={styles.center}>
                    <BellOff size={48} color="#E2E8F0" />
                    <Text style={styles.emptyTitle}>Không có thông báo</Text>
                    <Text style={styles.emptySub}>Hộp thư của bạn hiện đang trống hàng.</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listPadding}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    screenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    backBtn: { position: 'absolute', left: 16, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
    listPadding: { padding: 16, paddingBottom: 40 },
    card: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10
    },
    cardUnread: { backgroundColor: '#FDFDFF', borderWidth: 1, borderColor: '#EEF2FF' },
    cardRead: { opacity: 0.8 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    content: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    title: { fontSize: 15, color: '#1E293B', fontWeight: '600' },
    titleBold: { fontWeight: '800', color: '#0F172A' },
    newBadge: { backgroundColor: '#6345E5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    newText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
    message: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 8 },
    timeText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#475569', marginTop: 16 },
    emptySub: { fontSize: 14, color: '#94A3B8', marginTop: 6 }
});