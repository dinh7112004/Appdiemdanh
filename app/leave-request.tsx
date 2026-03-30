import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Camera, CheckCircle2, ChevronLeft, ChevronRight, Clock, Send, X, XCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { API_BASE } from '../constants/Config';

const LEAVE_TYPES = [
    { id: 'ANNUAL', label: 'Nghỉ phép', color: '#0D9488' },
    { id: 'SICK', label: 'Nghỉ ốm', color: '#E11D48' },
    { id: 'PERSONAL', label: 'Việc riêng', color: '#6366F1' },
];

export default function LeaveRequestScreen() {
    const router = useRouter();

    const [leaveType, setLeaveType] = useState('ANNUAL');
    const [reason, setReason] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [history, setHistory] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showFullHistory, setShowFullHistory] = useState(false);

    const minDate = useMemo(() => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);

        if (leaveType === 'ANNUAL') {
            date.setDate(date.getDate() + 1);
            return date;
        } else if (leaveType === 'PERSONAL') {
            return date;
        } else {
            return undefined;
        }
    }, [leaveType]);

    useEffect(() => {
        if (minDate && startDate < minDate) {
            setStartDate(new Date(minDate));
            if (endDate < minDate) {
                setEndDate(new Date(minDate));
            }
        }
    }, [leaveType]);

    const fetchHistory = useCallback(async (userId: string) => {
        try {
            const res = await axios.get(`${API_BASE}/leaves/user/${userId}?t=${Date.now()}`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'Cache-Control': 'no-cache'
                }
            });
            setHistory(res.data.reverse());
        } catch (error) {
            console.log("Lỗi tải lịch sử:", error);
        } finally {
            setRefreshing(false);
        }
    }, [API_BASE]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        const init = async () => {
            const userData = await AsyncStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                setCurrentUser(user);
                const uid = user.id || user._id;
                fetchHistory(uid);
                interval = setInterval(() => { fetchHistory(uid); }, 5000);
            }
        };
        init();
        return () => { if (interval) clearInterval(interval); };
    }, [fetchHistory]);

    const onRefresh = () => {
        setRefreshing(true);
        if (currentUser) fetchHistory(currentUser.id || currentUser._id);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const handleSubmit = async () => {
        if (startDate > endDate) return Alert.alert("Lỗi", "Ngày bắt đầu không thể sau ngày kết thúc.");

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startCheck = new Date(startDate);
        startCheck.setHours(0, 0, 0, 0);
        const endCheck = new Date(endDate);
        endCheck.setHours(0, 0, 0, 0);

        const msPerDay = 1000 * 60 * 60 * 24;
        const noticeDays = Math.ceil((startCheck.getTime() - today.getTime()) / msPerDay);
        const durationDays = Math.ceil((endCheck.getTime() - startCheck.getTime()) / msPerDay) + 1;

        if (leaveType === 'ANNUAL') {
            if (durationDays <= 1 && noticeDays < 1) {
                return Alert.alert("Sai quy định", "Nghỉ 1 ngày cần báo trước ít nhất 1 ngày.");
            }
            if (durationDays > 1 && durationDays <= 5 && noticeDays < 2) {
                return Alert.alert("Sai quy định", `Bạn xin nghỉ ${durationDays} ngày. Theo quy định phải báo trước ít nhất 2 ngày.`);
            }
            if (durationDays > 5 && noticeDays < 7) {
                return Alert.alert("Sai quy định", `Bạn xin nghỉ dài hạn (${durationDays} ngày). Theo quy định phải báo trước ít nhất 1 tuần (7 ngày).`);
            }
        } else if (leaveType === 'PERSONAL') {
            if (noticeDays < 0) return Alert.alert("Sai quy định", "Không thể xin nghỉ việc riêng cho những ngày trong quá khứ.");
        }

        if (!reason.trim()) return Alert.alert("Lỗi", "Vui lòng nhập lý do nghỉ.");
        if (leaveType === 'SICK' && !image) return Alert.alert("Thiếu giấy tờ ốm đau", "Vui lòng tải lên ảnh giấy khám/ra viện.");
        if (!currentUser) return Alert.alert("Lỗi", "Vui lòng đăng nhập lại.");

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('userId', currentUser.id || currentUser._id);
            formData.append('leaveType', leaveType);
            formData.append('startDate', startDate.toLocaleDateString('vi-VN'));
            formData.append('endDate', endDate.toLocaleDateString('vi-VN'));
            formData.append('reason', reason);

            if (image) {
                const filename = image.split('/').pop() || 'evidence.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                formData.append('evidence', {
                    uri: Platform.OS === 'ios' ? image.replace('file://', '') : image,
                    name: filename,
                    type: type,
                } as any);
            }

            await axios.post(`${API_BASE}/leaves`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'ngrok-skip-browser-warning': 'true' }
            });

            Alert.alert("Thành công 🎉", "Đơn đã được gửi!");
            setReason('');
            setImage(null);
            fetchHistory(currentUser.id || currentUser._id);
        } catch (error: any) {
            console.log("Lỗi chi tiết:", error.response?.data || error.message);
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể gửi đơn.");
        } finally {
            setLoading(false);
        }
    };

    const renderStatus = (status: string) => {
        if (status === 'APPROVED') return <CheckCircle2 size={16} color="#10B981" />;
        if (status === 'REJECTED') return <XCircle size={16} color="#EF4444" />;
        return <Clock size={16} color="#F59E0B" />;
    };

    const renderHistoryItem = ({ item }: { item: any }) => (
        <View style={styles.historyItem}>
            <View style={styles.historyLeft}>
                <Text style={styles.historyType}>
                    {LEAVE_TYPES.find(t => t.id === item.leaveType)?.label || item.leaveType}
                </Text>
                <Text style={styles.historyDate}>{item.startDate} - {item.endDate}</Text>
                <Text style={styles.historyReason} numberOfLines={2}>{item.reason}</Text>
            </View>
            <View style={styles.historyRight}>
                {renderStatus(item.status)}
                <Text style={[styles.statusTextSmall,
                item.status === 'APPROVED' ? { color: '#10B981' } :
                    item.status === 'REJECTED' ? { color: '#EF4444' } : { color: '#F59E0B' }
                ]}>
                    {item.status === 'APPROVED' ? 'Duyệt' : item.status === 'REJECTED' ? 'Từ chối' : 'Chờ'}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={28} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Nghỉ Phép</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Tạo đơn mới</Text>

                        <View style={styles.typeContainer}>
                            {LEAVE_TYPES.map((type) => (
                                <TouchableOpacity key={type.id} style={[styles.typeCard, leaveType === type.id && { borderColor: type.color, backgroundColor: type.color + '10' }]} onPress={() => setLeaveType(type.id)}>
                                    <View style={[styles.dot, { backgroundColor: type.color }]} />
                                    <Text style={[styles.typeText, leaveType === type.id && { color: type.color, fontWeight: '700' }]}>{type.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {leaveType === 'ANNUAL' && <Text style={styles.ruleAlert}>* Luật: Nghỉ 1 ngày (Báo trước 1 ngày) • Nghỉ 2-5 ngày (Báo trước 2 ngày) • Trên 5 ngày (Báo trước 1 tuần)</Text>}
                        {leaveType === 'SICK' && <Text style={[styles.ruleAlert, { color: '#E11D48' }]}>* Mẹo: Có thể chọn ngày quá khứ để nộp bù đơn.</Text>}

                        {/* ROW CHỌN NGÀY */}
                        <View style={styles.row}>
                            <TouchableOpacity
                                style={[styles.inputBox, { flex: 1 }, showStartPicker && styles.inputBoxActive]}
                                onPress={() => { setShowStartPicker(!showStartPicker); setShowEndPicker(false); }}
                            >
                                <Calendar size={16} color={showStartPicker ? "#0D9488" : "#64748B"} />
                                <Text style={[styles.inputText, showStartPicker && { color: "#0D9488", fontWeight: '700' }]}>
                                    {startDate.toLocaleDateString('vi-VN')}
                                </Text>
                            </TouchableOpacity>
                            <View style={{ width: 10 }} />
                            <TouchableOpacity
                                style={[styles.inputBox, { flex: 1 }, showEndPicker && styles.inputBoxActive]}
                                onPress={() => { setShowEndPicker(!showEndPicker); setShowStartPicker(false); }}
                            >
                                <Calendar size={16} color={showEndPicker ? "#0D9488" : "#64748B"} />
                                <Text style={[styles.inputText, showEndPicker && { color: "#0D9488", fontWeight: '700' }]}>
                                    {endDate.toLocaleDateString('vi-VN')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* HIỂN THỊ LỊCH INLINE NGAY BÊN DƯỚI NẾU BẤM VÀO NGÀY BẮT ĐẦU */}
                        {showStartPicker && (
                            <View style={styles.inlinePickerContainer}>
                                <DateTimePicker
                                    value={startDate}
                                    mode="date"
                                    display="inline"
                                    minimumDate={minDate}
                                    onChange={(event, date) => {
                                        if (date) {
                                            setStartDate(date);
                                            if (endDate < date) setEndDate(date);
                                        }
                                        if (Platform.OS === 'android') setShowStartPicker(false);
                                    }}
                                />
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity style={styles.closePickerBtn} onPress={() => setShowStartPicker(false)}>
                                        <Text style={styles.closePickerText}>Xong</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* HIỂN THỊ LỊCH INLINE NGAY BÊN DƯỚI NẾU BẤM VÀO NGÀY KẾT THÚC */}
                        {showEndPicker && (
                            <View style={styles.inlinePickerContainer}>
                                <DateTimePicker
                                    value={endDate}
                                    mode="date"
                                    display="inline"
                                    minimumDate={startDate}
                                    onChange={(event, date) => {
                                        if (date) setEndDate(date);
                                        if (Platform.OS === 'android') setShowEndPicker(false);
                                    }}
                                />
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity style={styles.closePickerBtn} onPress={() => setShowEndPicker(false)}>
                                        <Text style={styles.closePickerText}>Xong</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        <TextInput style={styles.textArea} placeholder="Lý do chi tiết..." multiline value={reason} onChangeText={setReason} />

                        <View style={styles.evidenceHeader}>
                            <Text style={styles.evidenceTitle}>
                                Minh chứng {leaveType === 'SICK' ? <Text style={{ color: '#E11D48' }}>(Bắt buộc)*</Text> : '(Tùy chọn)'}
                            </Text>
                            <Text style={styles.evidenceHint}>
                                {leaveType === 'SICK' ? 'Cần ảnh chụp giấy viện/thuốc để HR làm BHXH' : 'Thiệp cưới, giấy báo tử hoặc giấy tờ liên quan (nếu có)'}
                            </Text>
                        </View>

                        <View style={styles.imageActionRow}>
                            <TouchableOpacity style={styles.smallUploadBtn} onPress={pickImage}>
                                <Camera size={20} color={leaveType === 'SICK' && !image ? '#E11D48' : '#0D9488'} />
                                <Text style={[styles.smallUploadText, leaveType === 'SICK' && !image && { color: '#E11D48' }]}>
                                    {image ? "Đã chọn ảnh" : "Chụp/Tải ảnh lên"}
                                </Text>
                            </TouchableOpacity>
                            {image && (
                                <TouchableOpacity onPress={() => setImage(null)}>
                                    <X size={20} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFF" /> : (
                                <>
                                    <Send size={18} color="#FFF" />
                                    <Text style={styles.submitBtnText}>Gửi đơn ngay</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.sectionCard, { marginTop: 20, paddingBottom: 20 }]}>
                        <View style={styles.historyHeader}>
                            <Text style={styles.sectionTitle}>Gần đây</Text>
                            {history.length > 3 && (
                                <TouchableOpacity style={styles.viewAllBtn} onPress={() => setShowFullHistory(true)}>
                                    <Text style={styles.viewAllText}>Xem tất cả</Text>
                                    <ChevronRight size={16} color="#0D9488" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {history.length === 0 ? (
                            <Text style={styles.emptyText}>Chưa có đơn nào được gửi.</Text>
                        ) : (
                            history.slice(0, 3).map((item, index) => (
                                <React.Fragment key={item._id || index}>
                                    {renderHistoryItem({ item })}
                                </React.Fragment>
                            ))
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={showFullHistory} animationType="slide" transparent={false}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowFullHistory(false)} style={styles.backBtn}>
                            <ArrowLeft size={24} color="#0F172A" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Lịch sử ({history.length} đơn)</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <FlatList
                        data={history}
                        keyExtractor={(item, index) => item._id || index.toString()}
                        renderItem={renderHistoryItem}
                        contentContainerStyle={styles.flatListContent}
                        showsVerticalScrollIndicator={false}
                    />
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    backButton: { padding: 5, marginLeft: -5 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', textAlign: 'center' },
    scrollContent: { padding: 15 },
    sectionCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 15 },
    typeContainer: { flexDirection: 'row', gap: 8, marginBottom: 15 },
    typeCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center' },
    dot: { width: 6, height: 6, borderRadius: 3 },
    typeText: { fontSize: 11, color: '#64748B' },
    row: { flexDirection: 'row', marginBottom: 10 },
    ruleAlert: { fontSize: 11, color: '#F59E0B', fontStyle: 'italic', marginBottom: 8, fontWeight: '600', lineHeight: 16 },
    inputBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    inputText: { fontSize: 13, color: '#1E293B' },

    // CSS MỚI CHO BẢNG CHỌN NGÀY INLINE
    inputBoxActive: { borderColor: '#0D9488', backgroundColor: '#F0FDFA' },
    inlinePickerContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
    closePickerBtn: { marginTop: 5, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: '#F0FDFA', borderRadius: 8, alignSelf: 'flex-end' },
    closePickerText: { color: '#0D9488', fontWeight: '700', fontSize: 14 },

    textArea: { backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, height: 80, textAlignVertical: 'top', fontSize: 14, marginBottom: 15 },
    evidenceHeader: { marginBottom: 10 },
    evidenceTitle: { fontSize: 13, fontWeight: '700', color: '#334155' },
    evidenceHint: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    imageActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
    smallUploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    smallUploadText: { fontSize: 13, fontWeight: '600', color: '#0D9488' },
    submitBtn: { backgroundColor: '#0F172A', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    viewAllBtn: { flexDirection: 'row', alignItems: 'center' },
    viewAllText: { fontSize: 13, fontWeight: '600', color: '#0D9488', marginRight: 2 },
    historyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    historyLeft: { flex: 1, paddingRight: 10 },
    historyType: { fontSize: 14, fontWeight: '700', color: '#334155' },
    historyDate: { fontSize: 12, color: '#64748B', marginTop: 4 },
    historyReason: { fontSize: 12, color: '#94A3B8', marginTop: 4, lineHeight: 16 },
    historyRight: { alignItems: 'center', justifyContent: 'center', minWidth: 60 },
    statusTextSmall: { fontSize: 10, fontWeight: '800', marginTop: 6, textTransform: 'uppercase' },
    emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 20, fontSize: 13 },

    modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    backBtn: { padding: 4 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    flatListContent: { padding: 15, backgroundColor: '#FFF', margin: 15, borderRadius: 20 }
});