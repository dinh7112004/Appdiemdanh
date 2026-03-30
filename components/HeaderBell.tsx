import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { API_BASE } from '../constants/Config';
const CURRENT_USER_ID = "ADMIN_ID"; // Tạm thời dùng ID này giống Web

export default function HeaderBell() {
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async () => {
        try {
            const res = await axios.get(`${API_BASE}/notifications/user/${CURRENT_USER_ID}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (Array.isArray(res.data)) {
                const count = res.data.filter(n => !n.isRead).length;
                setUnreadCount(count);
            }
        } catch (err) {
            console.log("Lỗi đếm thông báo:", err);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 10000); // Cập nhật mỗi 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={styles.container}
        >
            <Ionicons name="notifications-outline" size={24} color="#334155" />
            {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        marginRight: 15,
        position: 'relative',
        padding: 5,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#EF4444', // Đỏ rose-500
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    }
});