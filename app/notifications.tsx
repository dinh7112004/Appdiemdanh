import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

                // TỰ ĐỘNG ĐÁNH DẤU ĐÃ ĐỌC
                const unreadItems = sortedData.filter(n => !n.isRead);
                if (unreadItems.length > 0) {
                    await Promise.all(unreadItems.map(item =>
                        axios.patch(`${API_BASE}/notifications/${item._id}/read`, {}, {
                            headers: { 'ngrok-skip-browser-warning': 'true' }
                        }).catch(e => console.log(`Lỗi đọc:`, e))
                    ));

                    setTimeout(() => {
                        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    }, 2000);
                }
            }
        } catch (err) {
            console.log("Lỗi lấy thông báo:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    // Hàm format thời gian nhìn cho nó "Pro"
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' +
            date.toLocaleDateString('vi-VN');
    };

    const handlePressNotification = (item: any) => {
        if (!item.type) return;
        switch (item.type) {
            case 'LEAVE': case 'LEAVE_STATUS': router.navigate('/(tabs)/history'); break;
            case 'CHAT': router.push('/chat'); break;
            case 'TASK': router.navigate('/(tabs)/tasks'); break;
            case 'ATTENDANCE': router.navigate('/(tabs)'); break;
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'ATTENDANCE': return { name: 'time', color: '#F59E0B', bg: '#FFF7ED' };
            case 'LEAVE': return { name: 'calendar', color: '#6345E5', bg: '#F5F3FF' };
            case 'TASK': return { name: 'checkbox', color: '#3B82F6', bg: '#EFF6FF' };
            case 'CHAT': return { name: 'chatbubble-ellipses', color: '#10B981', bg: '#ECFDF5' };
            default: return { name: 'notifications', color: '#64748B', bg: '#F1F5F9' };
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const iconStyle = getIcon(item.type);
        return (
            <TouchableOpacity
                style={[styles.card, !item.isRead ? styles.cardUnread : styles.cardRead]}
                onPress={() => handlePressNotification(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconWrapper, { backgroundColor: iconStyle.bg }]}>
                    <Ionicons name={iconStyle.name as any} size={22} color={iconStyle.color} />
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

            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: '#F8FAFC',
            }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ position: 'absolute', left: 16, zIndex: 10, padding: 4 }}
                >
                    <Ionicons name="chevron-back" size={28} color={PRIMARY_PURPLE} />
                </TouchableOpacity>

                <Text style={{ fontSize: 18, fontWeight: '600', color: '#1E293B' }}>
                    Thông báo
                </Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={PRIMARY_PURPLE} style={{ marginTop: 50 }} />
            ) : notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                        <Ionicons name="notifications-off" size={40} color="#CBD5E1" />
                    </View>
                    <Text style={styles.emptyTitle}>Sạch sành sanh!</Text>
                    <Text style={styles.emptySub}>Bạn không có thông báo nào mới cả.</Text>
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
    listPadding: { padding: 16, paddingBottom: 40 },
    card: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
            android: { elevation: 2 }
        })
    },
    cardUnread: { borderLeftWidth: 4, borderLeftColor: PRIMARY_PURPLE },
    cardRead: { backgroundColor: '#FFFFFF', borderLeftWidth: 4, borderLeftColor: '#E2E8F0' },
    iconWrapper: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    content: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    title: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
    titleBold: { fontWeight: '700', color: '#0F172A' },
    newBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    newText: { fontSize: 10, fontWeight: '800', color: PRIMARY_PURPLE },
    message: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 8 },
    timeText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#475569' },
    emptySub: { fontSize: 14, color: '#94A3B8', marginTop: 4 }
});