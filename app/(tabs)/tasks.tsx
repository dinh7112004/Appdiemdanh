import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { AlertCircle, CalendarDays, Calendar as CalendarIcon, Camera, ChevronRight, Flag, Timer, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { API_BASE } from '../../constants/Config';

const TASK_TABS = [
    { id: 'TODO', label: 'Việc mới', color: '#6345E5' },
    { id: 'IN_PROGRESS', label: 'Đang làm', color: '#D97706' },
    { id: 'OVERDUE', label: 'Quá hạn', color: '#EF4444' },
    { id: 'COMPLETED', label: 'Đã xong', color: '#059669' },
];

const DATE_FILTERS = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'YESTERDAY', label: 'Hôm qua' },
    { id: 'TODAY', label: 'Hôm nay' },
    { id: 'TOMORROW', label: 'Ngày mai' },
];

export default function TasksScreen() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [filterStatus, setFilterStatus] = useState('TODO');
    const [filterDate, setFilterDate] = useState('ALL');

    const [customDate, setCustomDate] = useState(new Date());
    const [tempDate, setTempDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const [reportProgress, setReportProgress] = useState(0);
    const [reportImage, setReportImage] = useState<any>(null);

    const fetchTasks = useCallback(async (userId: string) => {
        try {
            const res = await axios.get(`${API_BASE}/tasks/user/${userId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            setTasks(res.data);
        } catch (error) {
            console.log("Lỗi tải task:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const userData = await AsyncStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                setCurrentUser(user);
                const uid = user.id || user._id;
                fetchTasks(uid);
            }
        };
        init();
    }, [fetchTasks]);

    const onRefresh = () => {
        setRefreshing(true);
        if (currentUser) fetchTasks(currentUser.id || currentUser._id);
    };

    const isTaskOverdue = (task: any) => {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return taskDate < today && task.status !== 'COMPLETED';
    };

    const isDateMatch = (task: any, filterType: string) => {
        if (filterType === 'ALL') return true;
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const checkSameDay = (d1: Date, d2: Date) => d1.getTime() === d2.getTime();

        if (filterType === 'TODAY') return checkSameDay(taskDate, today) || isTaskOverdue(task);
        if (filterType === 'YESTERDAY') return checkSameDay(taskDate, yesterday);
        if (filterType === 'TOMORROW') return checkSameDay(taskDate, tomorrow);
        if (filterType === 'CUSTOM') {
            const cDate = new Date(customDate); cDate.setHours(0, 0, 0, 0);
            return checkSameDay(taskDate, cDate);
        }
        return false;
    };

    const tasksFilteredByDate = tasks.filter(t => isDateMatch(t, filterDate));

    const filteredTasks = tasksFilteredByDate.filter(t => {
        const overdue = isTaskOverdue(t);
        if (filterStatus === 'OVERDUE') return overdue;
        if (filterStatus === 'COMPLETED') return t.status === 'COMPLETED';
        if (filterStatus === 'TODO') return t.status === 'TODO' && !overdue;
        if (filterStatus === 'IN_PROGRESS') return t.status === 'IN_PROGRESS' && !overdue;
        return false;
    });

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền thư viện ảnh để gửi minh chứng.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setReportImage(result.assets[0]);
        }
    };

    // TÍNH NĂNG MỚI: NÚT BẮT ĐẦU CHO VIỆC MỚI
    const startTask = async () => {
        if (!selectedTask) return;
        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append('status', 'IN_PROGRESS');
            formData.append('progress', '5'); // Khởi động với 5%

            const res = await axios.patch(`${API_BASE}/tasks/${selectedTask._id}/status`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setTasks(prev => prev.map(t =>
                t._id === selectedTask._id ? { ...t, status: res.data.status, progress: res.data.progress } : t
            ));

            setFilterStatus('IN_PROGRESS'); // Nhảy thẳng sang tab Đang làm
            closeModal();
        } catch (error) {
            Alert.alert("Lỗi", "Không thể bắt đầu công việc, vui lòng thử lại.");
        } finally {
            setIsUpdating(false);
        }
    };

    // GỬI BÁO CÁO (CHỈ DÙNG CHO ĐANG LÀM)
    const submitReport = async () => {
        if (!selectedTask) return;

        if (reportProgress === 100 && !reportImage) {
            Alert.alert('Chưa có minh chứng!', 'Sếp yêu cầu phải đính kèm ảnh chụp kết quả khi báo cáo hoàn thành (100%).');
            return;
        }

        setIsUpdating(true);
        try {
            let newStatus = selectedTask.status;
            if (reportProgress === 100) newStatus = 'COMPLETED';
            else if (reportProgress > 0) newStatus = 'IN_PROGRESS';

            const formData = new FormData();
            formData.append('status', newStatus);
            formData.append('progress', reportProgress.toString());

            if (reportImage && !reportImage.isOldImage) {
                const localUri = reportImage.uri;
                const filename = localUri.split('/').pop() || 'minhchung.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                formData.append('proofImage', { uri: localUri, name: filename, type } as any);
            }

            const res = await axios.patch(`${API_BASE}/tasks/${selectedTask._id}/status`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setTasks(prev => prev.map(t =>
                t._id === selectedTask._id
                    ? { ...t, status: res.data.status, progress: res.data.progress, proofImage: res.data.proofImage }
                    : t
            ));

            setFilterStatus(newStatus); // Nhảy thẳng sang tab tương ứng (Đã xong hoặc Đang làm)
            Alert.alert("Thành công", reportProgress === 100 ? "Đã chốt xong công việc!" : "Đã cập nhật tiến độ cho sếp!");
            closeModal();
        } catch (error) {
            Alert.alert("Lỗi", "Không thể gửi báo cáo, vui lòng thử lại.");
        } finally {
            setIsUpdating(false);
        }
    };

    const openModal = (task: any) => {
        setSelectedTask(task);
        // Nếu là Việc mới (TODO) thì progress luôn là 0, còn lại lấy số cũ hoặc mặc định 50
        const initProgress = task.status === 'TODO' ? 0 : (task.progress !== undefined ? task.progress : 50);
        setReportProgress(initProgress);

        if (task.proofImage) {
            const fullImageUrl = task.proofImage.startsWith('http')
                ? task.proofImage
                : `${API_BASE}/${task.proofImage}`;
            setReportImage({ uri: fullImageUrl, isOldImage: true });
        } else {
            setReportImage(null);
        }
    };

    const closeModal = () => {
        setSelectedTask(null);
        setReportImage(null);
    };

    const handleOpenDatePicker = () => {
        setTempDate(customDate);
        setShowDatePicker(true);
    };

    const onAndroidDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (event.type === 'set' && selectedDate) {
            setCustomDate(selectedDate);
            setFilterDate('CUSTOM');
        }
    };

    const renderTaskItem = ({ item }: { item: any }) => {
        const isHighPriority = item.priority === 'HIGH';
        const overdue = isTaskOverdue(item);
        const statusObj = TASK_TABS.find(s => s.id === item.status) || TASK_TABS[0];

        const pct = item.progress !== undefined ? item.progress : (item.status === 'COMPLETED' ? 100 : item.status === 'IN_PROGRESS' ? 50 : 0);

        return (
            <TouchableOpacity style={styles.taskCard} onPress={() => openModal(item)} activeOpacity={0.8}>
                <View style={styles.taskInfo}>
                    <View style={styles.taskHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
                            {isHighPriority && <AlertCircle size={16} color="#EF4444" style={{ marginRight: 8 }} />}
                        </View>
                        {overdue && (
                            <View style={styles.overdueBadge}>
                                <Text style={styles.overdueText}>QUÁ HẠN</Text>
                            </View>
                        )}
                    </View>

                    {item.description ? (
                        <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>
                    ) : (
                        <Text style={[styles.taskDesc, { fontStyle: 'italic', color: '#A0A0B5' }]}>Không có mô tả</Text>
                    )}

                    <View style={styles.taskFooter}>
                        <View style={styles.deadlineBox}>
                            <Timer size={14} color={overdue ? '#EF4444' : '#8B8B9B'} />
                            <Text style={[styles.deadlineText, overdue && { color: '#EF4444', fontWeight: '700' }]}>
                                {overdue ? `Trễ từ: ` : `Hạn: `}
                                {new Date(item.dueDate).toLocaleDateString('vi-VN')}
                            </Text>
                        </View>
                        <View style={[styles.progressBadge, { backgroundColor: statusObj.color + '15' }]}>
                            <Text style={[styles.progressText, { color: statusObj.color }]}>
                                {pct}% hoàn thành
                            </Text>
                        </View>
                    </View>
                </View>
                <ChevronRight size={18} color="#C1C1D6" />
            </TouchableOpacity>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6345E5" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Nhiệm vụ của tôi</Text>
                <Text style={styles.headerSub}>Theo dõi và báo cáo tiến độ công việc</Text>
            </View>

            <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateFilterContainer}>
                    {DATE_FILTERS.map((df) => (
                        <TouchableOpacity
                            key={df.id}
                            style={[styles.dateChip, filterDate === df.id && styles.dateChipActive]}
                            onPress={() => setFilterDate(df.id)}
                        >
                            <Text style={[styles.dateChipText, filterDate === df.id && styles.dateChipTextActive]}>{df.label}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[styles.dateChip, filterDate === 'CUSTOM' && styles.dateChipActive, { flexDirection: 'row', alignItems: 'center' }]}
                        onPress={handleOpenDatePicker}
                    >
                        <CalendarIcon size={14} color={filterDate === 'CUSTOM' ? '#FFF' : '#8B8B9B'} style={{ marginRight: 6 }} />
                        <Text style={[styles.dateChipText, filterDate === 'CUSTOM' && styles.dateChipTextActive]}>
                            {filterDate === 'CUSTOM' ? customDate.toLocaleDateString('vi-VN') : 'Chọn ngày'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <View style={styles.filterContainer}>
                {TASK_TABS.map((status) => {
                    const count = tasksFilteredByDate.filter(t => {
                        const isOv = isTaskOverdue(t);
                        if (status.id === 'OVERDUE') return isOv;
                        if (status.id === 'COMPLETED') return t.status === 'COMPLETED';
                        if (status.id === 'TODO') return t.status === 'TODO' && !isOv;
                        if (status.id === 'IN_PROGRESS') return t.status === 'IN_PROGRESS' && !isOv;
                        return false;
                    }).length;

                    return (
                        <TouchableOpacity
                            key={status.id}
                            style={[styles.filterTab, filterStatus === status.id && { borderBottomColor: status.color, borderBottomWidth: 3 }]}
                            onPress={() => setFilterStatus(status.id)}
                        >
                            <Text style={[styles.filterLabel, filterStatus === status.id && { color: status.color, fontWeight: '800' }]}>
                                {status.label} {count > 0 ? `(${count})` : ''}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <FlatList
                data={filteredTasks}
                keyExtractor={(item) => item._id}
                renderItem={renderTaskItem}
                contentContainerStyle={styles.taskList}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6345E5']} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconWrap}>
                            <CalendarDays size={40} color="#C1C1D6" />
                        </View>
                        <Text style={styles.emptyText}>Không có công việc nào trong mục này.</Text>
                    </View>
                }
            />

            {/* MODAL CHI TIẾT CÔNG VIỆC */}
            <Modal visible={!!selectedTask} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderIndicator} />

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTopTitle}>Chi tiết công việc</Text>
                            <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                                <X size={20} color="#8B8B9B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 600 }}>
                            <Text style={styles.detailTitle}>{selectedTask?.title}</Text>

                            <View style={styles.detailMetaRow}>
                                <View style={styles.detailMetaItem}>
                                    <Timer size={16} color="#8B8B9B" />
                                    <Text style={styles.detailMetaText}>
                                        Hạn: {selectedTask ? new Date(selectedTask.dueDate).toLocaleDateString('vi-VN') : ''}
                                    </Text>
                                </View>
                                <View style={styles.detailMetaItem}>
                                    <Flag size={16} color={selectedTask?.priority === 'HIGH' ? '#EF4444' : '#8B8B9B'} />
                                    <Text style={[styles.detailMetaText, selectedTask?.priority === 'HIGH' && { color: '#EF4444' }]}>
                                        Ưu tiên: {selectedTask?.priority === 'HIGH' ? 'Cao' : 'Thường'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* 1. NẾU LÀ VIỆC CHƯA BẮT ĐẦU */}
                            {selectedTask?.status === 'TODO' ? (
                                <View style={{ paddingVertical: 10 }}>
                                    <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 20, textAlign: 'center', lineHeight: 22 }}>
                                        Bạn chưa làm công việc này. Nhấn nút bên dưới để nhận việc và chuyển sang trạng thái "Đang làm" nhé!
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.submitReportBtn, { backgroundColor: '#D97706' }]}
                                        onPress={startTask}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitReportText}>Bắt đầu làm ngay</Text>}
                                    </TouchableOpacity>
                                </View>

                                /* 2. NẾU ĐÃ HOÀN THÀNH -> CHỈ XEM, KHÔNG CHO SỬA */
                            ) : selectedTask?.status === 'COMPLETED' ? (
                                <View style={{ paddingVertical: 10 }}>
                                    <View style={{ backgroundColor: '#05966915', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20 }}>
                                        <Text style={{ fontSize: 16, color: '#059669', fontWeight: '800' }}>Đã chốt hoàn thành!</Text>
                                        <Text style={{ fontSize: 13, color: '#059669', marginTop: 4, fontWeight: '500' }}>Bạn không thể thay đổi tiến độ nữa.</Text>
                                    </View>

                                    {reportImage && (
                                        <View>
                                            <Text style={styles.detailSectionTitle}>Ảnh minh chứng đã nộp:</Text>
                                            <View style={styles.previewImageContainer}>
                                                <Image source={{ uri: reportImage.uri }} style={styles.previewImage} />
                                            </View>
                                        </View>
                                    )}
                                </View>

                                /* 3. NẾU ĐANG LÀM THÌ HIỂN THỊ CHỌN TIẾN ĐỘ VÀ CHO SỬA */
                            ) : (
                                <View>
                                    <Text style={styles.detailSectionTitle}>Cập nhật tiến độ (%):</Text>
                                    <View style={styles.progressBtnRow}>
                                        {[25, 50, 75, 100].map(pct => (
                                            <TouchableOpacity
                                                key={pct}
                                                style={[styles.progressBtn, reportProgress === pct && styles.progressBtnActive]}
                                                onPress={() => setReportProgress(pct)}
                                            >
                                                <Text style={[styles.progressBtnText, reportProgress === pct && styles.progressBtnTextActive]}>{pct}%</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {/* MINH CHỨNG HÌNH ẢNH */}
                                    <Text style={[styles.detailSectionTitle, { marginTop: 20 }]}>Ảnh minh chứng (Bắt buộc nếu 100%):</Text>
                                    <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                                        <Camera size={20} color="#6345E5" />
                                        <Text style={styles.imagePickerText}>{reportImage ? 'Thay đổi ảnh khác' : 'Chụp/Chọn ảnh minh chứng'}</Text>
                                    </TouchableOpacity>

                                    {reportImage && (
                                        <View style={styles.previewImageContainer}>
                                            <Image source={{ uri: reportImage.uri }} style={styles.previewImage} />
                                            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setReportImage(null)}>
                                                <X size={14} color="#FFF" />
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {/* NÚT GỬI BÁO CÁO */}
                                    <TouchableOpacity
                                        style={[styles.submitReportBtn, reportProgress === 100 && { backgroundColor: '#059669' }, isUpdating && { opacity: 0.7 }]}
                                        onPress={submitReport}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? <ActivityIndicator color="#FFF" /> : (
                                            <Text style={styles.submitReportText}>
                                                {reportProgress === 100 ? 'Hoàn thành công việc' : 'Gửi tiến độ'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* MODAL LỊCH CHO iOS */}
            {showDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal transparent animationType="slide">
                        <View style={styles.iosPickerOverlay}>
                            <View style={styles.iosPickerContainer}>
                                <View style={styles.iosPickerHeader}>
                                    <TouchableOpacity onPress={() => setShowDatePicker(false)}><Text style={styles.iosCancelText}>Hủy</Text></TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setCustomDate(tempDate); setFilterDate('CUSTOM'); setShowDatePicker(false); }}>
                                        <Text style={styles.iosDoneText}>Xong</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker value={tempDate} mode="date" display="spinner" onChange={(e, date) => date && setTempDate(date)} />
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <DateTimePicker value={customDate} mode="date" display="default" onChange={onAndroidDateChange} />
                )
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F4FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 16, backgroundColor: '#FFF' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#2A2640' },
    headerSub: { fontSize: 13, color: '#8B8B9B', marginTop: 4, fontWeight: '500' },

    dateFilterContainer: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
    dateChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F9F9FC', borderWidth: 1, borderColor: '#EAEAF2' },
    dateChipActive: { backgroundColor: '#6345E5', borderColor: '#6345E5' },
    dateChipText: { fontSize: 12, color: '#8B8B9B', fontWeight: '600' },
    dateChipTextActive: { color: '#FFF' },

    filterContainer: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 10, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: '#6345E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 10 },
    filterTab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    filterLabel: { fontSize: 12, color: '#A0A0B5', fontWeight: '600' },

    taskList: { padding: 20 },
    taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 24, marginBottom: 14, shadowColor: '#6345E5', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
    taskInfo: { flex: 1, marginRight: 12 },
    taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    taskTitle: { fontSize: 16, fontWeight: '800', color: '#2A2640', flex: 1, paddingRight: 10 },
    taskDesc: { fontSize: 13, color: '#8B8B9B', marginBottom: 14, lineHeight: 20 },
    taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    deadlineBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    deadlineText: { fontSize: 11, color: '#8B8B9B', fontWeight: '600' },
    progressBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    progressText: { fontSize: 11, fontWeight: '800' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyIconWrap: { backgroundColor: '#EAEAF2', padding: 20, borderRadius: 40, marginBottom: 16 },
    emptyText: { color: '#8B8B9B', fontSize: 14, fontWeight: '500' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(42, 38, 64, 0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, paddingBottom: Platform.OS === 'ios' ? 45 : 30 },
    modalHeaderIndicator: { width: 50, height: 5, backgroundColor: '#EAEAF2', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTopTitle: { fontSize: 18, fontWeight: '800', color: '#2A2640' },
    closeBtn: { padding: 6, backgroundColor: '#F9F9FC', borderRadius: 20 },
    detailTitle: { fontSize: 20, fontWeight: '800', color: '#2A2640', marginBottom: 12, lineHeight: 28 },
    detailMetaRow: { flexDirection: 'row', gap: 20, marginBottom: 10 },
    detailMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailMetaText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    detailSectionTitle: { fontSize: 13, color: '#8B8B9B', fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
    divider: { height: 1, backgroundColor: '#EAEAF2', marginVertical: 15 },

    progressBtnRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    progressBtn: { flex: 1, paddingVertical: 12, marginHorizontal: 3, borderRadius: 12, backgroundColor: '#F0F0F5', alignItems: 'center' },
    progressBtnActive: { backgroundColor: '#6345E5' },
    progressBtnText: { fontSize: 13, fontWeight: '700', color: '#8B8B9B' },
    progressBtnTextActive: { color: '#FFF' },

    imagePickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, backgroundColor: '#6345E515', borderStyle: 'dashed', borderWidth: 1, borderColor: '#6345E5', marginBottom: 20 },
    imagePickerText: { fontSize: 14, fontWeight: '700', color: '#6345E5' },

    previewImageContainer: { position: 'relative', marginBottom: 20, alignSelf: 'center' },
    previewImage: { width: 200, height: 150, borderRadius: 16 },
    removeImageBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: '#EF4444', padding: 6, borderRadius: 15, borderWidth: 2, borderColor: '#FFF' },

    submitReportBtn: { backgroundColor: '#6345E5', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 10 },
    submitReportText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

    overdueBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#FECACA' },
    overdueText: { color: '#EF4444', fontSize: 10, fontWeight: '900' },

    iosPickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    iosPickerContainer: { backgroundColor: '#FFF', paddingBottom: 30, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    iosPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#EAEAF2' },
    iosCancelText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
    iosDoneText: { color: '#6345E5', fontSize: 16, fontWeight: '700' },
});