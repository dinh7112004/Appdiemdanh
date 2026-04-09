import { Tabs } from 'expo-router';
import { ClipboardList, Clock, Home, User } from 'lucide-react-native';
// ✅ 1. IMPORT THÊM THƯ VIỆN NÀY ĐỂ ĐO VIỀN MÀN HÌNH
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  // ✅ 2. LẤY KÍCH THƯỚC VÙNG AN TOÀN
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Ẩn header mặc định
        tabBarActiveTintColor: '#FFFFFF', // ⚪️ Đổi sang màu trắng tinh cho nút đang chọn
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)', // ⚪️ Màu trắng mờ cho nút chưa chọn

        tabBarStyle: {
          backgroundColor: '#6345E5', // 🟣 Đổi nền sang màu tím chủ đạo
          borderTopWidth: 0, // Xoá viền xám bên trên cho mượt

          // ✅ 3. TỰ ĐỘNG TÍNH TOÁN CHIỀU CAO & PADDING
          // Chiều cao cơ bản của Tab (icon + chữ) là khoảng 60.
          // Cộng thêm insets.bottom để máy tự nới rộng phần đáy cho vừa 3 nút hệ thống.
          height: 60 + insets.bottom,

          // Padding dưới 10px + khoảng trống của hệ thống
          paddingBottom: 10 + insets.bottom,

          paddingTop: 10,
          elevation: 20, // Làm nổi bật thanh tab trên Android
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      {/* 1. TRANG CHỦ */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
      />

      {/* 2. NHIỆM VỤ */}
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Nhiệm vụ',
          tabBarIcon: ({ color, size }) => (
            <ClipboardList size={size} color={color} />
          ),
        }}
      />

      {/* 3. LỊCH SỬ */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'Lịch sử',
          tabBarIcon: ({ color, size }) => (
            <Clock size={size} color={color} />
          ),
        }}
      />

      {/* 4. CÁ NHÂN */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}