import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../constants/Config';

// 1. Khởi tạo khung xương cho Context
const SocketContext = createContext<{ socket: Socket | null }>({ socket: null });

// 2. Chuyển thành Export Default để nếu sếp vẫn muốn để trong thư mục app (không khuyến khích) thì nó không lỗi
export default function SocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Lấy UserId từ Storage
    useEffect(() => {
        const checkUser = async () => {
            try {
                const data = await AsyncStorage.getItem('currentUser');
                if (data) {
                    const user = JSON.parse(data);
                    setUserId(user._id || user.id);
                }
            } catch (e) {
                console.error("Lỗi đọc Storage:", e);
            }
        };
        checkUser();
    }, []);

    useEffect(() => {
        if (!userId) return;

        // Kết nối Socket
        const newSocket = io(API_BASE, {
            query: { userId: userId, isAdmin: 'false' },
            transports: ['websocket']
        });

        setSocket(newSocket);
        console.log("🟢 [Global Socket] Đã kết nối báo danh online!");

        return () => {
            newSocket.disconnect();
            console.log("🔴 [Global Socket] Đã ngắt kết nối");
        };
    }, [userId]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
}

// 3. Hook dùng chung
export const useSocket = () => useContext(SocketContext);