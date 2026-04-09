import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import { getDistance } from 'geolib';
import {
  Activity,
  Bell,
  Briefcase,
  Calendar,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Headset,
  MapPin,
  UserCircle
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE } from '../../constants/Config';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

interface UserInfo {
  id?: string;
  _id?: string;
  name: string;
  position?: string;
  dept?: string;
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
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLeaveToday, setIsLeaveToday] = useState(false);

  const [stats, setStats] = useState({
    monthlyAttendance: '0/0',
    todayHours: '0h 00m',
    leaveRemaining: '0',
    status: 'Ngoại tuyến'
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [selectedStat, setSelectedStat] = useState<{ title: string, detail: string } | null>(null);

  const fetchUnreadCount = async (userId: string) => {
    if (!userId || userId === "ADMIN_ID" || userId.length < 5) return;
    try {
      const res = await axios.get(`${API_BASE}/notifications/user/${userId}`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (Array.isArray(res.data)) setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
    } catch (err: any) { console.log("Lỗi fetch thông báo:", err.message); }
  };

  const calculateStats = (allAttendance: any[], userId: string) => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const todayStr = today.toLocaleDateString('vi-VN');

    const monthlyLogs = allAttendance.filter(item => {
      const d = new Date(item.createdAt);
      const uid = item.userId?._id ? String(item.userId._id) : String(item.userId);
      return d.getMonth() === month && d.getFullYear() === year && uid === userId;
    });

    const uniqueDays = new Set(monthlyLogs.map(l => new Date(l.createdAt).toLocaleDateString('vi-VN'))).size;
    const workingDays = new Date(year, month + 1, 0).getDate();

    const todayLogsForUser = monthlyLogs.filter(l => new Date(l.createdAt).toLocaleDateString('vi-VN') === todayStr);
    let totalMs = 0;
    todayLogsForUser.forEach(log => {
      if (log.checkInTime && log.checkOutTime) {
        totalMs += new Date(log.checkOutTime).getTime() - new Date(log.checkInTime).getTime();
      } else if (log.checkInTime && !log.checkOutTime) {
        totalMs += today.getTime() - new Date(log.checkInTime).getTime();
      }
    });

    const hours = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);

    setStats(prev => ({
      ...prev,
      monthlyAttendance: `${uniqueDays}/${workingDays}`,
      todayHours: `${hours}h ${mins}p`,
      status: todayLogsForUser.some(l => !l.checkOutTime) ? 'Đang làm' : 'Đang nghỉ'
    }));
  };

  const fetchOnlyData = async (user = currentUser) => {
    try {
      const userIdToFilter = user?._id || user?.id;
      if (!userIdToFilter || userIdToFilter === "ADMIN_ID") return;
      const res = await axios.get(`${API_BASE}/attendance`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      calculateStats(res.data, String(userIdToFilter));

      const myAllLogs = res.data.filter((item: any) => {
        const recordUserId = item.userId?._id ? String(item.userId._id) : String(item.userId);
        return recordUserId === String(userIdToFilter);
      });

      const todayStr = new Date().toLocaleDateString('vi-VN');
      const myLogs = myAllLogs.filter((item: any) => new Date(item.createdAt).toLocaleDateString('vi-VN') === todayStr);
      setTodayLogs(myLogs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));

      const sortedDesc = [...myAllLogs].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentLogs(sortedDesc.slice(0, 6));
    } catch (error: any) { console.log("Lỗi fetch dữ liệu:", error.message); }
  };

  const fetchLeaveStatus = async (userId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/leaves/user/${userId}`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      const todayStr = new Date().toLocaleDateString('vi-VN');
      const hasApprovedLeave = res.data.some((leave: any) => leave.status === 'APPROVED' && leave.startDate === todayStr);
      setIsLeaveToday(hasApprovedLeave);
      setStats(prev => ({ ...prev, leaveRemaining: '12' }));
    } catch (error: any) { console.log("Lỗi fetch phép:", error.message); }
  };

  const checkStatus = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('currentUser');
      let parsedUser = currentUser;
      if (userData) {
        parsedUser = JSON.parse(userData);
        setCurrentUser(parsedUser);
      }

      const realUserId = parsedUser._id || parsedUser.id;

      const [configRes] = await Promise.all([
        axios.get(`${API_BASE}/config`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
        realUserId ? fetchOnlyData(parsedUser) : Promise.resolve(),
        realUserId ? fetchUnreadCount(realUserId) : Promise.resolve(),
        realUserId ? fetchLeaveStatus(realUserId) : Promise.resolve()
      ]);

      if (configRes?.data) setOfficeConfig(configRes.data);

      setTimeout(async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setDistance(getDistance(
            { latitude: location.coords.latitude, longitude: location.coords.longitude },
            { latitude: configRes.data.latitude, longitude: configRes.data.longitude }
          ));
        }
      }, 500);

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

  const StatCard = ({ title, value, sub, icon: Icon, color, onPress }: any) => (
    <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.statCardHeader}>
        <Text style={styles.statCardTitle}>{title}</Text>
        <View style={[styles.statIconBox, { backgroundColor: `${color}15` }]}>
          <Icon size={18} color={color} />
        </View>
      </View>
      <Text style={styles.statCardValue}>{value}</Text>
      <Text style={styles.statCardSub}>{sub}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* WHITE TOP BAR */}
      <View style={[styles.whiteTopBar, { paddingTop: insets.top }]}>
        <View style={styles.topRowInner}>
          <View style={styles.brand}>
            <Image source={require('../../assets/images/icon.png')} style={{ width: 28, height: 28, borderRadius: 6 }} />
            <Text style={styles.brandTitleDark}>HRM PRO</Text>
          </View>
          <TouchableOpacity style={styles.notifBtnLight} onPress={() => router.push('/notifications')}>
            <Bell size={22} color="#6345E5" />
            {unreadCount > 0 && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* GRADIENT HEADER */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={['#6345E5', '#3F2B96']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* USER INFO */}
          <View style={styles.userRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Xin chào 👋</Text>
              <Text style={styles.userNameHeader}>{currentUser.name || "Nhân viên"}</Text>
              <View style={styles.locBadge}>
                <MapPin size={12} color="#FFF" />
                <Text style={styles.locText}>Khu vực: {isStrictlyAtOffice ? "Văn phòng" : "Từ xa"}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.avatarBig} onPress={() => router.push('/(tabs)/profile')}>
              <UserCircle size={48} color="rgba(255,255,255,1)" />
            </TouchableOpacity>
          </View>

          {/* PRIMARY ATTENDANCE CARD */}
          <View style={styles.attendanceBox}>
            <View style={[styles.attendanceInfo, (isMaxTurnsReached || isLeaveToday) && { alignItems: 'center' }]}>
              <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6 }, (isMaxTurnsReached || isLeaveToday) && { justifyContent: 'center' }]}>
                <Clock size={16} color="#8B8B9B" />
                <Text style={[styles.attendanceLabel, (isMaxTurnsReached || isLeaveToday) && { textAlign: 'center' }]}>
                  {isLeaveToday ? "ĐANG NGHỈ PHÉP" : (isMaxTurnsReached ? "ĐÃ HOÀN THÀNH ĐIỂM DANH" : "ĐIỂM DANH HÔM NAY")}
                </Text>
              </View>
              <Text style={[styles.attendanceTimeText, (isMaxTurnsReached || isLeaveToday) && { textAlign: 'center', marginTop: 10 }]}>{currentTime}</Text>
              <Text style={[styles.attendanceDateText, (isMaxTurnsReached || isLeaveToday) && { textAlign: 'center' }]}>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}</Text>
            </View>
            {!(isMaxTurnsReached || isLeaveToday) && (
              <>
                <View style={styles.vDivider} />
                <View style={styles.attendanceBtnWrapper}>
                  <TouchableOpacity
                    style={[styles.checkBtn, ongoingSession && styles.checkBtnActive]}
                    onPress={() => ongoingSession ? handlePress('RA') : handlePress('VÀO')}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator size="small" color="#6345E5" /> : (
                      <Text style={[styles.checkBtnText, ongoingSession && { color: '#EF4444' }]}>
                        {ongoingSession ? "RA CA" : "VÀO CA"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </LinearGradient>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>

        {/* STATS GRID */}
        <View style={styles.statsLayout}>
          <StatCard
            title="Đ.danh tháng"
            value={stats.monthlyAttendance}
            sub="Xem chi tiết"
            icon={Calendar}
            color="#6345E5"
            onPress={() => router.push('/history')}
          />
          <StatCard
            title="Giờ hôm nay"
            value={stats.todayHours}
            sub="Xem lịch sử"
            icon={Clock}
            color="#10B981"
            onPress={() => router.push('/history')}
          />
          <StatCard
            title="Phép còn lại"
            value={stats.leaveRemaining}
            sub="Tạo đơn mới"
            icon={Briefcase}
            color="#F59E0B"
            onPress={() => router.push('/leave-request')}
          />
          <StatCard
            title="Khoảng cách"
            value={distance > 1000 ? `${(distance / 1000).toFixed(1)}km` : `${distance}m`}
            sub="Độ chính xác cao"
            icon={MapPin}
            color="#EF4444"
            onPress={() => setSelectedStat({ title: "Định vị GPS", detail: `Bạn đang ở cách văn phòng khoảng ${distance}m. ${isStrictlyAtOffice ? 'Đủ điều kiện điểm danh.' : 'Vui lòng ghi rõ lý do nếu điểm danh từ xa.'}` })}
          />
        </View>

        {/* QUICK SHORTCUTS */}
        <Text style={styles.sectionHeader}>Tiện ích nhanh</Text>
        <View style={styles.shortcutRow}>
          {[
            { icon: ClipboardList, label: "Xin nghỉ", color: "#10B981", route: "/leave-request" },
            { icon: CircleDollarSign, label: "Bảng lương", color: "#6345E5", route: "/payroll" },
            { icon: Activity, label: "Nhiệm vụ", color: "#F59E0B", route: "/tasks" },
            { icon: Headset, label: "Hỗ trợ", color: "#4338CA", route: "/chat" },
          ].map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.shortcutItem} onPress={() => router.push(item.route as any)}>
              <View style={[styles.shortcutIcon, { backgroundColor: `${item.color}15` }]}>
                <item.icon size={24} color={item.color} />
              </View>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RECENT HISTORY */}
        <View style={styles.historyHeaderRow}>
          <Text style={styles.sectionHeader}>Hoạt động gần đây</Text>
          <TouchableOpacity onPress={() => router.push('/history')}>
            <Text style={styles.seeMore}>Tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentList}>
          {recentLogs.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyMsg}>Chưa có dữ liệu hoạt động</Text></View>
          ) : recentLogs.map((log, index) => {
            const rawType = String(log.type || log.locationType || "").toUpperCase().trim();
            const isOffice = rawType === 'OFFICE';

            let totalHoursText = "0p";
            if (log.checkInTime && log.checkOutTime) {
              const inTime = new Date(log.checkInTime).getTime();
              const outTime = new Date(log.checkOutTime).getTime();
              const diffMs = outTime - inTime;
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

              if (diffHours > 0) {
                totalHoursText = `${diffHours}h ${diffMinutes}p`;
              } else {
                totalHoursText = `${diffMinutes}p`;
              }
            }

            const dateObj = new Date(log.createdAt);
            const dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

            let timeStr = "Đang làm...";
            if (log.checkInTime) {
              const inTime = new Date(log.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              if (log.checkOutTime) {
                const outTime = new Date(log.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                timeStr = `${inTime} - ${outTime}`;
              } else {
                timeStr = `${inTime} - ...`;
              }
            }

            const isHighlight = index === 0;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.logRow,
                  index === 0 && styles.firstRow,
                  index === recentLogs.length - 1 && styles.lastRow,
                  recentLogs.length === 1 && styles.singleRow
                ]}
                onPress={() => setSelectedLog(log)}
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
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* STAT MODAL */}
      <Modal visible={!!selectedStat} transparent animationType="fade" onRequestClose={() => setSelectedStat(null)}>
        <View style={styles.overlayCenter}>
          <View style={styles.popupBox}>
            <Text style={styles.popupTitle}>{selectedStat?.title}</Text>
            <Text style={styles.popupBody}>{selectedStat?.detail}</Text>
            <TouchableOpacity onPress={() => setSelectedStat(null)} style={styles.popupClose}>
              <Text style={styles.popupCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* REMAINDING MODALS (CLEANED UP) */}
      <Modal visible={!!selectedLog} transparent animationType="slide" onRequestClose={() => setSelectedLog(null)}>
        <View style={styles.overlayBottom}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedLog(null)} />
          <View style={styles.popupSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Chi tiết điểm danh</Text>
            {selectedLog && (
              <View style={{ marginTop: 20 }}>
                <View style={styles.detailItem}><Text style={styles.dL}>Thời gian:</Text><Text style={styles.dV}>{new Date(selectedLog.checkInTime || selectedLog.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {selectedLog.checkOutTime ? new Date(selectedLog.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '...'}</Text></View>
                <View style={styles.detailItem}><Text style={styles.dL}>Trạng thái:</Text><Text style={[styles.dV, { color: selectedLog.status === 'APPROVED' ? '#10B981' : '#F59E0B' }]}>{selectedLog.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}</Text></View>
                <View style={styles.hLine} />
                <Text style={styles.detailSub}>Lời nhắn của bạn:</Text>
                <View style={styles.noteCard}><Text style={styles.noteT}>{selectedLog.note || "Hệ thống tự động"}</Text></View>
              </View>
            )}
            <TouchableOpacity onPress={() => setSelectedLog(null)} style={styles.fullBtn}><Text style={styles.fullBtnT}>Đóng</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlayBottom}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView behavior="padding">
            <View style={styles.popupSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Làm việc từ xa</Text>
              <Text style={styles.sheetDesc}>Bạn đang ở ngoài văn phòng. Hãy ghi chú lý do của bạn bên dưới:</Text>
              <TextInput
                style={styles.sheetInput}
                multiline
                value={reason}
                onChangeText={setReason}
                placeholder="Lý do đi công tác, gặp đối tác..."
                placeholderTextColor="#A0A0B5"
              />
              <View style={styles.sheetActions}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.sBtn}><Text style={styles.sBtnT}>Bỏ qua</Text></TouchableOpacity>
                <TouchableOpacity
                  onPress={() => submitAttendance(actionType, 'REMOTE', reason, 'PENDING', distance)}
                  style={styles.pBtn}
                  disabled={!reason.trim()}
                >
                  <Text style={styles.pBtnT}>Gửi yêu cầu</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  whiteTopBar: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  topRowInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 50 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandTitleDark: { color: '#1E293B', fontSize: 18, fontWeight: '900' },
  notifBtnLight: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  headerWrapper: { backgroundColor: '#6345E5', borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10 },
  unreadDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFF' },

  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
  userNameHeader: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 4 },
  locBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 8, gap: 4 },
  locText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  avatarBig: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: '100%', height: '100%' },

  attendanceBox: { backgroundColor: '#FFF', borderRadius: 28, padding: 22, flexDirection: 'row', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10 },
  attendanceInfo: { flex: 1 },
  attendanceLabel: { color: '#8B8B9B', fontSize: 11, fontWeight: '800' },
  attendanceTimeText: { color: '#2A2640', fontSize: 32, fontWeight: '900' },
  attendanceDateText: { color: '#8B8B9B', fontSize: 13, marginTop: 2 },
  vDivider: { width: 1, height: 50, backgroundColor: '#F1F5F9', marginHorizontal: 15 },
  attendanceBtnWrapper: { alignItems: 'center' },
  checkBtn: { paddingHorizontal: 18, height: 44, borderRadius: 15, borderWidth: 1.5, borderColor: '#6345E5', justifyContent: 'center' },
  checkBtnActive: { borderColor: '#EF4444' },
  checkBtnDisabled: { borderColor: '#EAEAF2' },
  checkBtnText: { color: '#6345E5', fontWeight: '900', fontSize: 13 },

  scrollBody: { paddingHorizontal: 20, paddingTop: 25 },
  statsLayout: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 25 },
  statCard: { width: CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 24, padding: 18, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statCardTitle: { fontSize: 12, color: '#8B8B9B', fontWeight: '600' },
  statIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statCardValue: { fontSize: 18, fontWeight: '900', color: '#2A2640' },
  statCardSub: { fontSize: 11, color: '#10B981', fontWeight: '700', marginTop: 4 },

  sectionHeader: { fontSize: 17, fontWeight: '800', color: '#2A2640', marginBottom: 15 },
  shortcutRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  shortcutItem: { alignItems: 'center', gap: 8 },
  shortcutIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  shortcutLabel: { fontSize: 12, fontWeight: '700', color: '#4A4A65' },

  historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeMore: { color: '#6345E5', fontWeight: '700', fontSize: 13 },
  recentList: { marginTop: 10 },

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

  emptyCard: { padding: 40, alignItems: 'center' },
  emptyMsg: { color: '#C1C1D6', fontSize: 13 },

  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  popupBox: { backgroundColor: '#FFF', borderRadius: 24, padding: 25, width: '100%' },
  popupTitle: { fontSize: 18, fontWeight: '900', color: '#2A2640', marginBottom: 10 },
  popupBody: { fontSize: 14, color: '#4A4A65', lineHeight: 20, marginBottom: 20 },
  popupClose: { backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 15, alignItems: 'center' },
  popupCloseText: { color: '#6345E5', fontWeight: '700' },

  popupSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 5, backgroundColor: '#EAEAF2', borderRadius: 4, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#2A2640' },
  sheetDesc: { fontSize: 14, color: '#8B8B9B', marginTop: 10, marginBottom: 20 },
  sheetInput: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 18, height: 120, fontSize: 15, color: '#2A2640', borderWidth: 1, borderColor: '#F1F5F9', textAlignVertical: 'top' },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 25 },
  sBtn: { flex: 1, height: 52, borderRadius: 15, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  sBtnT: { color: '#8B8B9B', fontWeight: '700' },
  pBtn: { flex: 2, height: 52, borderRadius: 15, backgroundColor: '#6345E5', justifyContent: 'center', alignItems: 'center' },
  pBtnT: { color: '#FFF', fontWeight: '800' },

  detailItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dL: { color: '#8B8B9B', fontSize: 14 },
  dV: { color: '#2A2640', fontWeight: '700', fontSize: 14 },
  hLine: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },
  detailSub: { color: '#8B8B9B', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  noteCard: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 12 },
  noteT: { fontSize: 14, color: '#4A465B' },
  fullBtn: { backgroundColor: '#F1F5F9', height: 52, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  fullBtnT: { color: '#6345E5', fontWeight: '700' },
});