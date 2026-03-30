import AsyncStorage from '@react-native-async-storage/async-storage'; // 🟢 Import thêm AsyncStorage
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants'; // Thêm dòng này để né lỗi Android
import { Stack, useRouter, useSegments } from 'expo-router'; // 🟢 Sếp nhớ thêm useSegments ở đây
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import SocketProvider from '../context/SocketContext';

const PRIMARY_PURPLE = "#6345E5";

const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: PRIMARY_PURPLE },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: PRIMARY_PURPLE },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments(); // 🟢 Lấy đường dẫn hiện tại để biết user đang đứng ở đâu

  // =========================================================================
  // 1. CHỨC NĂNG BẢO VỆ CỔNG (AUTH GUARD)
  // =========================================================================
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userData = await AsyncStorage.getItem('currentUser');
        const inAuthGroup = segments[0] === '(auth)';

        if (!userData && !inAuthGroup) {
          // Chưa đăng nhập mà dám đi lung tung -> Đá về trang Login
          router.replace('/(auth)/login');
        } else if (userData && inAuthGroup) {
          // Đã đăng nhập rồi mà lảng vảng ở Login -> Bê thẳng vào Trang chủ
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.log("Lỗi kiểm tra đăng nhập:", error);
      }
    };

    // Chỉ chạy check khi UI đã render xong các segments
    if (segments.length > 0) {
      checkLoginStatus();
    }
  }, [segments]);


  // =========================================================================
  // 2. CHỨC NĂNG THÔNG BÁO (SẾP GIỮ NGUYÊN)
  // =========================================================================
  useEffect(() => {
    const isExpoGo = Constants.appOwnership === 'expo';
    const isAndroid = Platform.OS === 'android';

    if (isAndroid && isExpoGo) {
      console.warn("⚠️ Đang chạy Expo Go Android: Đã né khởi tạo Notifications để không Crash.");
      return;
    }

    const Notifications = require('expo-notifications');
    const { registerForPushNotificationsAsync } = require('../services/push');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    registerForPushNotificationsAsync().then((token: any) => {
      console.log("🚀 Push Token hệ thống:", token);
    });

    // 🟢 THÊM ĐOẠN NÀY ĐỂ XỬ LÝ KHI APP BỊ TẮT HẲN (KILLED STATE)
    Notifications.getLastNotificationResponseAsync().then((response: any) => {
      if (response && response.notification.request.content.data) {
        const data = response.notification.request.content.data;
        if (data?.type) {
          const routes: any = {
            'LEAVE': '/leave-request',
            'LEAVE_STATUS': '/leave-request',
            'CHAT': '/chat',
            'TASK': '/(tabs)/tasks',
            'ATTENDANCE': '/(tabs)'
          };

          // Dùng setTimeout để nhường đường cho Auth Guard chạy xong trước (đẩy vào tabs), 
          // sau đó mình mới đè màn hình Chat lên trên.
          setTimeout(() => {
            router.push(routes[data.type] || '/notifications');
          }, 800);
        }
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data;
      if (data?.type) {
        const routes: any = {
          'LEAVE': '/leave-request',
          'LEAVE_STATUS': '/leave-request',
          'CHAT': '/chat',
          'TASK': '/(tabs)/tasks',
          'ATTENDANCE': '/(tabs)'
        };
        router.push(routes[data.type] || '/notifications');
      } else {
        router.push('/notifications');
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <SocketProvider>
      <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomDefaultTheme}>
        <Stack
          screenOptions={{
            headerTintColor: PRIMARY_PURPLE,
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ title: 'Thông báo' }} />
          <Stack.Screen name="update-profile" options={{ headerShown: false }} />
          <Stack.Screen name="leave-request" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ headerShown: false }} />
          <Stack.Screen name="payroll" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SocketProvider>
  );
}