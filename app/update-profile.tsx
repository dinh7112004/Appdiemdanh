import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
    Briefcase, 
    ChevronLeft, 
    CircleDollarSign, 
    Lock, 
    Phone, 
    ShieldAlert, 
    User as UserIcon,
    Camera,
    CheckCircle2
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { 
    ActivityIndicator, 
    Alert, 
    KeyboardAvoidingView, 
    Platform, 
    ScrollView, 
    StyleSheet, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    View,
    Image 
} from 'react-native';
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
            const data = await AsyncStorage.getItem('currentUser');
            if (data) {
                const parsedUser = JSON.parse(data);
                setUser(parsedUser);
                setName(parsedUser.name || '');
                setPhone(parsedUser.phone || '');

                try {
                    const response = await axios.get(`${API_BASE}/users/${parsedUser._id || parsedUser.id}`);
                    if (response.data) {
                        setUser(response.data);
                        setName(response.data.name || '');
                        setPhone(response.data.phone || '');
                        await AsyncStorage.setItem('currentUser', JSON.stringify(response.data));
                    }
                } catch (error) {
                    // Fail silently
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
                updateData.password = password;
            }

            await axios.put(`${API_BASE}/users/${user._id || user.id}`, updateData);

            const updatedUser = { ...user, name, phone };
            await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));

            Alert.alert("Thành công ✨", "Thông tin đã được cập nhật!", [
                { text: "Tuyệt vời", onPress: () => router.back() }
            ]);
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại sau.";
            Alert.alert("Cập nhật thất bại", errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY_PURPLE} /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={28} color="#2A2640" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarWrapper}>
                            <Image
                                source={{ uri: `https://ui-avatars.com/api/?name=${name || 'User'}&background=F4F4FA&color=6345E5&size=200` }}
                                style={styles.avatar}
                            />
                            <TouchableOpacity style={styles.editAvatarBtn}>
                                <Camera size={16} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.avatarName}>{name}</Text>
                        <Text style={styles.avatarId}>ID: {user.userId}</Text>
                    </View>

                    <View>
                        <View style={styles.infoAlert}>
                            <ShieldAlert size={18} color="#F59E0B" />
                            <Text style={styles.infoText}>Thông tin công việc và lương chỉ Admin mới có quyền điều chỉnh.</Text>
                        </View>

                        <Text style={styles.sectionLabel}>Thông tin liên hệ</Text>
                        <View style={styles.inputGroup}>
                            <View style={styles.inputWrapper}>
                                <View style={styles.iconBox}>
                                    <UserIcon size={20} color={PRIMARY_PURPLE} />
                                </View>
                                <TextInput 
                                    style={styles.input} 
                                    value={name} 
                                    onChangeText={setName} 
                                    placeholder="Họ và tên" 
                                    placeholderTextColor="#A0A0B5" 
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <View style={styles.iconBox}>
                                    <Phone size={20} color={PRIMARY_PURPLE} />
                                </View>
                                <TextInput 
                                    style={styles.input} 
                                    value={phone} 
                                    onChangeText={setPhone} 
                                    placeholder="Số điện thoại" 
                                    keyboardType="phone-pad" 
                                    placeholderTextColor="#A0A0B5" 
                                />
                            </View>

                            <View style={[styles.inputWrapper, { borderBottomWidth: 0 }]}>
                                <View style={styles.iconBox}>
                                    <Lock size={20} color={PRIMARY_PURPLE} />
                                </View>
                                <TextInput 
                                    style={styles.input} 
                                    value={password} 
                                    onChangeText={setPassword} 
                                    placeholder="Mật khẩu mới (Để trống nếu không đổi)" 
                                    secureTextEntry 
                                    placeholderTextColor="#A0A0B5" 
                                />
                            </View>
                        </View>

                        <Text style={styles.sectionLabel}>Thông tin công việc</Text>
                        <View style={styles.inputGroup}>
                            <View style={[styles.inputWrapper, styles.disabledWrapper]}>
                                <View style={styles.iconBox}>
                                    <Briefcase size={20} color="#8B8B9B" />
                                </View>
                                <Text style={styles.disabledText}>Phòng ban: {user.dept || 'Chưa có'}</Text>
                                <Lock size={14} color="#C1C1D6" />
                            </View>
                            
                            <View style={[styles.inputWrapper, styles.disabledWrapper]}>
                                <View style={styles.iconBox}>
                                    <Briefcase size={20} color="#8B8B9B" />
                                </View>
                                <Text style={styles.disabledText}>Chức vụ: {user.position || 'Nhân viên'}</Text>
                                <Lock size={14} color="#C1C1D6" />
                            </View>

                            <View style={[styles.inputWrapper, styles.disabledWrapper, { borderBottomWidth: 0 }]}>
                                <View style={styles.iconBox}>
                                    <CircleDollarSign size={20} color="#8B8B9B" />
                                </View>
                                <Text style={styles.disabledText}>
                                    Lương cơ bản: {(user.baseSalary || user.salary)
                                        ? Number(user.baseSalary || user.salary).toLocaleString('vi-VN') + ' đ'
                                        : 'Chưa cập nhật'}
                                </Text>
                                <Lock size={14} color="#C1C1D6" />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={loading}>
                            <LinearGradient colors={['#6345E5', '#3F2B96']} style={styles.gradientBtn}>
                                {loading ? <ActivityIndicator color="#FFF" /> : (
                                    <>
                                        <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                                        <CheckCircle2 size={20} color="#FFF" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F4FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 24, backgroundColor: '#FFF', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    backBtn: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#F4F4FA', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#2A2640' },
    content: { padding: 24 },
    avatarSection: { alignItems: 'center', marginBottom: 32 },
    avatarWrapper: { position: 'relative', marginBottom: 16 },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFF' },
    editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY_PURPLE, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
    avatarName: { fontSize: 22, fontWeight: '900', color: '#2A2640', marginBottom: 4 },
    avatarId: { fontSize: 13, color: '#8B8B9B', fontWeight: '700' },
    infoAlert: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFBEB', padding: 16, borderRadius: 16, marginBottom: 32, borderWidth: 1, borderColor: '#FEF3C7' },
    infoText: { flex: 1, fontSize: 13, color: '#D97706', fontWeight: '600', lineHeight: 18 },
    sectionLabel: { fontSize: 13, fontWeight: '800', color: '#A0A0B5', marginBottom: 12, marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1 },
    inputGroup: { backgroundColor: '#FFF', borderRadius: 28, paddingVertical: 8, marginBottom: 32, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 64, borderBottomWidth: 1, borderBottomColor: '#F4F4FA' },
    iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F4F4FA', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    input: { flex: 1, fontSize: 16, color: '#2A2640', fontWeight: '700' },
    disabledWrapper: { backgroundColor: '#F9F9FC' },
    disabledText: { flex: 1, fontSize: 15, color: '#8B8B9B', fontWeight: '600' },
    saveBtn: { height: 60, borderRadius: 20, overflow: 'hidden', marginTop: 10, shadowColor: PRIMARY_PURPLE, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
    gradientBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900' }
});