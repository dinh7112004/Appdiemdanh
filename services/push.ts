import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_BASE } from '../constants/Config';

// Cấu hình hiển thị thông báo mới (Sửa lỗi deprecated shouldShowAlert)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        // Chuẩn mới cho SDK 53+
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    // 1. Kiểm tra nếu là Android và đang chạy trên Expo Go (Tránh crash trên SDK 53)
    // Nếu chạy trên Expo Go Android, chúng ta nên bỏ qua bước lấy Push Token
    const isExpoGo = Constants.appOwnership === 'expo';
    if (Platform.OS === 'android' && isExpoGo) {
        console.warn("⚠️ Chú ý: Android trên Expo Go không hỗ trợ Push Notifications. Hãy dùng Development Build.");
        return null;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('User không cấp quyền thông báo!');
            return;
        }

        try {
            // Lấy Project ID tự động từ config hoặc dùng ID sếp đã dán
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId || "6eda67ae-95c9-4dfe-bbf7-309455a32749";

            token = (await Notifications.getExpoPushTokenAsync({
                projectId: projectId
            })).data;
            console.log("🔥 Mã thiết bị (Push Token):", token);
        } catch (error) {
            console.log("Lỗi khi lấy Push Token từ Expo:", error);
            return null;
        }

        // Bắn token lên Backend
        try {
            const userData = await AsyncStorage.getItem('currentUser');
            if (userData && token) {
                const user = JSON.parse(userData);
                const userId = user._id || user.id;

                await axios.post(`${API_BASE}/users/${userId}/push-token`, {
                    token: token
                }, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                console.log("✅ Đã gửi token lên Backend thành công");
            }
        } catch (error) {
            console.log("❌ Lỗi gửi token lên server:", error);
        }

    } else {
        console.log('Phải chạy trên máy thật mới ra mã Push Token nhé sếp');
    }

    return token;
}