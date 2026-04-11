import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    AlertCircle,
    ChevronLeft,
    Clock,
    Info,
    TrendingDown,
    TrendingUp
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE } from '../constants/Config';

export default function PayrollDetailScreen() {
    const { type, filter, dateString } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const date = dateString ? new Date(dateString as string) : new Date();

    const [loading, setLoading] = useState(true);
    const [listData, setListData] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            let userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                const userData = await AsyncStorage.getItem('currentUser');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    userId = parsed._id || parsed.id;
                }
            }

            if (!userId) {
                setLoading(false);
                return;
            }

            const m = date.getMonth() + 1;
            const y = date.getFullYear();
            const monthStr = `${String(m).padStart(2, '0')}-${y}`;

            if (type === 'attendance') {
                const res = await axios.get(`${API_BASE}/attendance`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });

                if (!Array.isArray(res.data)) {
                    setListData([]);
                    setLoading(false);
                    return;
                }

                const myLogs = res.data.filter((log: any) => {
                    const logUserId = log.userId?._id ? String(log.userId._id) : String(log.userId);
                    const logDate = new Date(log.createdAt);
                    return logUserId === String(userId) &&
                        (logDate.getMonth() + 1) === m &&
                        logDate.getFullYear() === y;
                });

                let finalLogs = myLogs;
                let summaryInfo = { total: 0, count: 0, label: '' };

                if (filter === 'approved') {
                    finalLogs = myLogs.filter((l: any) => l.status === 'APPROVED');
                    summaryInfo.label = 'Số ngày công đã duyệt';
                } else if (filter === 'late') {
                    finalLogs = myLogs.filter((l: any) => {
                        if (!l.checkInTime) return false;
                        const checkIn = new Date(l.checkInTime);
                        return checkIn.getHours() > 8 || (checkIn.getHours() === 8 && checkIn.getMinutes() > 0);
                    });
                    summaryInfo.label = 'Số lần đi muộn / về sớm';
                } else {
                    summaryInfo.label = 'Tổng số buổi chấm công';
                }

                let totalHours = 0;
                finalLogs.forEach((l: any) => {
                    if (l.checkInTime && l.checkOutTime) {
                        totalHours += (new Date(l.checkOutTime).getTime() - new Date(l.checkInTime).getTime()) / 3600000;
                    }
                });

                summaryInfo.count = finalLogs.length;
                summaryInfo.total = Number(totalHours.toFixed(1));
                setSummary(summaryInfo);
                setListData(finalLogs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            } else {
                const res = await axios.get(`${API_BASE}/payroll/report?month=${monthStr}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });

                const myPayroll = Array.isArray(res.data) ? res.data.find((p: any) => {
                    const pUserId = p.userId?._id ? String(p.userId._id) : String(p.userId);
                    return pUserId === String(userId);
                }) : null;

                if (myPayroll) {
                    const amount = type === 'bonus' ? (myPayroll.bonus || 0) : (myPayroll.fine || 0);
                    setSummary({
                        label: type === 'bonus' ? 'Tổng tiền thưởng & phụ cấp' : 'Tổng tiền giảm trừ & phạt',
                        count: amount.toLocaleString() + ' đ'
                    });

                    setListData([{
                        title: type === 'bonus' ? 'Thưởng chuyên cần & Phụ cấp' : 'Khấu trừ đi muộn & Vi phạm',
                        value: amount,
                        note: type === 'bonus' ? 'Lương tăng ca, thưởng nóng và các khoản hỗ trợ.' : 'Trừ lương do vi phạm thời gian hoặc quy định.'
                    }]);
                }
            }
        } catch (error: any) {
            console.error("Lỗi fetch chi tiết payroll:", error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    useEffect(() => {
        fetchData();
    }, [type, filter, dateString]);

    const getTitle = () => {
        switch (type) {
            case 'attendance': return 'Chi tiết công';
            case 'bonus': return 'Chi tiết thưởng';
            case 'fine': return 'Chi tiết phạt';
            default: return 'Chi tiết';
        }
    };

    const renderAttendanceItem = (item: any, index: number) => {
        const checkIn = new Date(item.checkInTime || item.createdAt);
        const checkOut = item.checkOutTime ? new Date(item.checkOutTime) : null;
        
        let hours = 0;
        if (checkOut) {
            hours = (checkOut.getTime() - checkIn.getTime()) / 3600000;
        }

        const isLate = checkIn.getHours() > 8 || (checkIn.getHours() === 8 && checkIn.getMinutes() > 0);
        const locationStr = item.locationType === 'OFFICE' ? 'Văn phòng' : 'Ngoài VP';
        const statusStr = item.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt';

        return (
            <View key={item._id || index} style={styles.item}>
                <View style={styles.itemLeft}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.itemDate}>{checkIn.toLocaleDateString('vi-VN')}</Text>
                        <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>{locationStr}</Text></View>
                    </View>
                    <Text style={styles.itemTime}>
                        {checkIn.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        {checkOut ? ` - ${checkOut.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ' - Chưa Checkout'}
                    </Text>
                    {item.note && <Text style={styles.itemNote}>"{item.note}"</Text>}
                </View>
                <View style={styles.itemRight}>
                    <Text style={styles.itemValue}>{hours > 0 ? `${hours.toFixed(1)}h` : '--'}</Text>
                    <View style={[styles.badge, { backgroundColor: item.status === 'APPROVED' ? '#DCFCE7' : '#FEF9C3' }]}>
                        <Text style={[styles.badgeText, { color: item.status === 'APPROVED' ? '#16A34A' : '#A16207' }]}>{statusStr}</Text>
                    </View>
                    {isLate && <View style={[styles.badge, { backgroundColor: '#FFEDD5', marginTop: 4 }]}><Text style={[styles.badgeText, { color: '#EA580C' }]}>Đi muộn</Text></View>}
                </View>
            </View>
        );
    };

    const renderFinancialItem = (item: any, index: number) => (
        <View key={index} style={styles.item}>
            <View style={styles.itemLeft}>
                <Text style={styles.itemDate}>{item.title}</Text>
                <Text style={styles.itemSub}>{item.note}</Text>
            </View>
            <Text style={[styles.itemValue, { color: type === 'bonus' ? '#059669' : '#E11D48' }]}>
                {type === 'bonus' ? '+' : '-'}{Number(item.value).toLocaleString()} đ
            </Text>
        </View>
    );

    const renderContent = () => {
        if (loading && !refreshing) {
            return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;
        }

        return (
            <View style={styles.list}>
                {summary && (
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>{summary.label}</Text>
                        <Text style={styles.summaryValue}>{summary.count}</Text>
                        {type === 'attendance' && <Text style={styles.summarySub}>Tổng số giờ: {summary.total}h</Text>}
                    </View>
                )}

                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        {type === 'attendance' ? <Clock size={20} color="#4F46E5" /> : 
                         type === 'bonus' ? <TrendingUp size={20} color="#059669" /> : 
                         <TrendingDown size={20} color="#E11D48" />}
                        <Text style={styles.cardTitle}>
                            {type === 'attendance' ? 'Danh sách ghi nhận' : 
                             type === 'bonus' ? 'Chi tiết khoản cộng' : 'Chi tiết khoản trừ'}
                        </Text>
                    </View>
                    
                    {listData.length === 0 ? (
                        <View style={styles.emptyState}>
                            <AlertCircle size={32} color="#CBD5E1" />
                            <Text style={styles.emptyText}>Không có dữ liệu trong tháng này</Text>
                        </View>
                    ) : (
                        listData.map((item, index) => 
                            type === 'attendance' ? renderAttendanceItem(item, index) : renderFinancialItem(item, index)
                        )
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft color="#1E293B" size={24} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{getTitle()}</Text>
                    <Text style={styles.headerSub}>Tháng {date.getMonth() + 1}/{date.getFullYear()}</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />
                }
            >
                {renderContent()}

                <View style={styles.infoBox}>
                    <Info size={16} color="#64748B" />
                    <Text style={styles.infoText}>
                        Nếu có bất kỳ thắc mắc nào về dữ liệu, vui lòng liên hệ bộ phận HR để được hỗ trợ giải đáp.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerInfo: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    headerSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
    content: { padding: 20 },
    list: { gap: 16 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    cardDesc: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 20 },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    itemLeft: { flex: 1, gap: 4, marginRight: 10 },
    itemRight: { alignItems: 'flex-end', gap: 6 },
    itemDate: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
    itemTime: { fontSize: 13, color: '#64748B' },
    itemSub: { fontSize: 13, color: '#94A3B8' },
    itemValue: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    center: { padding: 40, alignItems: 'center', justifyContent: 'center' },
    emptyCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 20, 
        padding: 40, 
        alignItems: 'center', 
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    emptyText: { color: '#64748B', fontSize: 14, marginTop: 15, textAlign: 'center' },
    infoBox: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 30,
        padding: 15,
        backgroundColor: '#F1F5F9',
        borderRadius: 12
    },
    infoText: { flex: 1, fontSize: 13, color: '#64748B', lineHeight: 20 },
    
    // DYNAMIC UI STYLES
    summaryCard: {
        backgroundColor: '#4F46E5',
        borderRadius: 20,
        padding: 20,
        marginBottom: 10,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5
    },
    summaryLabel: { color: '#E0E7FF', fontSize: 13, fontWeight: '600', marginBottom: 4 },
    summaryValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
    summarySub: { color: '#C7D2FE', fontSize: 12, marginTop: 4, fontWeight: '500' },
    miniBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    miniBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
    itemNote: {
        fontSize: 12,
        color: '#94A3B8',
        fontStyle: 'italic',
        marginTop: 6,
        backgroundColor: '#F8FAFC',
        padding: 6,
        borderRadius: 8
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12
    }
});
