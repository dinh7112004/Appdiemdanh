import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { getDistance } from 'geolib';
import { AlertCircle, Bell, CheckCircle2, ChevronRight, Clock, History, LogIn, LogOut, MapPin, MessageSquare, UserCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE } from '../../constants/Config';
const { width } = Dimensions.get('window');

interface UserInfo {
  id?: string;
  _id?: string;
  name: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState(999999);
  const [currentTime, setCurrentTime] = useState('--:--');
  const [currentUser, setCurrentUser] = useState<UserInfo>({ id: "", name: "Nhân viên" });
  const [officeConfig, setOfficeConfig] = useState({ latitude: 20.9965, longitude: 105.7398, radius: 100 });
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [isLeaveToday, setIsLeaveToday] = useState(false);

  // States cho Form Xin phép
  const [modalVisible, setModalVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState('');

  // State cho Popup Chi tiết lịch sử
  const [selectedLog, setSelectedLog] = useState<any>(null);



  const fetchUnreadCount = async (userId: string) => {
    if (!userId || userId === "ADMIN_ID" || userId.length < 5) return;
    try {
      const res = await axios.get(`${API_BASE}/notifications/user/${userId}`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (Array.isArray(res.data)) setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
    } catch (err: any) { console.log("Lỗi fetch thông báo:", err.message); }
  };

  const fetchOnlyData = async (user = currentUser) => {
    try {
      const userIdToFilter = user?._id || user?.id;
      if (!userIdToFilter || userIdToFilter === "ADMIN_ID") return;
      const res = await axios.get(`${API_BASE}/attendance`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      const todayStr = new Date().toLocaleDateString('vi-VN');
      const myLogs = res.data.filter((item: any) => {
        const recordUserId = item.userId?._id ? String(item.userId._id) : String(item.userId);
        return recordUserId === String(userIdToFilter) && new Date(item.createdAt).toLocaleDateString('vi-VN') === todayStr;
      });
      setTodayLogs(myLogs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    } catch (error: any) { console.log("Lỗi fetch dữ liệu:", error.message); }
  };

  const fetchLeaveStatus = async (userId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/leaves/user/${userId}`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      const todayStr = new Date().toLocaleDateString('vi-VN');
      const hasApprovedLeave = res.data.some((leave: any) => leave.status === 'APPROVED' && leave.startDate === todayStr);
      setIsLeaveToday(hasApprovedLeave);
    } catch (error: any) { console.log("Lỗi fetch phép:", error.message); }
  };

  const checkStatus = async () => {
    try {
      setLoading(true);
      // 1. Lấy user từ máy trước (Nhanh)
      const userData = await AsyncStorage.getItem('currentUser');
      let parsedUser = currentUser;
      if (userData) {
        parsedUser = JSON.parse(userData);
        setCurrentUser(parsedUser);
      }

      const realUserId = parsedUser._id || parsedUser.id;

      // 2. Gọi API lấy data trước (Không đợi Location)
      const [configRes] = await Promise.all([
        axios.get(`${API_BASE}/config`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
        realUserId ? fetchOnlyData(parsedUser) : Promise.resolve(),
        realUserId ? fetchUnreadCount(realUserId) : Promise.resolve(),
        realUserId ? fetchLeaveStatus(realUserId) : Promise.resolve()
      ]);

      if (configRes?.data) setOfficeConfig(configRes.data);

      // 3. Cuối cùng mới lấy tọa độ (Android rất kỵ việc này chạy chung với API)
      setTimeout(async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Dùng Balanced nhưng giới thiệu thêm timeout cho tọa độ
          let location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setDistance(getDistance(
            { latitude: location.coords.latitude, longitude: location.coords.longitude },
            { latitude: configRes.data.latitude, longitude: configRes.data.longitude }
          ));
        }
      }, 500); // Delay 0.5s để API load xong đã

    } catch (err: any) {
      console.log("Lỗi checkStatus:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })), 1000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(useCallback(() => { checkStatus(); }, []));

  const ongoingSession = todayLogs.find(log => !log.checkOutTime);
  const isMaxTurnsReached = todayLogs.length >= 2 && !ongoingSession;
  const isStrictlyAtOffice = distance <= officeConfig.radius;

  const handlePress = async (action: string) => {
    if (action === 'VÀO') {
      if (isLeaveToday) return Alert.alert("Thông báo", "Hôm nay bạn đã được duyệt nghỉ phép.");
      if (ongoingSession) return Alert.alert("Thông báo", "Bạn đang trong ca làm việc.");
      if (todayLogs.length >= 2) return Alert.alert("Hết lượt", "Đã hoàn thành 2 lượt điểm danh hôm nay.");
    }
    setActionType(action);
    setLoading(true);
    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const currentDist = getDistance(
        { latitude: location.coords.latitude, longitude: location.coords.longitude },
        { latitude: officeConfig.latitude, longitude: officeConfig.longitude }
      );
      if (action === 'VÀO' && currentDist > officeConfig.radius) {
        setLoading(false);
        setModalVisible(true);
      } else {
        submitAttendance(action, currentDist <= officeConfig.radius ? 'OFFICE' : 'REMOTE', action === 'VÀO' ? 'Tại văn phòng' : 'Kết thúc ca', 'APPROVED', currentDist, location.coords.latitude, location.coords.longitude);
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert("Lỗi", "Không thể xác định vị trí. Vui lòng thử lại.");
    }
  };

  const submitAttendance = async (action: string, loc: string, reqNote: string, status: string, dist: number, lat?: number, lon?: number) => {
    try {
      const payload = {
        userId: currentUser?._id || currentUser?.id, distance: dist, type: loc, locationType: loc,
        note: reqNote, status, latitude: lat, longitude: lon
      };
      if (action === 'VÀO') {
        await axios.post(`${API_BASE}/attendance/checkin`, payload, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      } else {
        await axios.post(`${API_BASE}/attendance/checkout`, { ...payload, recordId: ongoingSession?._id || ongoingSession?.id }, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      }
      Alert.alert("Thành công", `Đã ${action} CA thành công!`);
      setModalVisible(false);
      setReason('');
      fetchOnlyData();
    } catch (e: any) { Alert.alert("Lỗi", e.response?.data?.message || "Lỗi kết nối Server"); } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HEADER TỪ BẢN THIẾT KẾ MỚI */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <View style={styles.header}>
          <View style={styles.userSection}>
            <View style={styles.avatarShadow}>
              <UserCircle size={46} color="#FFF" />
            </View>
            <View style={{ marginLeft: 14 }}>
              <Text style={styles.welcomeText}>Xin chào,</Text>
              <Text style={styles.userName}>{currentUser.name}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.refreshCircle} onPress={() => router.push('/notifications')}>
            <Bell size={22} color="#FFF" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.clockCardWrapper}>
          <LinearGradient colors={['#9A83F5', '#6345E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.clockCard}>
            <View style={styles.clockHeader}>
              <Clock color="rgba(255,255,255,0.8)" size={16} />
              <Text style={styles.dateLabel}>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            </View>
            <Text style={styles.bigTime}>{currentTime}</Text>
            <View style={[styles.statusBadge, { backgroundColor: isStrictlyAtOffice ? 'rgba(255, 255, 255, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
              <MapPin size={14} color="#FFF" />
              <Text style={styles.statusText}>
                {isStrictlyAtOffice ? "Tại văn phòng" : `Ngoài văn phòng `}
              </Text>
            </View>
          </LinearGradient>
        </View>
      </View>

      <View style={styles.mainContent}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* NÚT BẤM CA LÀM MƯỢT MÀ */}
          <View style={styles.grid}>
            <TouchableOpacity
              style={[styles.mainBtn, (ongoingSession || isMaxTurnsReached || isLeaveToday) && styles.btnDisabled]}
              onPress={() => handlePress('VÀO')}
              disabled={loading || !!ongoingSession || isMaxTurnsReached || isLeaveToday}
            >
              <LinearGradient colors={ongoingSession || isMaxTurnsReached || isLeaveToday ? ['#F5F5FA', '#EAEAF2'] : ['#9A83F5', '#6345E5']} style={styles.btnGradient}>
                {loading && actionType === 'VÀO' ? <ActivityIndicator color="#6345E5" /> : <LogIn color={ongoingSession || isMaxTurnsReached || isLeaveToday ? "#A0A0B5" : "#fff"} size={32} />}
                <Text style={[styles.btnText, (ongoingSession || isMaxTurnsReached || isLeaveToday) && { color: '#A0A0B5' }]}>
                  {isLeaveToday ? 'ĐANG NGHỈ PHÉP' : 'VÀO CA'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainBtn, !ongoingSession && styles.btnDisabled]}
              onPress={() => handlePress('RA')}
              disabled={loading || !ongoingSession}
            >
              <LinearGradient colors={!ongoingSession ? ['#F5F5FA', '#EAEAF2'] : ['#9A83F5', '#6345E5']} style={styles.btnGradient}>
                {loading && actionType === 'RA' ? <ActivityIndicator color="#6345E5" /> : <LogOut color={!ongoingSession ? "#A0A0B5" : "#fff"} size={32} />}
                <Text style={[styles.btnText, !ongoingSession && { color: '#A0A0B5' }]}>RA CA</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* BOX LỊCH SỬ CHẤM CÔNG CÓ THỂ BẤM VÀO */}
          <View style={styles.historyBox}>
            <View style={styles.historyHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <History size={20} color="#2A2640" />
                <Text style={styles.historyTitle}>Lịch sử điểm danh</Text>
              </View>
              <Text style={styles.historySubtitle}>{todayLogs.length}/2 lượt</Text>
            </View>

            {todayLogs.length === 0 ? (
              <View style={styles.emptyState}><Text style={styles.emptyText}>Bạn chưa điểm danh hôm nay</Text></View>
            ) : (
              todayLogs.map((log, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.logItem}
                  activeOpacity={0.7}
                  onPress={() => setSelectedLog(log)} // MỞ CHI TIẾT
                >
                  <View style={[styles.logIndicator, { backgroundColor: log.status === 'APPROVED' ? '#6345E5' : '#F59E0B' }]} />
                  <View style={{ flex: 1, paddingLeft: 14 }}>
                    <Text style={styles.logTime}>
                      {new Date(log.checkInTime || log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Đang làm...'}
                    </Text>
                    <Text style={styles.logNote} numberOfLines={1}>{log.note || 'Tại văn phòng'}</Text>
                  </View>
                  <View style={styles.logActionWrap}>
                    <View style={[styles.statusPill, { backgroundColor: log.status === 'APPROVED' ? '#F0EDFD' : 'rgba(245, 158, 11, 0.1)' }]}>
                      <Text style={[styles.statusPillText, { color: log.status === 'APPROVED' ? '#6345E5' : '#D97706' }]}>
                        {log.status === 'APPROVED' ? 'Xong' : 'Chờ'}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#C1C1D6" style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {/* --------------------------------------------------------- */}
      {/* POPUP CHI TIẾT LỊCH SỬ (XEM LỜI NHẮN) */}
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

                {/* Phần Lời nhắn của Sếp (adminNote hoặc managerNote) */}
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

      {/* POPUP XIN LÀM TỪ XA CŨ */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIndicator} />
            <Text style={styles.modalTitle}>Làm việc từ xa</Text>
            <Text style={styles.modalSub}>Vui lòng cung cấp lý do để quản lý phê duyệt.</Text>
            <TextInput style={styles.modalInput} multiline value={reason} onChangeText={setReason} placeholder="Ví dụ: Đi gặp khách hàng..." />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setModalVisible(false); setLoading(false); }} style={styles.cancelBtn}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setLoading(true); submitAttendance(actionType, 'REMOTE', reason, 'PENDING', distance); }} style={styles.confirmBtn}>
                <LinearGradient colors={['#9A83F5', '#6345E5']} style={styles.confirmGradient}><Text style={styles.confirmText}>Gửi yêu cầu</Text></LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4FA' },
  headerContainer: { backgroundColor: '#6345E5', paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  userSection: { flexDirection: 'row', alignItems: 'center' },
  avatarShadow: { padding: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 50 },
  welcomeText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  userName: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 2 },
  refreshCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#EF4444', minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#6345E5' },
  badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  clockCardWrapper: { paddingHorizontal: 24 },
  clockCard: { borderRadius: 30, padding: 30, elevation: 15, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
  clockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  dateLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginLeft: 8, fontWeight: '600' },
  bigTime: { fontSize: 60, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 2 },
  statusBadge: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 30, marginTop: 18 },
  statusText: { fontSize: 12, fontWeight: '700', marginLeft: 6, color: '#fff' },
  mainContent: { flex: 1, backgroundColor: '#F4F4FA', borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 35, paddingBottom: 100 },
  grid: { flexDirection: 'row', gap: 16, marginBottom: 30 },
  mainBtn: { flex: 1, height: 140, borderRadius: 32, overflow: 'hidden', elevation: 8, shadowColor: '#6345E5', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { elevation: 0, shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 12 },
  historyBox: { backgroundColor: '#fff', borderRadius: 30, padding: 24, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  historyTitle: { fontSize: 17, fontWeight: '800', color: '#2A2640', marginLeft: 10 },
  historySubtitle: { fontSize: 13, color: '#8B8B9B', fontWeight: '600' },
  emptyState: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { color: '#A0A0B5', fontSize: 14 },
  logItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, backgroundColor: '#F9F9FC', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F5' },
  logIndicator: { width: 4, height: 35, borderRadius: 4 },
  logTime: { fontSize: 16, fontWeight: '800', color: '#2A2640' },
  logNote: { fontSize: 13, color: '#8B8B9B', marginTop: 6 },
  logActionWrap: { flexDirection: 'row', alignItems: 'center' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontWeight: '800' },

  /* MODAL STYLES CHUNG */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 15, 30, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, paddingBottom: 45 },
  modalHeaderIndicator: { width: 50, height: 5, backgroundColor: '#EAEAF2', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#2A2640', textAlign: 'center' },
  modalSub: { fontSize: 14, color: '#8B8B9B', textAlign: 'center', marginTop: 12, marginBottom: 24 },
  modalInput: { backgroundColor: '#F9F9FC', borderRadius: 18, padding: 20, height: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: '#EAEAF2', fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 16, marginTop: 28 },
  cancelBtn: { flex: 1, paddingVertical: 18, alignItems: 'center', borderRadius: 20, backgroundColor: '#F4F4FA' },
  cancelText: { fontWeight: '700', color: '#8B8B9B', fontSize: 15 },
  confirmBtn: { flex: 2, borderRadius: 20, overflow: 'hidden' },
  confirmGradient: { paddingVertical: 18, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  /* STYLE CHO MODAL CHI TIẾT */
  detailBody: { marginTop: 25 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailLabel: { fontSize: 14, color: '#8B8B9B', fontWeight: '600' },
  detailValueBig: { fontSize: 17, color: '#2A2640', fontWeight: '800' },
  detailValue: { fontSize: 14, color: '#2A2640', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F0F0F5', marginVertical: 16 },
  detailSubtitle: { fontSize: 13, color: '#8B8B9B', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  noteBox: { backgroundColor: '#F9F9FC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F5' },
  noteText: { fontSize: 14, color: '#4A465B', lineHeight: 22 },
});