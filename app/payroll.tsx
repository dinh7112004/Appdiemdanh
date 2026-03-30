import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import {
    AlertCircle,
    Briefcase,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Gift,
    Sparkles
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { API_BASE } from '../constants/Config';

const { width } = Dimensions.get('window');
const PRIMARY_PURPLE = "#6345E5";

export default function PayrollScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const [salaryData, setSalaryData] = useState({
        month: "",
        baseSalary: 0,
        bonus: 0,
        fine: 0,
        total: 0
    });

    const fetchMyPayroll = async () => {
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                setLoading(false);
                return;
            }

            const m = String(currentDate.getMonth() + 1).padStart(2, '0');
            const y = currentDate.getFullYear();
            const apiMonth = `${m}-${y}`;

            const res = await axios.get(`${API_BASE}/payroll/report?month=${apiMonth}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });

            const myPayroll = res.data.find((p: any) =>
                (p.userId?._id === userId || p.userId === userId)
            );

            if (myPayroll) {
                const base = myPayroll.userId?.baseSalary || 0;
                const bonus = myPayroll.bonus || 0;
                const fine = myPayroll.fine || 0;

                setSalaryData({
                    month: `Tháng ${m}/${y}`,
                    baseSalary: base,
                    bonus: bonus,
                    fine: fine,
                    total: base + bonus - fine
                });
            } else {
                setSalaryData({
                    month: `Tháng ${m}/${y}`,
                    baseSalary: 0, bonus: 0, fine: 0, total: 0
                });
            }
        } catch (error) {
            console.error("Lỗi lấy phiếu lương:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyPayroll();
    }, [currentDate]);

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* HEADER THANH LỊCH */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <ChevronLeft color="#0F172A" size={26} />
                </TouchableOpacity>

                <View style={styles.monthSelector}>
                    <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
                        <ChevronLeft size={18} color={PRIMARY_PURPLE} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{salaryData.month || "..."}</Text>
                    <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
                        <ChevronRight size={18} color={PRIMARY_PURPLE} />
                    </TouchableOpacity>
                </View>

                <View style={styles.iconBtn} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PRIMARY_PURPLE} />
                    <Text style={styles.loadingText}>Đang đồng bộ dữ liệu...</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                    {/* THẺ PREMIUM CARD (GIẢ LẬP NHƯ THẺ NGÂN HÀNG) */}
                    <View style={styles.premiumCard}>
                        {/* Họa tiết chìm (Background Pattern) */}
                        <View style={styles.bgCircle1} />
                        <View style={styles.bgCircle2} />

                        <View style={styles.cardTop}>
                            <View style={styles.labelWrapper}>
                                <Sparkles size={16} color="#FDE047" />
                                <Text style={styles.totalLabel}>TỔNG THỰC NHẬN</Text>
                            </View>
                            <View style={styles.statusBadge}>
                                <CheckCircle2 size={12} color={PRIMARY_PURPLE} />
                                <Text style={styles.statusText}>
                                    {salaryData.total > 0 ? 'Đã thanh toán' : 'Chưa có dữ liệu'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.amountWrapper}>
                            <Text style={styles.totalAmount}>{salaryData.total.toLocaleString()}</Text>
                            <Text style={styles.currency}>VND</Text>
                        </View>

                        <Text style={styles.cardFooterText}>Dữ liệu được xác thực bởi HRM System</Text>
                    </View>

                    {/* DANH SÁCH CHI TIẾT */}
                    <View style={styles.detailsContainer}>

                        {/* KHOẢN CỘNG */}
                        <Text style={styles.sectionHeading}>THU NHẬP TRONG THÁNG</Text>
                        <View style={styles.detailCard}>
                            {/* Lương cơ bản */}
                            <View style={styles.itemRow}>
                                <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                                    <Briefcase size={20} color={PRIMARY_PURPLE} />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Lương cơ bản</Text>
                                    <Text style={styles.itemSub}>Theo hợp đồng lao động</Text>
                                </View>
                                <Text style={styles.itemValue}>{salaryData.baseSalary.toLocaleString()} đ</Text>
                            </View>

                            <View style={styles.divider} />

                            {/* Thưởng */}
                            <View style={styles.itemRow}>
                                <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                                    <Gift size={20} color="#10B981" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Phụ cấp & Thưởng</Text>
                                    <Text style={styles.itemSub}>Chuyên cần, hiệu suất</Text>
                                </View>
                                <Text style={[styles.itemValue, { color: '#10B981' }]}>+{salaryData.bonus.toLocaleString()} đ</Text>
                            </View>
                        </View>

                        {/* KHOẢN TRỪ */}
                        <Text style={[styles.sectionHeading, { marginTop: 15 }]}>KHOẢN GIẢM TRỪ</Text>
                        <View style={styles.detailCard}>
                            <View style={styles.itemRow}>
                                <View style={[styles.iconBox, { backgroundColor: '#FFF1F2' }]}>
                                    <AlertCircle size={20} color="#F43F5E" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Phạt vi phạm</Text>
                                    <Text style={styles.itemSub}>Đi muộn, sai nội quy</Text>
                                </View>
                                <Text style={[styles.itemValue, { color: '#F43F5E' }]}>-{salaryData.fine.toLocaleString()} đ</Text>
                            </View>
                        </View>

                    </View>

                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 15,
        backgroundColor: '#F8FAFC',
    },
    iconBtn: { width: 40, height: 40, justifyContent: 'center' },
    monthSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 25, paddingHorizontal: 5, paddingVertical: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    monthArrow: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginHorizontal: 15 },

    content: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, color: '#64748B', fontSize: 14, fontWeight: '500' },

    // Premium Card (Trái tim của giao diện)
    premiumCard: {
        backgroundColor: PRIMARY_PURPLE,
        borderRadius: 28,
        padding: 25,
        marginBottom: 30,
        overflow: 'hidden', // Để cắt các hình tròn họa tiết
        // Đổ bóng 3D cực mượt
        shadowColor: PRIMARY_PURPLE,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 15
    },
    // Họa tiết chìm (Abstract shapes)
    bgCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)', top: -50, right: -50 },
    bgCircle2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -40, left: -20 },

    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    labelWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    totalLabel: { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    statusText: { color: PRIMARY_PURPLE, fontSize: 11, fontWeight: '800' },

    amountWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 25 },
    totalAmount: { color: '#FFF', fontSize: 42, fontWeight: '900', lineHeight: 48 },
    currency: { color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '700', marginBottom: 6 },

    cardFooterText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500' },

    // Detail List
    detailsContainer: { flex: 1 },
    sectionHeading: { fontSize: 13, fontWeight: '700', color: '#94A3B8', marginBottom: 10, marginLeft: 5, letterSpacing: 1 },

    detailCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 3
    },
    itemRow: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 46, height: 46, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    itemInfo: { flex: 1, marginLeft: 15 },
    itemTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    itemSub: { fontSize: 12, color: '#64748B', marginTop: 3 },
    itemValue: { fontSize: 16, fontWeight: '800', color: '#1E293B' },

    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16, marginLeft: 60 }
});