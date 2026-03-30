import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import { AlertCircle, CalendarX, CheckCircle2, ChevronRight, Clock, MapPin, MessageSquare } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { API_BASE } from '../../constants/Config';
// 1. Cấu hình Tiếng Việt cho Lịch
LocaleConfig.locales['vi'] = {
    monthNames: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
    monthNamesShort: ['Th.1', 'Th.2', 'Th.3', 'Th.4', 'Th.5', 'Th.6', 'Th.7', 'Th.8', 'Th.9', 'Th.10', 'Th.11', 'Th.12'],


    dayNames: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'],
    dayNamesShort: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],

    today: "Hôm nay"
};
LocaleConfig.defaultLocale = 'vi';



export default function HistoryScreen() {
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // State cho Popup Chi tiết lịch sử
    const [selectedLog, setSelectedLog] = useState<any>(null);

    const fetchHistory = async () => {
        try {
            const userData = await AsyncStorage.getItem('currentUser');
            if (!userData) return;
            const parsedUser = JSON.parse(userData);

            const myId = String(parsedUser._id || parsedUser.id || "");

            const response = await axios.get(`${API_BASE}/attendance`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });

            const myData = response.data.filter((item: any) => {
                const recordUserId = item.userId?._id ? String(item.userId._id) : String(item.userId);
                return recordUserId === myId;
            });

            setAttendanceData(myData);
        } catch (error) {
            console.log("Lỗi fetch lịch sử:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchHistory(); }, []));

    // 2. LOGIC DẤU CHẤM TRÊN LỊCH
    const markedDates = useMemo(() => {
        const marks: any = {};
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const iterDate = new Date(startOfYear);

        while (iterDate <= today) {
            const dateStr = iterDate.toISOString().split('T')[0];
            marks[dateStr] = { marked: true, dotColor: '#EF4444' };
            iterDate.setDate(iterDate.getDate() + 1);
        }

        attendanceData.forEach(item => {
            const dateStr = new Date(item.createdAt).toISOString().split('T')[0];
            marks[dateStr] = { marked: true, dotColor: '#6345E5' };
        });

        marks[selectedDate] = {
            ...marks[selectedDate],
            selected: true,
            selectedColor: '#F0EDFD',
            selectedTextColor: '#6345E5',
        };

        return marks;
    }, [attendanceData, selectedDate]);

    // Lọc danh sách theo ngày chọn
    const filteredLogs = useMemo(() => {
        return attendanceData.filter(item =>
            new Date(item.createdAt).toISOString().split('T')[0] === selectedDate
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [attendanceData, selectedDate]);

    const renderLogItem = ({ item, index }: any) => {
        const rawType = String(item.type || item.locationType || "").toUpperCase().trim();
        const isOffice = rawType === 'OFFICE';
        const isApproved = item.status === 'APPROVED';

        return (
            <TouchableOpacity
                style={styles.logCard}
                activeOpacity={0.7}
                onPress={() => setSelectedLog(item)} // MỞ CHI TIẾT
            >
                <View style={styles.logHeader}>
                    <View style={styles.logLabelWrap}>
                        <Clock size={14} color="#8B8B9B" />
                        {/* Đảo ngược số thứ tự lượt chấm công */}
                        <Text style={styles.logLabel}>LẦN CHẤM CÔNG {filteredLogs.length - index}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isApproved ? '#F0EDFD' : 'rgba(245, 158, 11, 0.1)' }]}>
                        <Text style={[styles.statusText, { color: isApproved ? '#6345E5' : '#D97706' }]}>
                            {item.checkOutTime ? (isApproved ? "Hoàn tất" : "Chờ duyệt") : "Đang làm"}
                        </Text>
                    </View>
                </View>

                <View style={styles.logBody}>
                    <View style={styles.timeSection}>
                        <View style={styles.timeRow}>
                            <Text style={styles.timePrefix}>VÀO:</Text>
                            <Text style={styles.timeBig}>
                                {new Date(item.checkInTime || item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                        {item.checkOutTime && (
                            <View style={[styles.timeRow, { marginTop: 8 }]}>
                                <Text style={styles.timePrefix}>RA: </Text>
                                <Text style={styles.timeBig}>
                                    {new Date(item.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.actionSection}>
                        <View style={[styles.locationTag, { backgroundColor: isOffice ? '#F8F9FE' : '#F5F5FA' }]}>
                            <MapPin size={12} color={isOffice ? "#6345E5" : "#8B8B9B"} />
                            <Text style={[styles.locText, { color: isOffice ? "#6345E5" : "#8B8B9B" }]}>
                                {isOffice ? 'Văn phòng' : 'Từ xa'}
                            </Text>
                        </View>
                        <ChevronRight size={18} color="#C1C1D6" style={{ marginLeft: 10 }} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerWrap}>
                <Text style={styles.headerTitle}>Lịch sử chấm công</Text>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#6345E5" /></View>
            ) : (
                <FlatList
                    data={filteredLogs}
                    keyExtractor={(item, index) => (item._id || index).toString()}
                    renderItem={renderLogItem}
                    ListHeaderComponent={
                        <View style={styles.calendarWrap}>
                            <View style={styles.calendarCard}>
                                <Calendar
                                    current={selectedDate}
                                    onDayPress={day => setSelectedDate(day.dateString)}
                                    markedDates={markedDates}
                                    firstDay={0}
                                    theme={{
                                        calendarBackground: '#ffffff',
                                        todayTextColor: '#6345E5',
                                        dayTextColor: '#2d4150',
                                        monthTextColor: '#2A2640',
                                        textMonthFontWeight: '900',
                                        arrowColor: '#6345E5',
                                        textDayFontSize: 15,
                                        textMonthFontSize: 18,
                                        textDayHeaderFontSize: 13,
                                        'stylesheet.calendar.header': {
                                            week: {
                                                marginTop: 15,
                                                flexDirection: 'row',
                                                justifyContent: 'space-between'
                                            }
                                        }
                                    } as any}
                                />
                                <View style={styles.legend}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.dot, { backgroundColor: '#6345E5' }]} />
                                        <Text style={styles.legendText}>Có mặt</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                                        <Text style={styles.legendText}>Vắng mặt</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    }
                    contentContainerStyle={styles.listContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(); }} colors={['#6345E5']} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <CalendarX size={36} color="#C1C1D6" />
                            <Text style={styles.emptyTitle}>Chưa có dữ liệu điểm danh</Text>
                            <Text style={styles.emptySub}>Ngày {selectedDate.split('-').reverse().join('/')}</Text>
                        </View>
                    }
                />
            )}

            {/* --------------------------------------------------------- */}
            {/* POPUP CHI TIẾT LỊCH SỬ (GIỐNG HỆT HOME SCREEN) */}
            {/* --------------------------------------------------------- */}
            <Modal visible={!!selectedLog} transparent animationType="slide" onRequestClose={() => setSelectedLog(null)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedLog(null)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderIndicator} />
                        <Text style={styles.modalTitle}>Chi tiết điểm danh</Text>

                        {selectedLog && (
                            <View style={styles.detailBody}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Thời gian:</Text>
                                    <Text style={styles.detailValueBig}>
                                        {new Date(selectedLog.checkInTime || selectedLog.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        {' - '}
                                        {selectedLog.checkOutTime ? new Date(selectedLog.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Đang làm...'}
                                    </Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Trạng thái:</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {selectedLog.status === 'APPROVED' ? <CheckCircle2 size={16} color="#10B981" /> : <AlertCircle size={16} color="#F59E0B" />}
                                        <Text style={[styles.detailValue, { color: selectedLog.status === 'APPROVED' ? '#10B981' : '#F59E0B', marginLeft: 4, fontWeight: '700' }]}>
                                            {selectedLog.status === 'APPROVED' ? 'Đã duyệt' : 'Đang chờ duyệt'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                {/* Phần Lý do của nhân viên */}
                                <Text style={styles.detailSubtitle}>Lời nhắn của bạn:</Text>
                                <View style={styles.noteBox}>
                                    <Text style={styles.noteText}>{selectedLog.note || "Không có lời nhắn"}</Text>
                                </View>

                                {/* Phần Lời nhắn của Sếp (Đã fix dùng adminReply) */}
                                <Text style={[styles.detailSubtitle, { marginTop: 20 }]}>Phản hồi từ quản lý:</Text>
                                <View style={[styles.noteBox, { backgroundColor: '#F0EDFD', borderColor: '#E0D8FA' }]}>
                                    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                                        <MessageSquare size={14} color="#6345E5" />
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#6345E5', marginLeft: 6 }}>Sếp nhắn:</Text>
                                    </View>
                                    <Text style={[styles.noteText, { color: '#2A2640' }]}>
                                        {selectedLog.adminReply || selectedLog.adminNote || selectedLog.managerNote || "Quản lý chưa để lại phản hồi."}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity onPress={() => setSelectedLog(null)} style={[styles.cancelBtn, { marginTop: 24 }]}>
                            <Text style={styles.cancelText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F4FA' },
    headerWrap: { backgroundColor: '#FFF', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 24, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 5, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15, zIndex: 10 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#2A2640' },
    calendarWrap: { padding: 20 },
    calendarCard: { backgroundColor: '#FFF', borderRadius: 30, padding: 15, paddingBottom: 20, elevation: 3, shadowColor: '#6345E5', shadowOpacity: 0.05, shadowRadius: 15 },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 30, marginTop: 15 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 13, color: '#8B8B9B', fontWeight: '700' },

    listContainer: { paddingBottom: 50 },

    // THIẾT KẾ MỚI CHO LOG ITEM
    logCard: { backgroundColor: '#FFF', marginHorizontal: 20, marginBottom: 16, borderRadius: 24, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F4F4FA', paddingBottom: 16 },
    logLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logLabel: { fontSize: 12, fontWeight: '800', color: '#8B8B9B', textTransform: 'uppercase', letterSpacing: 0.5 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: '800' },

    logBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timeSection: { flex: 1 },
    timeRow: { flexDirection: 'row', alignItems: 'center' },
    timePrefix: { fontSize: 13, color: '#8B8B9B', fontWeight: '700', width: 38 },
    timeBig: { fontSize: 24, fontWeight: '900', color: '#2A2640', letterSpacing: 0.5 },

    actionSection: { flexDirection: 'row', alignItems: 'center' },
    locationTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    locText: { fontSize: 11, fontWeight: '800' },

    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyTitle: { color: '#2A2640', marginTop: 15, fontSize: 16, fontWeight: '800' },
    emptySub: { color: '#A0A0B5', marginTop: 5, fontSize: 14, fontWeight: '600' },

    // MODAL STYLES (Dùng chung từ Home)
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 15, 30, 0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, paddingBottom: 45 },
    modalHeaderIndicator: { width: 50, height: 5, backgroundColor: '#EAEAF2', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#2A2640', textAlign: 'center' },
    detailBody: { marginTop: 25 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    detailLabel: { fontSize: 14, color: '#8B8B9B', fontWeight: '600' },
    detailValueBig: { fontSize: 17, color: '#2A2640', fontWeight: '800' },
    detailValue: { fontSize: 14, color: '#2A2640', fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#F0F0F5', marginVertical: 16 },
    detailSubtitle: { fontSize: 13, color: '#8B8B9B', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
    noteBox: { backgroundColor: '#F9F9FC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F5' },
    noteText: { fontSize: 14, color: '#4A465B', lineHeight: 22 },
    cancelBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 20, backgroundColor: '#F4F4FA' },
    cancelText: { fontWeight: '700', color: '#8B8B9B', fontSize: 15 },
});