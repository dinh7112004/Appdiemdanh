import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            {/* name="login" phải khớp với tên file login.tsx trong cùng thư mục */}
            <Stack.Screen name="login" />
        </Stack>
    );
}