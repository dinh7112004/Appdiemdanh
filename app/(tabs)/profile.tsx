import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    ChevronRight,
    CircleDollarSign,
    ClipboardList,
    FileText,
    LogOut,
    MessageCircle,
    UserCircle
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE } from '../../constants/Config';
export default function ProfileScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    // Đổi useEffect thành useFocusEffect để tự động làm mới data khi quay lại màn hình này
    useFocusEffect(
        useCallback(() => {
            const getUser = async () => {
                const data = await AsyncStorage.getItem('currentUser');
                if (data) setUser(JSON.parse(data));
            };
            getUser();
        }, [])
    );



    const handleLogout = () => {
        Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn thoát ứng dụng?", [
            { text: "Hủy", style: "cancel" },
            {
                text: "Đăng xuất",
                style: "destructive",
                onPress: async () => {
                    try {
                        const userId = user?._id || user?.id;
                        if (userId) {
                            await fetch(`${API_BASE}/users/${userId}/push-token`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ pushToken: null })
                            });
                            console.log("Đã xóa Push Token trên server!");
                        }
                    } catch (error) {
                        console.log("Lỗi khi xóa token trên server:", error);
                    } finally {
                        await AsyncStorage.removeItem('currentUser');
                        router.replace('/login');
                    }
                }
            }
        ]);
    };

    const handleChatWithBoss = () => {
        router.push('/chat' as any);
    };

    return (
        <View style={styles.container}>
            {/* Header nền tím xanh */}
            <View style={styles.headerBackground}>
                <Text style={styles.headerTitle}>Cá nhân</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                {/* Thẻ Thông tin CĂN GIỮA */}
                <View style={styles.profileCard}>
                    <View style={styles.profileInfoCenter}>
                        <Image
                            source={{ uri: `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=F4F4FA&color=6345E5&size=200` }}
                            style={styles.avatar}
                        />
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user?.name || 'Đang tải...'}</Text>
                            <Text style={styles.userRole}>{user?.position || 'Nhân viên'} - {user?.dept || ''}</Text>
                        </View>
                    </View>
                </View>

                {/* Khối Menu Chức năng */}
                <Text style={styles.sectionTitle}>Công việc & Nhân sự</Text>
                <View style={styles.menuGroup}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/tasks' as any)} activeOpacity={0.7}>
                        <View style={[styles.iconBox, { backgroundColor: '#F0EDFD' }]}>
                            <ClipboardList size={20} color="#6345E5" />
                        </View>
                        <View style={styles.textWrap}>
                            <Text style={styles.menuText}>Nhiệm vụ của tôi</Text>
                        </View>
                        <ChevronRight size={18} color="#C1C1D6" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.navigate('/leave-request')} activeOpacity={0.7}>
                        <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                            <FileText size={20} color="#059669" />
                        </View>
                        <View style={styles.textWrap}>
                            <Text style={styles.menuText}>Xin nghỉ phép</Text>
                        </View>
                        <ChevronRight size={18} color="#C1C1D6" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/payroll' as any)} activeOpacity={0.7}>
                        <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                            <CircleDollarSign size={20} color="#D97706" />
                        </View>
                        <View style={styles.textWrap}>
                            <Text style={styles.menuText}>Bảng lương</Text>
                        </View>
                        <ChevronRight size={18} color="#C1C1D6" />
                    </TouchableOpacity>
                </View>

                {/* Khối Cài đặt & Hệ thống */}
                <Text style={styles.sectionTitle}>Hệ thống & Liên hệ</Text>
                <View style={styles.menuGroup}>

                    {/* ĐÃ GẮN LINK CHUYỂN TRANG UPDATE PROFILE Ở ĐÂY */}
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/update-profile' as any)} activeOpacity={0.7}>
                        <View style={[styles.iconBox, { backgroundColor: '#F4F4FA' }]}>
                            <UserCircle size={20} color="#64748B" />
                        </View>
                        <View style={styles.textWrap}>
                            <Text style={styles.menuText}>Cập nhật thông tin</Text>
                        </View>
                        <ChevronRight size={18} color="#C1C1D6" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    {/* CHAT BOX */}
                    <TouchableOpacity style={styles.menuItem} onPress={handleChatWithBoss} activeOpacity={0.7}>
                        <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}>
                            <MessageCircle size={20} color="#4338CA" />
                        </View>
                        <View style={styles.textWrap}>
                            <Text style={[styles.menuText, { color: '#4338CA', fontWeight: '800' }]}>Chat box</Text>
                        </View>
                        <ChevronRight size={18} color="#C1C1D6" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.7}>
                        <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                            <LogOut size={20} color="#EF4444" />
                        </View>
                        <View style={styles.textWrap}>
                            <Text style={[styles.menuText, { color: '#EF4444' }]}>Đăng xuất</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F4FA'
    },
    headerBackground: {
        backgroundColor: '#6345E5',
        height: 180,
        paddingTop: 60,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        marginTop: -60,
    },
    profileCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 30,
        marginBottom: 24,
        shadowColor: '#6345E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
    },
    profileInfoCenter: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 86,
        height: 86,
        borderRadius: 43,
        backgroundColor: '#F0EDFD',
        marginBottom: 16,
        borderWidth: 3,
        borderColor: '#FFF',
    },
    userInfo: {
        alignItems: 'center',
    },
    userName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#2A2640',
        marginBottom: 4,
        textAlign: 'center',
    },
    userRole: {
        fontSize: 14,
        color: '#8B8B9B',
        fontWeight: '500',
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#A0A0B5',
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 10,
        letterSpacing: 0.5,
    },
    menuGroup: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        marginBottom: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFF',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textWrap: {
        flex: 1,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2A2640',
    },
    divider: {
        height: 1,
        backgroundColor: '#F4F4FA',
        marginLeft: 76,
    },
});