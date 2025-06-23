import React, { useState, useMemo, useCallback, useEffect, useRef, Suspense, lazy, Component } from 'react';
import {
  LayoutDashboard, Users, LogOut, BookUser, UsersRound as GroupIcon, DollarSign,
  Notebook, ClipboardCheck, UserCircle, History, Menu, X as CloseIcon, UserX,
  LibraryBig, BellDot,
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import LoginForm from './components/Login/LoginForm';
import LoadingSpinner from './components/Essential/LoadingSpinner';
import InAppNotification from './components/Essential/InAppNotification';
import ToastNotification from './components/Essential/ToastNotification';
import { apiRequest } from './utils/api';
import { playNotificationSound } from './services/notificationService';

const LazyDashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const LazyStudentList = lazy(() => import('./components/Student/StudentList'));
const LazyTeacherList = lazy(() => import('./components/Teacher/TeacherList'));
const LazyGroupList = lazy(() => import('./components/Group/GroupList'));
const LazyPaymentList = lazy(() => import('./components/Payment/PaymentList'));
const LazyNoteList = lazy(() => import('./components/Note/NoteList'));
const LazyAttendanceList = lazy(() => import('./components/Attendance/AttendanceList'));
const LazyPaymentHistoryList = lazy(() => import('./components/PaymentHistory/PaymentHistoryList'));
const LazyDebtorStudentsList = lazy(() => import('./components/Student/DebtorStudentsList'));
const LazyCourseList = lazy(() => import('./components/Course/CourseList'));
const LazyApplicationList = lazy(() => import('./components/Application/ApplicationList'));
const LazySalaryList = lazy(() => import('./components/Salary/SalaryList'));

const NOTES_CHECK_INTERVAL = 100000;
const NOTES_FETCH_INTERVAL = 60000;
const NOTES_FETCH_LIMIT = 100;
const APPLICATIONS_CHECK_INTERVAL = 20000;
const APPLICATIONS_FETCH_LIMIT = 5;
const PENDING_APPLICATIONS_COUNT_FETCH_INTERVAL = 60000;

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <p className="text-center text-red-700 text-xl mt-12">Error loading component: {this.state.error.message}</p>;
    }
    return this.props.children;
  }
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [adminName, setAdminName] = useState(localStorage.getItem('admin_name'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const sections = useMemo(() => ({
    dashboard: { label: 'Boshqaruv Paneli', icon: LayoutDashboard, component: LazyDashboard },
    applications: { label: 'Telegram Leadlar', icon: BellDot, component: LazyApplicationList },
    students: { label: 'Talabalar', icon: Users, component: LazyStudentList },
    teachers: { label: "O'qituvchilar", icon: BookUser, component: LazyTeacherList },
    courses: { label: 'Kurslar', icon: LibraryBig, component: LazyCourseList },
    groups: { label: 'Guruhlar', icon: GroupIcon, component: LazyGroupList },
    attendances: { label: 'Davomat', icon: ClipboardCheck, component: LazyAttendanceList },
    notes: { label: 'Eslatmalar', icon: Notebook, component: LazyNoteList },
    payments: { label: "To'lovlar", icon: DollarSign, component: LazyPaymentList },
    paymentHistory: { label: "To'lovlar Tarixi", icon: History, component: LazyPaymentHistoryList },
    debtors: { label: 'Qarzdorlar', icon: UserX, component: LazyDebtorStudentsList },
    salaries: { label: 'Maoshlar', icon: DollarSign, component: LazySalaryList },
  }), []);

  const [activeSection, setActiveSection] = useState(() => {
    const savedSection = localStorage.getItem('active_section_key');
    if (savedSection && sections.hasOwnProperty(savedSection)) {
      return savedSection;
    }
    return 'dashboard';
  });

  const [todaysNotesForNotifications, setTodaysNotesForNotifications] = useState([]);
  const [shownNoteSessionIds, setShownNoteSessionIds] = useState(new Set());
  const noteCheckIntervalRef = useRef(null);
  const noteFetchIntervalRef = useRef(null);

  const [lastApplicationFetchTimestamp, setLastApplicationFetchTimestamp] = useState(() => {
    const initialTimestamp = new Date().toISOString();
    console.log("[INIT] Initializing lastApplicationFetchTimestamp to:", initialTimestamp);
    return initialTimestamp;
  });
  const [shownApplicationSessionIds, setShownApplicationSessionIds] = useState(new Set());
  const applicationCheckIntervalRef = useRef(null);

  const [pendingApplicationBadgeCount, setPendingApplicationBadgeCount] = useState(0);
  const pendingApplicationsCountIntervalRef = useRef(null);

  const [inAppNotification, setInAppNotification] = useState({ data: null });
  const [toast, setToast] = useState({ id: null, message: '', type: 'info', duration: 0, key: 0 });

  useEffect(() => {
    console.log('[App] Active Section:', activeSection);
    console.log('[App] Token:', token);
    if (sections.hasOwnProperty(activeSection)) {
      localStorage.setItem('active_section_key', activeSection);
    } else {
      setActiveSection('dashboard');
      localStorage.setItem('active_section_key', 'dashboard');
    }
  }, [activeSection, sections]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    setToast(prevToast => ({
      id: Date.now(), message, type, duration, key: (prevToast.key || 0) + 1,
    }));
  }, []);

  const handleCloseToast = useCallback((toastId) => {
    setToast(prev => prev.id === toastId ? { ...prev, id: null, message: '' } : prev);
  }, []);

  const fetchTodaysNotesForNotifications = useCallback(async (currentToken) => {
    if (!currentToken) {
      console.log("[NOTES_FETCH] Skipping fetch: No token.");
      return;
    }
    console.log("[NOTES_FETCH] Attempting to fetch notes.");
    try {
      const response = await apiRequest(`/notes?limit=${NOTES_FETCH_LIMIT}&sort_by=time&sort_order=asc`, 'GET', null, currentToken);
      console.log('[NOTES_FETCH] API Response for notes:', JSON.stringify(response.data));
      if (response && Array.isArray(response.data)) {
        const validNotes = response.data.filter(note => note.time && note.callDate);
        setTodaysNotesForNotifications(validNotes);
        console.log(`[NOTES_FETCH] Successfully fetched and set ${validNotes.length} notes for notifications.`);
      } else {
        console.warn("[NOTES_FETCH] API response was not an array or data is missing. Response:", response);
        setTodaysNotesForNotifications([]);
      }
    } catch (err) {
      console.error("[NOTES_FETCH] Fetching Notes ERROR:", err.originalError || err);
    }
  }, []);

  const checkScheduledNoteNotifications = useCallback(() => {
    console.log('[NOTES_CHECK] Running checkScheduledNoteNotifications. Current inAppNotification.data:', JSON.stringify(inAppNotification.data));
    console.log('[NOTES_CHECK] todaysNotesForNotifications:', JSON.stringify(todaysNotesForNotifications));
    if (!todaysNotesForNotifications || todaysNotesForNotifications.length === 0) {
      console.log('[NOTES_CHECK] No notes to check or empty array.');
      return;
    }
    if (inAppNotification.data) {
      console.log('[NOTES_CHECK] Another notification is active, skipping note check. Active notification ID:', inAppNotification.data?.id);
      return;
    }
    const now = new Date();
    const currentTimeLocalHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    console.log(`[NOTES_CHECK] Current local time for comparison: ${currentTimeLocalHHMM}`);

    for (const note of todaysNotesForNotifications) {
      console.log('[NOTES_CHECK_LOOP] Processing note:', JSON.stringify(note));
      if (!note.callDate || typeof note.time !== 'string') {
        console.warn(`[NOTES_CHECK_LOOP] Note ID: ${note.id} is missing callDate or time, or time is not a string.`);
        continue;
      }
      const noteCallDateObj = new Date(note.callDate);
      if (isNaN(noteCallDateObj.getTime())) {
        console.warn(`[NOTES_CHECK_LOOP] Note ID: ${note.id} has invalid callDate: ${note.callDate}`);
        continue;
      }
      const isNoteForToday = noteCallDateObj.getFullYear() === now.getFullYear() &&
                            noteCallDateObj.getMonth() === now.getMonth() &&
                            noteCallDateObj.getDate() === now.getDate();
      const noteTargetTimeHHMM = note.time;
      console.log(`[NOTES_CHECK_LOOP] Note ID: ${note.id}, Raw callDate: ${note.callDate}, Parsed callDate (local to browser): ${noteCallDateObj.toLocaleString()}, Is note for today (local): ${isNoteForToday}, Target HH:MM from note.time: ${noteTargetTimeHHMM}`);

      if (isNoteForToday && noteTargetTimeHHMM === currentTimeLocalHHMM) {
        const callDatePart = note.callDate.split('T')[0];
        const sessionId = `note-${note.id}-${callDatePart}-${noteTargetTimeHHMM}`;
        console.log(`[NOTES_CHECK_LOOP] Time MATCH for Note ID: ${note.id} for today. Session ID: ${sessionId}, Was shown: ${shownNoteSessionIds.has(sessionId)}`);
        if (!shownNoteSessionIds.has(sessionId) && !inAppNotification.data) {
          let fullName = 'Noma\'lum';
          if (note.student && (note.student.firstName || note.student.lastName)) {
            fullName = `${note.student.firstName || ''} ${note.student.lastName || ''}`.trim();
          } else if (note.teacher && (note.teacher.firstName || note.teacher.lastName)) {
            fullName = `${note.teacher.firstName || ''} ${note.teacher.lastName || ''}`.trim();
          } else if (note.fullName) {
            fullName = note.fullName;
          }
          console.log(`[NOTES_CHECK_LOOP] Derived fullName for notification: ${fullName}`);
          const notificationContent = {
            id: sessionId, _internal_type: 'note', title: `Eslatma: ${fullName}`,
            fullName: fullName, time: noteTargetTimeHHMM,
            about: note.content || note.about || 'Mavjud emas',
            phone: note.student?.phoneNumber || note.teacher?.phoneNumber || note.phone || null,
          };
          console.log('[NOTES_CHECK_LOOP] Prepared notificationContent:', JSON.stringify(notificationContent));
          setInAppNotification({ data: notificationContent });
          playNotificationSound();
          setShownNoteSessionIds(prev => new Set(prev).add(sessionId));
          console.log(`[NOTES_CHECK_LOOP] Displayed and marked note ${sessionId} as shown.`);
          break;
        } else if (shownNoteSessionIds.has(sessionId)) {
          console.log(`[NOTES_CHECK_LOOP] Note ${sessionId} was already shown this session.`);
        } else if (inAppNotification.data) {
          console.log(`[NOTES_CHECK_LOOP] Time match for note ${sessionId}, but another notification is already active.`);
        }
      }
    }
  }, [todaysNotesForNotifications, inAppNotification.data, shownNoteSessionIds]);

  const fetchNewApplications = useCallback(async (currentToken) => {
    if (!currentToken) {
      console.log("[APPS_NOTIFY_FETCH] Skipping fetch: No token.");
      return;
    }
    if (inAppNotification.data) {
      console.log("[APPS_NOTIFY_FETCH] Skipping fetch: A notification is already active:", JSON.stringify(inAppNotification.data));
      return;
    }
    const timestampForThisQuery = lastApplicationFetchTimestamp;
    console.log(`[APPS_NOTIFY_FETCH] Preparing to fetch new applications created_after: ${timestampForThisQuery}`);
    const queryParams = new URLSearchParams({
      created_after: timestampForThisQuery, sort_by: 'createdAt', sort_order: 'asc',
      filterByStatus: 'KUTILYABDI', limit: APPLICATIONS_FETCH_LIMIT.toString(),
    });
    const currentRequestAttemptTimestamp = new Date().toISOString();
    try {
      const response = await apiRequest(`/applications?${queryParams.toString()}`, 'GET', null, currentToken);
      let allFetchedApplications = Array.isArray(response.data) ? response.data : [];
      console.log(`[APPS_NOTIFY_FETCH] API Response for created_after=${timestampForThisQuery}:`, JSON.parse(JSON.stringify(allFetchedApplications)));
      const trulyNewApplications = allFetchedApplications.filter(app => 
        new Date(app.createdAt).getTime() > new Date(timestampForThisQuery).getTime()
      );
      if (allFetchedApplications.length > 0 && trulyNewApplications.length === 0) {
        console.warn(`[APPS_NOTIFY_FETCH] API returned ${allFetchedApplications.length} app(s), but NONE were strictly newer than ${timestampForThisQuery}. Backend 'created_after' filter might not be strict '>' or timestamp precision issue.`);
      }
      console.log("[APPS_NOTIFY_FETCH] Truly new applications (after client-side filter):", JSON.parse(JSON.stringify(trulyNewApplications)));
      if (trulyNewApplications.length > 0) {
        trulyNewApplications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        let appToNotify = null;
        for (const app of trulyNewApplications) {
          if (!shownApplicationSessionIds.has(`app-${app.id}`)) {
            appToNotify = app; break;
          }
        }
        if (appToNotify && !inAppNotification.data) {
          console.log("[APPS_NOTIFY_FETCH] New application TO NOTIFY:", JSON.parse(JSON.stringify(appToNotify)));
          const applicantFullName = [appToNotify.firstName, appToNotify.lastName].filter(Boolean).join(' ') || "Noma'lum Arizachi";
          const notificationContent = {
            id: `app-${appToNotify.id}`, _internal_type: 'application',
            applicantFullName: applicantFullName, phoneNumber: appToNotify.phoneNumber,
            createdAt: appToNotify.createdAt, courseName: appToNotify.course?.name || null,
          };
          setInAppNotification({ data: notificationContent });
          playNotificationSound();
          setShownApplicationSessionIds(prev => new Set(prev).add(`app-${appToNotify.id}`));
        } else if (appToNotify) {
          console.log("[APPS_NOTIFY_FETCH] New app found (ID:", appToNotify.id, "), but another notification is active OR it was already shown this session (Shown:", shownApplicationSessionIds.has(`app-${appToNotify.id}`), ").");
        } else {
          console.log("[APPS_NOTIFY_FETCH] Fetched TRULY NEW applications, but all were already shown this session or no new unshown found.");
        }
        const latestTimestampInBatch = new Date(
          trulyNewApplications.reduce((max, app) => new Date(app.createdAt) > new Date(max) ? app.createdAt : max, trulyNewApplications[0].createdAt)
        ).toISOString();
        console.log("[APPS_NOTIFY_FETCH] Updating lastApplicationFetchTimestamp to (latest TRULY NEW in batch):", latestTimestampInBatch);
        setLastApplicationFetchTimestamp(latestTimestampInBatch);
      } else {
        console.log("[APPS_NOTIFY_FETCH] No TRULY new applications found. Updating lastApplicationFetchTimestamp to current request time:", currentRequestAttemptTimestamp);
        setLastApplicationFetchTimestamp(currentRequestAttemptTimestamp);
      }
    } catch (err) {
      console.error("[APPS_NOTIFY_FETCH] Fetching New Applications ERROR:", err.originalError || err);
      console.log("[APPS_NOTIFY_FETCH] Fetch error. lastApplicationFetchTimestamp remains:", lastApplicationFetchTimestamp);
    }
  }, [token, lastApplicationFetchTimestamp, shownApplicationSessionIds, inAppNotification.data]);

  const fetchPendingApplicationsCount = useCallback(async (currentToken) => {
    if (!currentToken) {
      console.log("[PENDING_APPS_COUNT] Skipping fetch: No token.");
      return;
    }
    console.log("[PENDING_APPS_COUNT] Attempting to fetch count of applications with status 'kutilyabdi'.");
    try {
      const response = await apiRequest(`/applications?filterByStatus=KUTILYABDI&limit=1000`, 'GET', null, currentToken);
      if (response && Array.isArray(response.data)) {
        const count = response.data.length;
        setPendingApplicationBadgeCount(count);
        console.log(`[PENDING_APPS_COUNT] Successfully fetched. Count: ${count}`);
      } else {
        console.warn("[PENDING_APPS_COUNT] API response was not an array or data is missing. Response:", response);
        setPendingApplicationBadgeCount(0);
      }
    } catch (err) {
      console.error("[PENDING_APPS_COUNT] Fetching Pending Applications Count ERROR:", err.originalError || err);
      setPendingApplicationBadgeCount(0);
    }
  }, []);

  const handleLoginSuccess = useCallback((receivedToken) => {
    if (receivedToken && typeof receivedToken === 'string') {
      try {
        const decodedToken = jwtDecode(receivedToken);
        const fullName = [decodedToken?.name, decodedToken?.lastname].filter(Boolean).join(' ').trim() || 'Admin';
        localStorage.setItem('admin_token', receivedToken);
        localStorage.setItem('admin_name', fullName);
        setToken(receivedToken);
        setAdminName(fullName);
        fetchTodaysNotesForNotifications(receivedToken);
        fetchPendingApplicationsCount(receivedToken);
        const nowISO = new Date().toISOString();
        console.log("[LOGIN] Resetting lastApplicationFetchTimestamp to:", nowISO);
        setLastApplicationFetchTimestamp(nowISO);
        setShownNoteSessionIds(new Set());
        setShownApplicationSessionIds(new Set());
        showToast(`Xush kelibsiz, ${fullName}!`, 'success');
      } catch (error) {
        console.error("LOGIN ERROR (Failed to decode token/extract name):", error);
        localStorage.setItem('admin_token', receivedToken);
        localStorage.removeItem('admin_name');
        setToken(receivedToken);
        setAdminName('Admin');
        fetchTodaysNotesForNotifications(receivedToken);
        fetchPendingApplicationsCount(receivedToken);
        showToast('Tizimga kirildi (ism aniqlanmadi).', 'info');
      }
    } else {
      console.error("LOGIN ERROR (invalid/no token received):", receivedToken);
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_name');
      setToken(null);
      setAdminName(null);
      showToast('Login qilishda xatolik yuz berdi.', 'error');
    }
  }, [fetchTodaysNotesForNotifications, fetchPendingApplicationsCount, showToast]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_name');
    setToken(null);
    setAdminName(null);
    setActiveSection('dashboard');
    setIsSidebarOpen(false);
    setTodaysNotesForNotifications([]);
    setShownNoteSessionIds(new Set());
    if (noteCheckIntervalRef.current) clearInterval(noteCheckIntervalRef.current);
    if (noteFetchIntervalRef.current) clearInterval(noteFetchIntervalRef.current);
    setShownApplicationSessionIds(new Set());
    const nowISO = new Date().toISOString();
    console.log("[LOGOUT] Resetting lastApplicationFetchTimestamp to:", nowISO);
    setLastApplicationFetchTimestamp(nowISO);
    if (applicationCheckIntervalRef.current) clearInterval(applicationCheckIntervalRef.current);
    setPendingApplicationBadgeCount(0);
    if (pendingApplicationsCountIntervalRef.current) clearInterval(pendingApplicationsCountIntervalRef.current);
    setInAppNotification({ data: null });
    showToast('Tizimdan muvaffaqiyatli chiqdingiz.', 'success');
  }, [showToast]);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const fullName = [decoded?.name, decoded?.lastname].filter(Boolean).join(' ').trim() || 'Admin';
        setAdminName(fullName);
        localStorage.setItem('admin_name', fullName);
        fetchTodaysNotesForNotifications(token);
        fetchPendingApplicationsCount(token);
      } catch (e) {
        console.error("Error decoding token on initial load:", e);
        setToken(null);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_name');
        showToast('Token yaroqsiz, iltimos qayta kiring.', 'error');
      }
    }
  }, [fetchTodaysNotesForNotifications, fetchPendingApplicationsCount, showToast, token]);

  useEffect(() => {
    if (token) {
      if (todaysNotesForNotifications.length === 0) {
        fetchTodaysNotesForNotifications(token);
      }
      checkScheduledNoteNotifications();
      noteCheckIntervalRef.current = setInterval(checkScheduledNoteNotifications, NOTES_CHECK_INTERVAL);
      noteFetchIntervalRef.current = setInterval(() => fetchTodaysNotesForNotifications(token), NOTES_FETCH_INTERVAL);
      return () => {
        clearInterval(noteCheckIntervalRef.current);
        clearInterval(noteFetchIntervalRef.current);
      };
    } else {
      if (noteCheckIntervalRef.current) clearInterval(noteCheckIntervalRef.current);
      if (noteFetchIntervalRef.current) clearInterval(noteFetchIntervalRef.current);
    }
  }, [token, fetchTodaysNotesForNotifications, checkScheduledNoteNotifications, todaysNotesForNotifications.length]);

  useEffect(() => {
    if (token) {
      applicationCheckIntervalRef.current = setInterval(() => fetchNewApplications(token), APPLICATIONS_CHECK_INTERVAL);
      return () => clearInterval(applicationCheckIntervalRef.current);
    } else {
      if (applicationCheckIntervalRef.current) clearInterval(applicationCheckIntervalRef.current);
    }
  }, [token, fetchNewApplications]);

  useEffect(() => {
    if (token) {
      pendingApplicationsCountIntervalRef.current = setInterval(() => {
        console.log("[PENDING_APPS_COUNT_INTERVAL] Triggering fetch.");
        fetchPendingApplicationsCount(token);
      }, PENDING_APPLICATIONS_COUNT_FETCH_INTERVAL);
      return () => {
        console.log("[PENDING_APPS_COUNT_INTERVAL] Clearing interval.");
        clearInterval(pendingApplicationsCountIntervalRef.current);
      };
    } else {
      if (pendingApplicationsCountIntervalRef.current) clearInterval(pendingApplicationsCountIntervalRef.current);
    }
  }, [token, fetchPendingApplicationsCount]);

  const handleCloseInAppNotification = useCallback(() => {
    console.log("[NOTIFICATION] Closing notification. Old data:", JSON.stringify(inAppNotification.data));
    setInAppNotification({ data: null });
  }, []);

  if (!token) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} showToast={showToast} />;
  }

  const ActiveComponent = sections[activeSection]?.component;
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const handleSectionSelect = (key) => {
    if (sections.hasOwnProperty(key)) {
      setActiveSection(key);
    } else {
      setActiveSection('dashboard');
    }
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100 font-inter">
      <aside className={`
        w-72 bg-gray-900 text-gray-100 flex flex-col flex-shrink-0 shadow-2xl
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex
      `}>
        <div className="p-6 border-b border-gray-700 flex-shrink-0 text-center">
          <div className="flex items-center justify-center">
            <h1 className="text-3xl font-bold text-white tracking-tight">LONDON EDU</h1>
          </div>
        </div>
        <nav className="flex-1 px-3.5 py-5 space-y-2 overflow-y-auto">
          {Object.entries(sections).map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              onClick={() => handleSectionSelect(key)}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-all duration-200 ease-in-out group relative ${activeSection === key ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-300 hover:text-gray-50'}`}
              aria-current={activeSection === key ? "page" : undefined}
            >
              {activeSection === key && (
                <span className="absolute left-0 top-1/2 transform -translate-y-1/2 h-6 w-1 bg-white rounded-r-full"></span>
              )}
              <Icon size={20} className={`ml-1 mr-4 flex-shrink-0 ${activeSection === key ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`} aria-hidden="true" />
              <span className="flex-1 text-left flex justify-between items-center">
                <span>{label}</span>
                {key === 'applications' && pendingApplicationBadgeCount > 0 && (
                  <span className="ml-2 inline-block py-0.5 px-2 leading-tight text-center whitespace-nowrap align-baseline font-bold bg-red-500 text-white rounded-full text-xs">
                    {pendingApplicationBadgeCount}
                  </span>
                )}
              </span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700 mt-auto flex-shrink-0">
          <div className="flex items-center justify-center mb-4 px-2 py-2.5 bg-gray-800 rounded-lg">
            <UserCircle size={24} className="mr-2.5 text-gray-400 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm text-gray-300 truncate" title={adminName || 'Admin'}>
              {adminName || 'Admin'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-60 transition duration-150 ease-in-out shadow-md hover:shadow-lg"
          >
            <LogOut size={18} className="mr-2.5" aria-hidden="true" /> Chiqish
          </button>
        </div>
      </aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-40 md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        ></div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-lg md:hidden h-20 flex items-center justify-between px-6 flex-shrink-0 z-30">
          <span className="text-xl font-semibold text-gray-800">Admin Panel</span>
          <button
            onClick={toggleSidebar}
            className="text-gray-600 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 p-2 rounded-md"
            aria-label={isSidebarOpen ? "Menyuni yopish" : "Menyuni ochish"}
            aria-expanded={isSidebarOpen}
          >
            {isSidebarOpen ? <CloseIcon size={30} aria-hidden="true" /> : <Menu size={30} aria-hidden="true" />}
          </button>
        </header>

        <InAppNotification
          note={inAppNotification.data}
          onClose={handleCloseInAppNotification}
        />

        {toast.id && (
          <ToastNotification
            key={toast.key} id={toast.id} message={toast.message} type={toast.type}
            duration={toast.duration} onClose={handleCloseToast} position="bottom-right"
          />
        )}

        <main className="flex-1 overflow-y-auto bg-gray-100">
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-full pt-24">
                  <LoadingSpinner size="large" message="Yuklanmoqda..." />
                </div>
              }
            >
              {ActiveComponent ? (
                <ActiveComponent
                  token={token}
                  refreshTodaysNotesForNotifications={() => fetchTodaysNotesForNotifications(token)}
                  showToast={showToast}
                  refreshPendingApplicationsCount={() => fetchPendingApplicationsCount(token)}
                />
              ) : <p className="text-center text-gray-700 text-xl mt-12">Bo'lim topilmadi.</p>}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default App;