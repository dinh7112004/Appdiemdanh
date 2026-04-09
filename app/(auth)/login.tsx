// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';
// import * as Application from 'expo-application';
// import Constants from 'expo-constants'; // Thêm dòng này để check Expo Go
// import * as Device from 'expo-device';
// import { useRouter } from 'expo-router';
// import React, { useState } from 'react';
// import {
//     ActivityIndicator, Alert,
//     Dimensions,
//     KeyboardAvoidingView,
//     Platform,
//     ScrollView,
//     StatusBar,
//     StyleSheet, Text,
//     TextInput, TouchableOpacity, View
// } from 'react-native';
// import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
// import { API_BASE } from '../../constants/Config';

// const { width } = Dimensions.get('window');

// export default function LoginScreen() {
//     const [phone, setPhone] = useState('');
//     const [password, setPassword] = useState('');
//     const [loading, setLoading] = useState(false);
//     const router = useRouter();

//     // --- HÀM LẤY PUSH TOKEN (ĐÃ FIX CRASH CHO ANDROID) ---
//     const getPushToken = async () => {
//         // 1. Kiểm tra máy ảo hoặc Expo Go trên Android
//         const isExpoGo = Constants.appOwnership === 'expo';
//         if (!Device.isDevice || (Platform.OS === 'android' && isExpoGo)) {
//             console.warn("⚠️ Bỏ qua Push Token: Chế độ Expo Go Android hoặc Máy ảo không hỗ trợ.");
//             return null;
//         }

//         try {
//             // 2. Dynamic Require: Chỉ gọi thư viện khi thực sự chạy hàm này
//             const Notifications = require('expo-notifications');

//             // Cấu hình Handler (di chuyển vào đây để tránh quét lỗi sớm)
//             Notifications.setNotificationHandler({
//                 handleNotification: async () => ({
//                     shouldShowAlert: true,
//                     shouldPlaySound: true,
//                     shouldSetBadge: false,
//                 }),
//             });

//             const { status: existingStatus } = await Notifications.getPermissionsAsync();
//             let finalStatus = existingStatus;

//             if (existingStatus !== 'granted') {
//                 const { status } = await Notifications.requestPermissionsAsync();
//                 finalStatus = status;
//             }
//             if (finalStatus !== 'granted') return null;

//             const token = (await Notifications.getExpoPushTokenAsync({
//                 projectId: "6eda67ae-95c9-4dfe-bbf7-309455a32749"
//             })).data;

//             return token;
//         } catch (e) {
//             console.log("Lỗi lấy token:", e);
//             return null;
//         }
//     };

//     const handleLogin = async () => {
//         if (!phone || !password) {
//             return Alert.alert("Thông báo", "Vui lòng nhập đầy đủ SĐT và Mật khẩu");
//         }

//         setLoading(true);
//         try {
//             let deviceId: string | null = '';
//             if (Platform.OS === 'android') {
//                 deviceId = (Application as any).androidId;
//             } else if (Platform.OS === 'ios') {
//                 deviceId = await Application.getIosIdForVendorAsync();
//             } else {
//                 deviceId = "WEB_DEVICE";
//             }

//             // 1. ĐĂNG NHẬP
//             const response = await axios.post(`${API_BASE}/users/login`, {
//                 phone: phone,
//                 password: password,
//                 deviceId: deviceId || "UNKNOWN"
//             }, {
//                 headers: { 'ngrok-skip-browser-warning': 'true' }
//             });

//             const { user } = response.data;

//             // 2. NẠP TOKEN (Cơ chế bọc try-catch cực kỹ)
//             const pushToken = await getPushToken();
//             if (pushToken && user?._id) {
//                 try {
//                     await axios.post(`${API_BASE}/users/${user._id}/push-token`,
//                         { token: pushToken },
//                         {
//                             headers: {
//                                 'ngrok-skip-browser-warning': 'true',
//                                 'Content-Type': 'application/json'
//                             }
//                         }
//                     );
//                     console.log("Nạp Token thành công!");
//                 } catch (err: any) {
//                     console.log(" Lỗi nạp token (Backend/Network):", err.response?.data || err.message);
//                 }
//             }

//             // 3. LƯU VÀ CHUYỂN TRANG
//             const userToSave = {
//                 id: user._id,
//                 _id: user._id,
//                 userId: user.userId,
//                 name: user.name,
//                 position: user.position || "Nhân viên",
//                 dept: user.dept,
//                 deviceId: user.deviceId
//             };

//             await AsyncStorage.setItem('currentUser', JSON.stringify(userToSave));
//             await AsyncStorage.setItem('userId', String(user._id));

//             router.replace('/(tabs)');

//         } catch (error: any) {
//             const message = error.response?.data?.message || "Lỗi kết nối server";
//             Alert.alert("Thất bại", message);
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <KeyboardAvoidingView
//             behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//             style={styles.container}
//         >
//             <StatusBar barStyle="dark-content" />
//             <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

//                 <Animated.View entering={FadeInUp.delay(200).duration(1000)} style={styles.headerSection}>
//                     <View style={styles.iconCircle}>
//                         <Text style={styles.iconText}>✓</Text>
//                     </View>
//                     <Text style={styles.title}>HRM PRO</Text>
//                     <Text style={styles.subtitle}>Hệ thống quản trị nhân sự</Text>
//                 </Animated.View>

//                 <Animated.View entering={FadeInDown.delay(400).duration(1000)} style={styles.formCard}>
//                     <View style={styles.inputGroup}>
//                         <Text style={styles.label}>Số điện thoại</Text>
//                         <TextInput
//                             style={styles.input}
//                             placeholder="Nhập số điện thoại..."
//                             placeholderTextColor="#a0aec0"
//                             value={phone}
//                             onChangeText={setPhone}
//                             keyboardType="phone-pad"
//                             autoCapitalize="none"
//                             editable={!loading}
//                         />
//                     </View>

//                     <View style={styles.inputGroup}>
//                         <Text style={styles.label}>Mật khẩu</Text>
//                         <TextInput
//                             style={styles.input}
//                             placeholder="••••••••"
//                             placeholderTextColor="#a0aec0"
//                             value={password}
//                             onChangeText={setPassword}
//                             secureTextEntry
//                             editable={!loading}
//                         />
//                     </View>

//                     <TouchableOpacity
//                         style={[styles.loginButton, loading && styles.buttonDisabled]}
//                         onPress={handleLogin}
//                         disabled={loading}
//                         activeOpacity={0.8}
//                     >
//                         {loading ? (
//                             <ActivityIndicator color="#fff" />
//                         ) : (
//                             <Text style={styles.buttonText}>ĐĂNG NHẬP NGAY</Text>
//                         )}
//                     </TouchableOpacity>
//                 </Animated.View>

//                 <Animated.Text entering={FadeInDown.delay(600).duration(1000)} style={styles.footerText}>
//                     Phiên bản 1.0.5 • © 2026 HRM PRO System
//                 </Animated.Text>
//             </ScrollView>
//         </KeyboardAvoidingView>
//     );
// }

// const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: '#f8fafc' },
//     scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
//     headerSection: { alignItems: 'center', marginBottom: 40 },
//     iconCircle: {
//         width: 80, height: 80, borderRadius: 40, backgroundColor: '#6345E5',
//         justifyContent: 'center', alignItems: 'center', marginBottom: 20,
//         shadowColor: "#6345E5", shadowOffset: { width: 0, height: 10 },
//         shadowOpacity: 0.3, shadowRadius: 15, elevation: 8,
//     },
//     iconText: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
//     title: { fontSize: 32, fontWeight: '900', color: '#1e293b', letterSpacing: 2 },
//     subtitle: { fontSize: 16, color: '#64748b', marginTop: 4, fontWeight: '500' },
//     formCard: { backgroundColor: '#fff', borderRadius: 30, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4 },
//     inputGroup: { marginBottom: 20 },
//     label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
//     input: { height: 60, backgroundColor: '#f1f5f9', borderRadius: 18, paddingHorizontal: 20, fontSize: 16, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
//     loginButton: { height: 60, backgroundColor: '#6345E5', borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: "#6345E5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
//     buttonDisabled: { backgroundColor: '#94a3b8' },
//     buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
//     footerText: { textAlign: 'center', marginTop: 30, color: '#94a3b8', fontSize: 12, fontWeight: '600' }
// });

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Application from 'expo-application';
import Constants from 'expo-constants'; // Thêm dòng này để check Expo Go
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator, Alert,
    Dimensions,
    Image // 🟢 Đã import Image
    ,

    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet, Text,
    TextInput, TouchableOpacity, View
} from 'react-native';
import { API_BASE } from '../../constants/Config';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // --- HÀM LẤY PUSH TOKEN (ĐÃ FIX CRASH CHO ANDROID) ---
    const getPushToken = async () => {
        // 1. Kiểm tra máy ảo hoặc Expo Go trên Android
        const isExpoGo = Constants.appOwnership === 'expo';
        if (!Device.isDevice || (Platform.OS === 'android' && isExpoGo)) {
            console.warn("⚠️ Bỏ qua Push Token: Chế độ Expo Go Android hoặc Máy ảo không hỗ trợ.");
            return null;
        }

        try {
            // 2. Dynamic Require: Chỉ gọi thư viện khi thực sự chạy hàm này
            const Notifications = require('expo-notifications');

            // Cấu hình Handler (di chuyển vào đây để tránh quét lỗi sớm)
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                }),
            });

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') return null;

            const token = (await Notifications.getExpoPushTokenAsync({
                projectId: "6eda67ae-95c9-4dfe-bbf7-309455a32749"
            })).data;

            return token;
        } catch (e) {
            console.log("Lỗi lấy token:", e);
            return null;
        }
    };

    const handleLogin = async () => {
        if (!phone || !password) {
            return Alert.alert("Thông báo", "Vui lòng nhập đầy đủ SĐT và Mật khẩu");
        }

        setLoading(true);
        try {
            let deviceId: string | null = '';
            if (Platform.OS === 'android') {
                deviceId = (Application as any).androidId;
            } else if (Platform.OS === 'ios') {
                deviceId = await Application.getIosIdForVendorAsync();
            } else {
                deviceId = "WEB_DEVICE";
            }

            // 1. ĐĂNG NHẬP
            const response = await axios.post(`${API_BASE}/users/login`, {
                phone: phone,
                password: password,
                deviceId: deviceId || "UNKNOWN"
            }, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });

            const { user } = response.data;

            // 2. NẠP TOKEN (Cơ chế bọc try-catch cực kỹ)
            const pushToken = await getPushToken();
            if (pushToken && user?._id) {
                try {
                    await axios.post(`${API_BASE}/users/${user._id}/push-token`,
                        { token: pushToken },
                        {
                            headers: {
                                'ngrok-skip-browser-warning': 'true',
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    console.log("Nạp Token thành công!");
                } catch (err: any) {
                    console.log(" Lỗi nạp token (Backend/Network):", err.response?.data || err.message);
                }
            }

            // 3. LƯU VÀ CHUYỂN TRANG
            const userToSave = {
                id: user._id,
                _id: user._id,
                userId: user.userId,
                name: user.name,
                position: user.position || "Nhân viên",
                dept: user.dept,
                deviceId: user.deviceId
            };

            await AsyncStorage.setItem('currentUser', JSON.stringify(userToSave));
            await AsyncStorage.setItem('userId', String(user._id));

            router.replace('/(tabs)');

        } catch (error: any) {
            const message = error.response?.data?.message || "Lỗi kết nối server";
            Alert.alert("Thất bại", message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar barStyle="dark-content" />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* 🟢 ĐÃ GỠ ANIMATION VÀ THAY ICON APP */}
                <View style={styles.headerSection}>
                    <Image
                        source={require('../../assets/images/icon.png')} // Sửa lại đường dẫn này nếu file logo của ông tên khác hoặc ở chỗ khác
                        style={styles.appIcon}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>HRM PRO</Text>
                    <Text style={styles.subtitle}>Hệ thống quản trị nhân sự</Text>
                </View>

                {/* 🟢 ĐÃ GỠ ANIMATION */}
                <View style={styles.formCard}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Số điện thoại</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập số điện thoại..."
                            placeholderTextColor="#a0aec0"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mật khẩu</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#a0aec0"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            editable={!loading}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>ĐĂNG NHẬP NGAY</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* 🟢 ĐÃ GỠ ANIMATION */}
                <Text style={styles.footerText}>
                    Phiên bản 1.0.5 • © 2026 HRM PRO System
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    headerSection: { alignItems: 'center', marginBottom: 40 },
    // 🟢 STYLE MỚI CHO LOGO APP
    appIcon: {
        width: 100,
        height: 100,
        borderRadius: 20,
        marginBottom: 16
    },
    title: { fontSize: 32, fontWeight: '900', color: '#1e293b', letterSpacing: 2 },
    subtitle: { fontSize: 16, color: '#64748b', marginTop: 4, fontWeight: '500' },
    formCard: { backgroundColor: '#fff', borderRadius: 30, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
    input: { height: 60, backgroundColor: '#f1f5f9', borderRadius: 18, paddingHorizontal: 20, fontSize: 16, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
    loginButton: { height: 60, backgroundColor: '#6345E5', borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: "#6345E5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    buttonDisabled: { backgroundColor: '#94a3b8' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
    footerText: { textAlign: 'center', marginTop: 30, color: '#94a3b8', fontSize: 12, fontWeight: '600' }
});