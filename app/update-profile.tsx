import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { Briefcase, ChevronLeft, CircleDollarSign, Lock, Phone, ShieldAlert, User as UserIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_BASE } from '../constants/Config';
const PRIMARY_PURPLE = "#6345E5";

export default function UpdateProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Form state 
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        const loadUser = async () => {
            // 1. Lấy thông tin cũ từ bộ nhớ tạm để hiển thị nhanh giao diện
            const data = await AsyncStorage.getItem('currentUser');
            if (data) {
                const parsedUser = JSON.parse(data);
                setUser(parsedUser);
                setName(parsedUser.name || '');
                setPhone(parsedUser.phone || '');

                // 2. Gọi API lấy data mới nhất từ server (để kéo cái baseSalary về)
                try {
                    const response = await axios.get(`${API_BASE}/users/${parsedUser._id || parsedUser.id}`);
                    if (response.data) {
                        setUser(response.data); // Cập nhật lại UI với data mới có lương
                        setName(response.data.name || '');
                        setPhone(response.data.phone || '');

                        // Lưu đè lại vào bộ nhớ máy để các trang khác cùng được cập nhật
                        await AsyncStorage.setItem('currentUser', JSON.stringify(response.data));
                    }
                } catch (error) {
                    // console.log("Lỗi đồng bộ dữ liệu mới:", error);
                }
            }
        };
        loadUser();
    }, []);

    const handleUpdate = async () => {
        if (!name.trim() || !phone.trim()) {
            Alert.alert("Lỗi", "Tên và số điện thoại không được để trống!");
            return;
        }

        setLoading(true);
        try {
            const updateData: any = { name, phone };
            if (password.trim().length > 0) {
                updateData.password = password; // Chỉ gửi pass nếu có nhập mới
            }

            // Gọi API bằng ID user hiện tại
            await axios.put(`${API_BASE}/users/${user._id || user.id}`, updateData);

            // Cập nhật lại AsyncStorage để App nhận diện ngay
            const updatedUser = { ...user, name, phone };
            await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));

            Alert.alert("Thành công", "Cập nhật thông tin thành công!", [
                { text: "OK", onPress: () => router.back() } // Cập nhật xong thì quay về
            ]);
        } catch (error: any) {
            // Đã ẩn console.error để Terminal Expo không bị báo lỗi đỏ lòm nữa sếp nhé!
            // Lấy trực tiếp thông báo lỗi từ server NestJS trả về
            const errorMsg = error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại sau.";
            Alert.alert("Cập nhật thất bại", errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY_PURPLE} /></View>;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={28} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cập nhật thông tin</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                <View style={styles.warningBox}>
                    <ShieldAlert size={20} color="#D97706" />
                    <Text style={styles.warningText}>Mã nhân viên, Chức vụ, Phòng ban và Lương chỉ có Admin mới được phép thay đổi.</Text>
                </View>

                <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
                <View style={styles.inputGroup}>
                    <View style={styles.inputWrapper}>
                        <UserIcon size={20} color="#64748B" style={styles.icon} />
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Họ và tên" placeholderTextColor="#94A3B8" />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Phone size={20} color="#64748B" style={styles.icon} />
                        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Số điện thoại" keyboardType="phone-pad" placeholderTextColor="#94A3B8" />
                    </View>

                    <View style={[styles.inputWrapper, { borderBottomWidth: 0 }]}>
                        <Lock size={20} color="#64748B" style={styles.icon} />
                        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Mật khẩu mới (Bỏ trống nếu giữ nguyên)" secureTextEntry placeholderTextColor="#94A3B8" />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Thông tin công việc (Chỉ xem)</Text>
                <View style={styles.inputGroup}>
                    <View style={[styles.inputWrapper, styles.disabledInput]}>
                        <Briefcase size={20} color="#A0A0B5" style={styles.icon} />
                        <Text style={styles.disabledText}>Mã NV: {user.userId}</Text>
                        <Lock size={16} color="#CBD5E1" />
                    </View>
                    <View style={[styles.inputWrapper, styles.disabledInput]}>
                        <Briefcase size={20} color="#A0A0B5" style={styles.icon} />
                        <Text style={styles.disabledText}>Phòng ban: {user.dept || 'Chưa có'}</Text>
                        <Lock size={16} color="#CBD5E1" />
                    </View>
                    <View style={[styles.inputWrapper, styles.disabledInput]}>
                        <Briefcase size={20} color="#A0A0B5" style={styles.icon} />
                        <Text style={styles.disabledText}>Chức vụ: {user.position || 'Nhân viên'}</Text>
                        <Lock size={16} color="#CBD5E1" />
                    </View>

                    {/* LƯƠNG CƠ BẢN */}
                    <View style={[styles.inputWrapper, styles.disabledInput, { borderBottomWidth: 0 }]}>
                        <CircleDollarSign size={20} color="#A0A0B5" style={styles.icon} />
                        <Text style={styles.disabledText}>
                            Lương CB: {(user.baseSalary || user.salary)
                                ? Number(user.baseSalary || user.salary).toLocaleString('vi-VN') + ' đ'
                                : 'Chưa cập nhật'}
                        </Text>
                        <Lock size={16} color="#CBD5E1" />
                    </View>
                </View>

                <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleUpdate} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Lưu thay đổi</Text>}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    content: { padding: 20 },
    warningBox: { flexDirection: 'row', backgroundColor: '#FEF3C7', padding: 15, borderRadius: 12, marginBottom: 25, alignItems: 'center', gap: 10 },
    warningText: { flex: 1, color: '#92400E', fontSize: 13, fontWeight: '500', lineHeight: 20 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 12, marginLeft: 5, textTransform: 'uppercase' },
    inputGroup: { backgroundColor: '#FFF', borderRadius: 20, paddingVertical: 5, marginBottom: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 55, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    icon: { marginRight: 15 },
    input: { flex: 1, fontSize: 16, color: '#1E293B', fontWeight: '500' },
    disabledInput: { backgroundColor: '#F8FAFC' },
    disabledText: { flex: 1, fontSize: 15, color: '#94A3B8', fontWeight: '500' },
    submitBtn: { backgroundColor: PRIMARY_PURPLE, height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: PRIMARY_PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});