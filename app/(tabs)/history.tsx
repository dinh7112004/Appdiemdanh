import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import { AlertCircle, CalendarX, CheckCircle2, ChevronRight, Clock, MapPin, MessageSquare, X, Check } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
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
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

        if (selectedDate) {
            marks[selectedDate] = {
                ...marks[selectedDate],
                selected: true,
                selectedColor: '#F0EDFD',
                selectedTextColor: '#6345E5',
            };
        }

        return marks;
    }, [attendanceData, selectedDate]);

    // Lọc danh sách theo ngày chọn
    const filteredLogs = useMemo(() => {
        if (!selectedDate) {
            return [...attendanceData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        return attendanceData.filter(item =>
            new Date(item.createdAt).toISOString().split('T')[0] === selectedDate
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [attendanceData, selectedDate]);

    const renderLogItem = ({ item, index }: any) => {
        const rawType = String(item.type || item.locationType || "").toUpperCase().trim();
        const isOffice = rawType === 'OFFICE';

        let totalHoursText = "0p";
        if (item.checkInTime && item.checkOutTime) {
            const inTime = new Date(item.checkInTime).getTime();
            const outTime = new Date(item.checkOutTime).getTime();
            const diffMs = outTime - inTime;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            if (diffHours > 0) {
                totalHoursText = `${diffHours}h ${diffMinutes}p`;
            } else {
                totalHoursText = `${diffMinutes}p`;
            }
        }

        const dateObj = new Date(item.createdAt);
        const dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
        
        let timeStr = "Đang làm...";
        if (item.checkInTime) {
            const inTime = new Date(item.checkInTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
            if (item.checkOutTime) {
                const outTime = new Date(item.checkOutTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                timeStr = `${inTime} - ${outTime}`;
            } else {
                timeStr = `${inTime} - ...`;
            }
        }

        const isHighlight = index === 0;

        return (
            <TouchableOpacity
                style={[
                    styles.logRow,
                    index === 0 && styles.firstRow,
                    index === filteredLogs.length - 1 && styles.lastRow,
                    filteredLogs.length === 1 && styles.singleRow
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedLog(item)}
            >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text style={{ 
                        fontSize: 15, 
                        fontWeight: '600', 
                        color: isHighlight ? '#0056D2' : '#1E293B' 
                    }}>
                        {dateObj.getDate().toString().padStart(2, '0')}/{(dateObj.getMonth() + 1).toString().padStart(2, '0')} {isOffice ? '(VP)' : '(Ngoài VP)'}:{"  "}
                    </Text>
                    <Text style={{ 
                        fontSize: 15, 
                        fontWeight: '500', 
                        color: '#64748B' 
                    }}>
                        {timeStr}
                    </Text>
                </View>
                <View style={styles.logValueWrap}>
                    <Text style={{ 
                        fontSize: 15, 
                        fontWeight: '800', 
                        color: isHighlight ? '#0056D2' : '#1E293B' 
                    }}>
                        {totalHoursText}
                    </Text>
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
                                    current={selectedDate || new Date().toISOString().split('T')[0]}
                                    onDayPress={day => {
                                        if (selectedDate === day.dateString) {
                                            setSelectedDate(null);
                                        } else {
                                            setSelectedDate(day.dateString);
                                        }
                                    }}
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
                            {selectedDate && <Text style={styles.emptySub}>Ngày {selectedDate.split('-').reverse().join('/')}</Text>}
                        </View>
                    }
                />
            )}

            <Modal visible={!!selectedLog} transparent animationType="slide" onRequestClose={() => setSelectedLog(null)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSelectedLog(null)} />
                    <View style={styles.modalContent}>
                                <View style={styles.modalHeaderIndicator} />
                                <View style={styles.modalHeaderRow}>
                                    <Text style={styles.modalTitle}>Chi tiết điểm danh</Text>
                                    <TouchableOpacity onPress={() => setSelectedLog(null)} style={styles.closeBtn}>
                                        <X size={20} color="#8B8B9B" />
                                    </TouchableOpacity>
                                </View>

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

                                        <Text style={styles.detailSubtitle}>Lời nhắn của bạn:</Text>
                                        <View style={styles.noteBox}>
                                            <Text style={styles.noteText}>{selectedLog.note || "Không có lời nhắn"}</Text>
                                        </View>

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

    logRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#E2E8F0',
        marginHorizontal: 20,
    },
    firstRow: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderTopWidth: 1,
    },
    lastRow: {
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        borderBottomWidth: 1,
    },
    singleRow: {
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderRadius: 16,
    },
    logValueWrap: {
        marginLeft: 10,
    },

    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyTitle: { color: '#2A2640', marginTop: 15, fontSize: 16, fontWeight: '800' },
    emptySub: { color: '#A0A0B5', marginTop: 5, fontSize: 14, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 15, 30, 0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, paddingBottom: Platform.OS === 'ios' ? 45 : 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 20 },
    modalHeaderIndicator: { width: 44, height: 5, backgroundColor: '#EAEAF2', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 8 },
    closeBtn: { position: 'absolute', right: 0, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#2A2640' },
    detailBody: { marginTop: 25 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    detailLabel: { fontSize: 14, color: '#8B8B9B', fontWeight: '600' },
    detailValueBig: { fontSize: 17, color: '#2A2640', fontWeight: '800' },
    detailValue: { fontSize: 14, color: '#2A2640', fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#F0F0F5', marginVertical: 16 },
    detailSubtitle: { fontSize: 13, color: '#8B8B9B', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
    noteBox: { backgroundColor: '#F9F9FC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F5' },
    noteText: { fontSize: 14, color: '#4A465B', lineHeight: 22 },
    cancelBtn: { paddingVertical: 18, alignItems: 'center', borderRadius: 22, backgroundColor: '#F4F4FA' },
    cancelText: { fontWeight: '700', color: '#8B8B9B', fontSize: 16 },
});