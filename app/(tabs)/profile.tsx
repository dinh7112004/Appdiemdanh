import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    ChevronRight,
    CircleDollarSign,
    ClipboardList,
    FileText,
    LogOut,
    MessageCircle,
    Settings,
    ShieldCheck,
    UserCircle
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE } from '../../constants/Config';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

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

    const MenuItem = ({ icon: Icon, title, subTitle, onPress, color, bgColor, delay }: any) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: bgColor || '#F4F4FA' }]}>
                <Icon size={20} color={color || '#6345E5'} />
            </View>
            <View style={styles.textWrap}>
                <Text style={styles.menuText}>{title}</Text>
                {subTitle && <Text style={styles.menuSubText}>{subTitle}</Text>}
            </View>
            <ChevronRight size={18} color="#C1C1D6" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#6345E5', '#3F2B96']} style={styles.headerBackground}>
                <View style={styles.headerNav}>
                    <Text style={styles.headerTitle}>Cá nhân</Text>
                    <TouchableOpacity style={styles.settingsBtn}>
                        <Settings size={22} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.profileCard}>
                    <View style={styles.profileInfoCenter}>
                        <View style={styles.avatarWrapper}>
                            <Image
                                source={{ uri: `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=F4F4FA&color=6345E5&size=200` }}
                                style={styles.avatar}
                            />
                            <View style={styles.onlineBadge} />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user?.name || 'Đang tải...'}</Text>
                            <View style={styles.roleBadge}>
                                <ShieldCheck size={12} color="#6345E5" />
                                <Text style={styles.userRole}>{user?.position || 'Nhân viên'}</Text>
                            </View>
                            <Text style={styles.userDept}>{user?.dept || 'Phòng ban'}</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Công việc & Nhân sự</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon={ClipboardList}
                        title="Nhiệm vụ của tôi"
                        subTitle="Theo dõi tiến độ công việc"
                        onPress={() => router.push('/tasks' as any)}
                        color="#6345E5"
                        bgColor="#F0EDFD"
                        delay={100}
                    />
                    <View style={styles.divider} />
                    <MenuItem
                        icon={FileText}
                        title="Xin nghỉ phép"
                        subTitle="Đăng ký và xem lịch nghỉ"
                        onPress={() => router.navigate('/leave-request')}
                        color="#059669"
                        bgColor="#ECFDF5"
                        delay={200}
                    />
                    <View style={styles.divider} />
                    <MenuItem
                        icon={CircleDollarSign}
                        title="Bảng lương"
                        subTitle="Chi tiết thu nhập hàng tháng"
                        onPress={() => router.push('/payroll' as any)}
                        color="#D97706"
                        bgColor="#FEF3C7"
                        delay={300}
                    />
                </View>

                <Text style={styles.sectionTitle}>Hệ thống & Liên hệ</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon={UserCircle}
                        title="Cập nhật thông tin"
                        onPress={() => router.push('/update-profile' as any)}
                        color="#64748B"
                        bgColor="#F4F4FA"
                        delay={400}
                    />
                    <View style={styles.divider} />
                    <MenuItem
                        icon={MessageCircle}
                        title="Hỗ trợ trực tuyến"
                        subTitle="Chat với bộ phận nhân sự"
                        onPress={() => router.push('/chat' as any)}
                        color="#4338CA"
                        bgColor="#E0E7FF"
                        delay={500}
                    />
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
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F4FA' },
    headerBackground: { height: 200, paddingTop: 60, paddingHorizontal: 24, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    headerNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#000000ff' },
    settingsBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, paddingHorizontal: 24, marginTop: -70 },
    profileCard: { backgroundColor: '#FFF', borderRadius: 32, padding: 24, marginBottom: 24, shadowColor: '#6345E5', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    profileInfoCenter: { alignItems: 'center' },
    avatarWrapper: { position: 'relative', marginBottom: 16 },
    avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: '#FFF' },
    onlineBadge: { position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#FFF' },
    userInfo: { alignItems: 'center' },
    userName: { fontSize: 24, fontWeight: '900', color: '#2A2640', marginBottom: 6 },
    roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0EDFD', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 4 },
    userRole: { fontSize: 13, color: '#6345E5', fontWeight: '800', marginLeft: 6 },
    userDept: { fontSize: 13, color: '#8B8B9B', fontWeight: '600' },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#A0A0B5', textTransform: 'uppercase', marginBottom: 12, marginLeft: 8, letterSpacing: 1 },
    menuGroup: { backgroundColor: '#FFF', borderRadius: 28, marginBottom: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20 },
    iconBox: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    textWrap: { flex: 1 },
    menuText: { fontSize: 16, fontWeight: '700', color: '#2A2640' },
    menuSubText: { fontSize: 12, color: '#8B8B9B', marginTop: 2, fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#F4F4FA', marginLeft: 82 },
});