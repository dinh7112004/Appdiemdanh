import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import {
    AlertCircle,
    Briefcase,
    CalendarCheck,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Gift,
    Sparkles,
    Timer,
    Wallet
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

// Đổi sang tone màu Indigo hiện đại, chuyên nghiệp hơn
const PRIMARY_COLOR = "#4F46E5";
const CARD_BG_DARK = "#1E1B4B";

export default function PayrollScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    const [salaryData, setSalaryData] = useState({
        month: "",
        monthlyBase: 0,
        earnedSalary: 0,
        totalHours: 0,
        totalApproved: 0,
        totalLate: 0,
        bonus: 0,
        fine: 0,
        total: 0
    });

    const fetchMyPayroll = async () => {
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) return;

            const m = currentDate.getMonth() + 1;
            const y = currentDate.getFullYear();
            const apiMonth = `${String(m).padStart(2, '0')}-${y}`;

            const [payrollRes, attendanceRes, logsRes] = await Promise.all([
                axios.get(`${API_BASE}/payroll/report?month=${apiMonth}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                }),
                axios.get(`${API_BASE}/attendance/report/monthly?month=${m}&year=${y}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                }),
                axios.get(`${API_BASE}/attendance`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                })
            ]);

            const myPayroll = payrollRes.data.find((p: any) =>
                String(p.userId?._id || p.userId) === String(userId)
            ) || {};

            const myAttendanceReport = attendanceRes.data.find((a: any) =>
                String(a.userId?._id || a.userId) === String(userId)
            ) || {};

            const myLogs = logsRes.data.filter((log: any) => {
                const logUserId = log.userId?._id || log.userId;
                const logDate = new Date(log.createdAt);
                return String(logUserId) === String(userId) &&
                    (logDate.getMonth() + 1) === m &&
                    logDate.getFullYear() === y;
            });

            let totalMinutesWorked = 0;
            const dailyLogs: { [key: string]: any[] } = {};

            myLogs.forEach((log: any) => {
                if (log.checkInTime && log.checkOutTime) {
                    const diffMs = new Date(log.checkOutTime).getTime() - new Date(log.checkInTime).getTime();
                    if (diffMs > 0) {
                        totalMinutesWorked += diffMs / (1000 * 60);
                    }
                }
                const dateKey = new Date(log.createdAt).toISOString().split('T')[0];
                if (!dailyLogs[dateKey]) dailyLogs[dateKey] = [];
                dailyLogs[dateKey].push(log);
            });

            let calculatedLateCount = 0;
            Object.values(dailyLogs).forEach(logs => {
                const sortedLogs = logs.sort((a, b) => {
                    const timeA = a.checkInTime ? new Date(a.checkInTime).getTime() : new Date(a.createdAt).getTime();
                    const timeB = b.checkInTime ? new Date(b.checkInTime).getTime() : new Date(b.createdAt).getTime();
                    return timeA - timeB;
                });

                const firstLog = sortedLogs[0];
                if (firstLog && firstLog.checkInTime) {
                    const checkIn = new Date(firstLog.checkInTime);
                    if (checkIn.getHours() > 8 || (checkIn.getHours() === 8 && checkIn.getMinutes() > 0)) {
                        calculatedLateCount++;
                    }
                }
            });

            const totalHoursWorked = totalMinutesWorked / 60;
            const totalApproved = Number(myAttendanceReport.totalApproved || myAttendanceReport.total_approved || 0);

            const monthlyBase = Number(myPayroll.userId?.baseSalary || myPayroll.baseSalary) || 0;

            let hourlyRate = Number(myPayroll.userId?.hourlySalary || myPayroll.hourlySalary || 0);
            if (hourlyRate === 0 && monthlyBase > 0) {
                hourlyRate = monthlyBase / 208;
            }

            const earnedSalary = Math.round(totalHoursWorked * hourlyRate);
            const bonus = Number(myPayroll.bonus || 0);
            const fine = Number(myPayroll.fine || 0);

            const totalReceived = Math.max(0, monthlyBase + bonus - fine);

            setSalaryData({
                month: `Tháng ${String(m).padStart(2, '0')}/${y}`,
                monthlyBase: monthlyBase,
                earnedSalary: earnedSalary,
                totalHours: Number(totalHoursWorked.toFixed(2)),
                totalApproved: totalApproved,
                totalLate: calculatedLateCount,
                bonus: bonus,
                fine: fine,
                total: totalReceived
            });

        } catch (error) {
            console.error("Lỗi đồng bộ dữ liệu lương:", error);
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

    const handleViewDetail = (type: string, filter?: string) => {
        router.push({
            pathname: '/payroll-detail',
            params: {
                type: type,
                filter: filter || '',
                dateString: currentDate.toISOString()
            }
        } as any);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F4F6F9" />

            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <ChevronLeft color="#1E293B" size={24} />
                </TouchableOpacity>

                <View style={styles.monthSelector}>
                    <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthArrow}>
                        <ChevronLeft size={16} color="#475569" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{salaryData.month || "Đang tải..."}</Text>
                    <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthArrow}>
                        <ChevronRight size={16} color="#475569" />
                    </TouchableOpacity>
                </View>

                <View style={{ width: 44 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
                    <Text style={styles.loadingText}>Đang tổng hợp dữ liệu...</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                    {/* THẺ TỔNG LƯƠNG PREMIUM */}
                    <View style={styles.premiumCard}>
                        {/* Họa tiết nền */}
                        <View style={styles.bgCircle1} />
                        <View style={styles.bgCircle2} />

                        <View style={styles.cardTop}>
                            <View style={styles.labelWrapper}>
                                <Sparkles size={14} color="#FEF08A" />
                                <Text style={styles.totalLabel}>TỔNG THỰC NHẬN</Text>
                            </View>
                            <View style={styles.statusBadge}>
                                <CheckCircle2 size={12} color="#10B981" />
                                <Text style={styles.statusText}>
                                    {salaryData.total > 0 ? 'Đã chốt lương' : 'Chưa phát sinh'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.amountWrapper}>
                            <Text style={styles.totalAmount}>{salaryData.total.toLocaleString()}</Text>
                            <Text style={styles.currency}>đ</Text>
                        </View>

                        <View style={styles.cardFooter}>
                            <Text style={styles.cardFooterText}>Cơ bản + Thưởng - Giảm trừ</Text>
                        </View>
                    </View>

                    {/* CHI TIẾT */}
                    <View style={styles.detailsContainer}>

                        {/* --- KHỐI 1: THỐNG KÊ CHẤM CÔNG --- */}
                        <Text style={styles.sectionHeading}>BÁO CÁO CHẤM CÔNG</Text>
                        <View style={styles.detailCard}>

                            <TouchableOpacity style={styles.itemRow} onPress={() => handleViewDetail('attendance', 'all')}>
                                <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                                    <Clock size={22} color="#0284C7" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Giờ làm việc</Text>
                                    <Text style={styles.itemSub}>Tổng thời gian ghi nhận</Text>
                                </View>
                                <View style={styles.valueWrapper}>
                                    <Text style={styles.itemValue}>{salaryData.totalHours.toLocaleString()} h</Text>
                                    <ChevronRight size={18} color="#CBD5E1" />
                                </View>
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            <TouchableOpacity style={styles.itemRow} onPress={() => handleViewDetail('attendance', 'approved')}>
                                <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                                    <CalendarCheck size={22} color="#16A34A" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Ngày công</Text>
                                    <Text style={styles.itemSub}>Ca làm đã xét duyệt</Text>
                                </View>
                                <View style={styles.valueWrapper}>
                                    <Text style={styles.itemValue}>{salaryData.totalApproved.toLocaleString()} ngày</Text>
                                    <ChevronRight size={18} color="#CBD5E1" />
                                </View>
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            <TouchableOpacity style={styles.itemRow} onPress={() => handleViewDetail('attendance', 'late')}>
                                <View style={[styles.iconBox, { backgroundColor: '#FFEDD5' }]}>
                                    <Timer size={22} color="#EA580C" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Đi muộn / Về sớm</Text>
                                    <Text style={styles.itemSub}>Số lần vi phạm</Text>
                                </View>
                                <View style={styles.valueWrapper}>
                                    <Text style={[styles.itemValue, { color: '#EA580C' }]}>{salaryData.totalLate.toLocaleString()} lần</Text>
                                    <ChevronRight size={18} color="#CBD5E1" />
                                </View>
                            </TouchableOpacity>

                        </View>

                        {/* --- KHỐI 2: CHI TIẾT THU NHẬP --- */}
                        <Text style={styles.sectionHeading}>CHI TIẾT THU NHẬP</Text>
                        <View style={styles.detailCard}>

                            {/* Lương cơ bản */}
                            <View style={styles.itemRow}>
                                <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                                    <Wallet size={22} color="#475569" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Lương cơ bản</Text>
                                    <Text style={styles.itemSub}>Mức lương cố định</Text>
                                </View>
                                <View style={styles.valueWrapper}>
                                    <Text style={[styles.itemValue, { color: '#334155', fontSize: 15 }]}>
                                        {salaryData.monthlyBase.toLocaleString()} đ
                                    </Text>
                                    {/* Placeholder spacer to align with rows that have ChevronRight (18px) + gap (6px) */}
                                    <View style={{ width: 24 }} />
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Lương thực tế */}
                            <TouchableOpacity style={styles.itemRow} onPress={() => handleViewDetail('attendance', 'all')}>
                                <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}>
                                    <Briefcase size={22} color={PRIMARY_COLOR} />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Lương thực tế</Text>
                                    <Text style={styles.itemSub}>Ước tính theo giờ làm</Text>
                                </View>
                                <View style={styles.valueWrapper}>
                                    <Text style={[styles.itemValue, { color: PRIMARY_COLOR }]}>+{salaryData.earnedSalary.toLocaleString()} đ</Text>
                                    <ChevronRight size={18} color="#CBD5E1" />
                                </View>
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            {/* Thưởng */}
                            <TouchableOpacity style={styles.itemRow} onPress={() => handleViewDetail('bonus')}>
                                <View style={[styles.iconBox, { backgroundColor: '#D1FAE5' }]}>
                                    <Gift size={22} color="#059669" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Phụ cấp & Thưởng</Text>
                                    <Text style={styles.itemSub}>Xem chi tiết khoản cộng</Text>
                                </View>
                                <View style={styles.valueWrapper}>
                                    <Text style={[styles.itemValue, { color: '#059669' }]}>+{salaryData.bonus.toLocaleString()} đ</Text>
                                    <ChevronRight size={18} color="#CBD5E1" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* --- KHỐI 3: KHOẢN GIẢM TRỪ --- */}
                        <Text style={styles.sectionHeading}>KHOẢN GIẢM TRỪ</Text>
                        <View style={styles.detailCard}>

                            {/* Phạt */}
                            <TouchableOpacity style={styles.itemRow} onPress={() => handleViewDetail('fine')}>
                                <View style={[styles.iconBox, { backgroundColor: '#FFE4E6' }]}>
                                    <AlertCircle size={22} color="#E11D48" />
                                </View>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle}>Phạt vi phạm</Text>
                                    <Text style={styles.itemSub}>Xem chi tiết khoản trừ</Text>
                                </View>
                                <View style={styles.valueWrapper}>
                                    <Text style={[styles.itemValue, { color: '#E11D48' }]}>-{salaryData.fine.toLocaleString()} đ</Text>
                                    <ChevronRight size={18} color="#CBD5E1" />
                                </View>
                            </TouchableOpacity>

                        </View>

                        {/* Padding dưới cùng cho thoáng */}
                        <View style={{ height: 30 }} />

                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F6F9'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#F4F6F9'
    },
    iconBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 100,
        paddingHorizontal: 6,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 3
    },
    monthArrow: {
        width: 34,
        height: 34,
        backgroundColor: '#F8FAFC',
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginHorizontal: 16
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 5
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F6F9'
    },
    loadingText: {
        marginTop: 15,
        color: '#64748B',
        fontSize: 15,
        fontWeight: '500'
    },

    // THIẾT KẾ CARD PREMIUM
    premiumCard: {
        backgroundColor: CARD_BG_DARK,
        borderRadius: 28,
        padding: 24,
        marginBottom: 32,
        overflow: 'hidden',
        shadowColor: CARD_BG_DARK,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 15
    },
    bgCircle1: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: '#312E81',
        top: -80,
        right: -60,
        opacity: 0.7
    },
    bgCircle2: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#3730A3',
        bottom: -50,
        left: -30,
        opacity: 0.5
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24
    },
    labelWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100
    },
    totalLabel: {
        color: '#E2E8F0',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 100
    },
    statusText: {
        color: '#059669',
        fontSize: 11,
        fontWeight: '700'
    },
    amountWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 20
    },
    totalAmount: {
        color: '#FFFFFF',
        fontSize: 42,
        fontWeight: '800',
        lineHeight: 48,
        letterSpacing: -1
    },
    currency: {
        color: '#A5B4FC',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6
    },
    cardFooter: {
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingTop: 16
    },
    cardFooterText: {
        color: '#A5B4FC',
        fontSize: 13,
        fontWeight: '500'
    },

    // THIẾT KẾ CÁC CARD CHI TIẾT
    detailsContainer: {
        flex: 1
    },
    sectionHeading: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 12,
        marginLeft: 8,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    detailCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginBottom: 28,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 3
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center'
    },
    itemInfo: {
        flex: 1,
        marginLeft: 16
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4
    },
    itemSub: {
        fontSize: 13,
        color: '#94A3B8'
    },
    valueWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    itemValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A'
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginLeft: 64 // Căn bằng mép chữ
    }
});