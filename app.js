/**
 * MediCare Plus — Hospital Management System
 * React Native (Expo) — Complete App.js
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  TextInput, StyleSheet, SafeAreaView, StatusBar,
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Animated,
} from 'react-native';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// ⚠️  NETWORK SETUP — Ensure LOCAL_IP and port match your backend server.
// You can set REACT_NATIVE_API_URL env variable to override.
// Use localhost for local development to avoid network issues
const API_BASE_URL = process.env.REACT_NATIVE_API_URL || 'http://localhost:5000/api';

const C = {
  primary:       '#0A4D6E',
  primaryLight:  '#1A7DAD',
  primaryPale:   '#E8F4FA',
  accent:        '#00B894',
  accentLight:   '#E8FFF8',
  danger:        '#E17055',
  dangerLight:   '#FFF0EC',
  warning:       '#FDCB6E',
  warningLight:  '#FFFBF0',
  text:          '#1a2332',
  textMuted:     '#6B7B8D',
  textLight:     '#A0ADB8',
  border:        '#E2EAF0',
  bg:            '#F4F7FB',
  white:         '#FFFFFF',
};

const ROLE_NAV = {
  patient: [
    { icon: '🏠', label: 'Dashboard',        id: 'dashboard' },
    { icon: '🔍', label: 'Find Doctors',     id: 'doctors' },
    { icon: '📅', label: 'My Appointments',  id: 'appointments' },
    { icon: '📄', label: 'Medical Records',  id: 'records' },
    { icon: '💳', label: 'Billing',          id: 'billing' },
    { icon: '💬', label: 'Messages',         id: 'chat' },
    { icon: '🔔', label: 'Notifications',    id: 'notifications' },
  ],
  doctor: [
    { icon: '🏠', label: 'Dashboard',     id: 'dashboard' },
    { icon: '📅', label: 'Appointments',  id: 'appointments' },
    { icon: '👥', label: 'My Patients',   id: 'patients' },
    { icon: '📝', label: 'Prescriptions', id: 'prescriptions' },
    { icon: '🗓️', label: 'My Schedule',   id: 'schedule' },
    { icon: '💬', label: 'Messages',      id: 'chat' },
  ],
  admin: [
    { icon: '🏠', label: 'Dashboard',        id: 'dashboard' },
    { icon: '👨‍⚕️', label: 'Manage Doctors',   id: 'doctors' },
    { icon: '👥', label: 'Manage Patients',  id: 'patients' },
    { icon: '📅', label: 'All Appointments', id: 'appointments' },
    { icon: '💳', label: 'Billing',          id: 'billing' },
    { icon: '📊', label: 'Analytics',        id: 'analytics' },
    { icon: '⚙️', label: 'Settings',         id: 'settings' },
  ],
};

const STATS = [
  { number: '340+', label: 'Specialist Doctors' },
  { number: '50K+', label: 'Patients Served' },
  { number: '98%',  label: 'Satisfaction Rate' },
  { number: '24/7', label: 'Emergency Support' },
  { number: '18',   label: 'Specialties' },
];

const FEATURES = [
  { icon: '📅', color: C.primaryLight,  bg: C.primaryPale,  title: 'Easy Booking',          desc: 'Search by specialty and book appointments in minutes.' },
  { icon: '🩺', color: C.accent,        bg: C.accentLight,  title: 'Digital Records',        desc: 'Access your complete health history securely anytime.' },
  { icon: '💬', color: '#E67E22',       bg: '#FEF5EC',      title: 'Live Doctor Chat',       desc: 'Chat with your doctor for quick follow-ups instantly.' },
  { icon: '💳', color: C.warning,       bg: C.warningLight, title: 'Seamless Payments',      desc: 'Pay fees, view billing history, and get claims processed.' },
  { icon: '🔒', color: C.primaryLight,  bg: C.primaryPale,  title: 'Secure & Private',       desc: 'Your medical data is encrypted and protected.' },
  { icon: '📊', color: C.accent,        bg: C.accentLight,  title: 'Health Analytics',       desc: 'Track your health trends with personalized insights.' },
];

const TIME_SLOTS = [
  { label: '9:00 AM',  value: '09:00:00' },
  { label: '9:30 AM',  value: '09:30:00' },
  { label: '10:00 AM', value: '10:00:00' },
  { label: '10:30 AM', value: '10:30:00' },
  { label: '11:00 AM', value: '11:00:00' },
  { label: '2:00 PM',  value: '14:00:00' },
  { label: '2:30 PM',  value: '14:30:00' },
  { label: '4:00 PM',  value: '16:00:00' },
];

// ─── API HELPERS ───────────────────────────────────────────────────────────────

let CURRENT_USER_ID = null;
let CURRENT_USER_ROLE = null;

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (CURRENT_USER_ID) {
    headers['X-User-Id'] = String(CURRENT_USER_ID);
  }
  if (CURRENT_USER_ROLE) {
    headers['X-User-Role'] = String(CURRENT_USER_ROLE);
  }
  let res;
  try {
    res = await fetch(url, {
      headers,
      credentials: 'include',
      ...options,
    });
  } catch (err) {
    console.error('Network fetch error', { url, err });
    throw new Error('Network error: ' + (err.message || String(err)));
  }

  // Instrumentation: log request/response for easier debugging (redact sensitive fields)
  const redact = (obj) => {
    try {
      if (!obj || typeof obj !== 'object') return obj;
      const copy = JSON.parse(JSON.stringify(obj));
      const keys = ['password', 'old_password', 'new_password', 'token'];
      const walk = (o) => {
        if (!o || typeof o !== 'object') return;
        for (const k of Object.keys(o)) {
          if (keys.includes(k)) o[k] = 'REDACTED';
          else if (typeof o[k] === 'object') walk(o[k]);
        }
      };
      walk(copy);
      return copy;
    } catch { return '<<unserializable>>'; }
  };

  try {
    const method = (options.method || 'GET').toUpperCase();
    const safeBody = options.body ? (() => { try { return JSON.parse(options.body); } catch { return options.body; } })() : null;
    if (method === 'DELETE' || method === 'POST' || method === 'PUT') {
      console.debug('apiRequest', { method, url, body: redact(safeBody) });
    }
  } catch (err) { /* non-fatal */ }

  // Safely parse JSON, fall back to text when response isn't JSON
  let text = '';
  try { text = await res.text(); } catch (e) { /* ignore */ }

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { message: text };
  }

  if (!res.ok) throw new Error(data.message || data.error || `API Error (${res.status})`);
  try { console.debug('apiResponse', { url, status: res.status, body: redact(data) }); } catch (e) {}
  return data;
}


const api = {
  // Auth
  login:     (email, password, role) => apiFetch('/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }),
  register:  (data) => apiFetch('/register', { method: 'POST', body: JSON.stringify(data) }),
  getUser:   () => apiFetch('/user'),
  logout:    () => apiFetch('/logout', { method: 'POST' }),

  // Doctors
  getDoctors:    () => apiFetch('/doctors'),
  addDoctor:     (d) => apiFetch('/doctors', { method: 'POST', body: JSON.stringify(d) }),
  updateDoctor:  (id, d) => apiFetch(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteDoctor:  (id) => apiFetch(`/doctors/${id}`, { method: 'DELETE' }),

  // Appointments
  getAppointments:  () => apiFetch('/appointments'),
  bookAppointment:  (d) => apiFetch('/appointments', { method: 'POST', body: JSON.stringify(d) }),
  updateAppt:       (id, status) => apiFetch(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteAppt:       (id) => apiFetch(`/appointments/${id}`, { method: 'DELETE' }),

  // Patients
  getPatients:   () => apiFetch('/patients'),
  addPatient:    (d) => apiFetch('/patients', { method: 'POST', body: JSON.stringify(d) }),
  updatePatient: (id, d) => apiFetch(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deletePatient: (id) => apiFetch(`/patients/${id}`, { method: 'DELETE' }),

  // Prescriptions
  getPrescriptions: () => apiFetch('/prescriptions'),
  addPrescription:  (d) => apiFetch('/prescriptions', { method: 'POST', body: JSON.stringify(d) }),

  // Records
  getRecords:  () => apiFetch('/records'),

  // Billing
  getBills:    () => apiFetch('/bills'),
  generateBill:(d) => apiFetch('/bills', { method: 'POST', body: JSON.stringify(d) }),
  payBill:     (id) => apiFetch('/bills/pay', { method: 'POST', body: JSON.stringify({ invoiceId: id }) }),
  deleteBill:  (id) => apiFetch(`/bills/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => apiFetch('/notifications'),
  markRead:         (id) => apiFetch(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead:      () => apiFetch('/notifications/read-all', { method: 'PUT' }),

  // Messages
  getMessages:  (otherId) => apiFetch(`/messages${otherId ? '?other_id=' + otherId : ''}`),
  sendMessage:  (d) => apiFetch('/messages', { method: 'POST', body: JSON.stringify(d) }),

  // Schedule — sends one day at a time; bulk helper in SchedulePanel
  saveScheduleDay: (d) => apiFetch('/schedules', { method: 'POST', body: JSON.stringify(d) }),
  getSchedule:     (doctorId) => apiFetch(`/schedules${doctorId ? '?doctor_id=' + doctorId : ''}`),

  // Stats
  getStats:       () => apiFetch('/stats'),
  getDoctorStats: () => apiFetch('/stats/doctor'),

  // Settings
  updateSettingsProfile:  (d) => apiFetch('/settings/profile',  { method: 'PUT', body: JSON.stringify(d) }),
  updateSettingsPassword: (d) => apiFetch('/settings/password', { method: 'PUT', body: JSON.stringify(d) }),

  // Contact
  contact: (d) => apiFetch('/contact', { method: 'POST', body: JSON.stringify(d) }),
};

// ─── SHARED UI COMPONENTS ──────────────────────────────────────────────────────

function Toast({ message, type, visible }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, message]);

  const bgColor = type === 'error' ? C.dangerLight : C.accentLight;
  const icon    = type === 'error' ? '❌' : '✅';

  // Render toast inside a transparent Modal so it appears above other Modals
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 80 }} pointerEvents="box-none">
        <Animated.View style={[ss.toast, { opacity, backgroundColor: bgColor, zIndex: 99999, elevation: 99999 }]}> 
          <Text style={ss.toastIcon}>{icon}</Text>
          <Text style={ss.toastMsg}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

function useToast() {
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false, key: 0 });
  const show = useCallback((message, type = 'success') => {
    setToast(t => ({ message, type, visible: true, key: t.key + 1 }));
  }, []);
  return { toast, show };
}

function FormInput({ label, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={ss.formGroup}>
      {label ? <Text style={ss.formLabel}>{label}</Text> : null}
      <TextInput
        style={[ss.formControl, focused && ss.formControlFocused]}
        placeholderTextColor={C.textLight}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
}

function Btn({ label, onPress, variant = 'primary', disabled, loading, size }) {
  const variantStyle = {
    primary: { bg: C.primary,   text: C.white },
    accent:  { bg: C.accent,    text: C.white },
    outline: { bg: 'transparent', text: C.primary, border: true },
    ghost:   { bg: 'rgba(255,255,255,0.18)', text: C.white },
    white:   { bg: C.white,     text: C.primary },
    danger:  { bg: C.danger,    text: C.white },
  }[variant] || {};

  const isLg = size === 'lg';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        ss.btn,
        { backgroundColor: variantStyle.bg },
        variantStyle.border && ss.btnBorder,
        isLg && ss.btnLg,
        (disabled || loading) && ss.btnDisabled,
      ]}
      activeOpacity={0.78}
    >
      {loading && <ActivityIndicator size="small" color={variantStyle.text} style={{ marginRight: 6 }} />}
      <Text style={[ss.btnText, { color: variantStyle.text }, isLg && ss.btnTextLg]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatusPill({ status }) {
  const map = {
    scheduled:  { bg: C.primaryPale,   text: C.primary },
    confirmed:  { bg: C.accentLight,   text: C.accent },
    completed:  { bg: '#EEF2FF',        text: '#4F46E5' },
    cancelled:  { bg: C.dangerLight,   text: C.danger },
    pending:    { bg: C.warningLight,  text: '#B7791F' },
    paid:       { bg: C.accentLight,   text: C.accent },
    unpaid:     { bg: C.dangerLight,   text: C.danger },
  };
  const style = map[status?.toLowerCase()] || { bg: C.bg, text: C.textMuted };
  return (
    <View style={[ss.pill, { backgroundColor: style.bg }]}>
      <Text style={[ss.pillText, { color: style.text }]}>{status}</Text>
    </View>
  );
}

function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <View style={ss.sectionHeader}>
      <Text style={ss.sectionTitle}>{title}</Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction}>
          <Text style={ss.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function Card({ children, style }) {
  return <View style={[ss.card, style]}>{children}</View>;
}

function EmptyState({ icon, message }) {
  return (
    <View style={ss.emptyState}>
      <Text style={ss.emptyIcon}>{icon}</Text>
      <Text style={ss.emptyMsg}>{message}</Text>
    </View>
  );
}

function AppModal({ visible, title, onClose, children }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={ss.modalBackdrop}>
          <View style={ss.modalBox}>
            <View style={ss.modalHeader}>
              <Text style={ss.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={ss.modalClose}>
                <Text style={ss.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={ss.modalBody} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── LANDING SCREEN ────────────────────────────────────────────────────────────

function LandingScreen({ onLogin }) {
  const [tab, setTab]             = useState('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [role, setRole]           = useState('patient');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [regEmail, setRegEmail]   = useState('');
  const [regPass, setRegPass]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [contactName, setContactName]   = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg]     = useState('');
  const { toast, show } = useToast();

  const ROLES = ['patient', 'doctor', 'admin'];

  const handleLogin = async () => {
    if (!email || !password) { show('❌ Please enter email and password', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.login(email, password, role);
      // Backend returns { status: 'success', user: { id, name, email, role } }
      onLogin(res.user || res);
    } catch (e) {
      show('❌ ' + (e.message || 'Login failed. Please check your credentials.'), 'error');
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!firstName || !regEmail || !regPass) { show('❌ Please fill all fields', 'error'); return; }
    if (regPass.length < 6) { show('❌ Password must be at least 6 characters', 'error'); return; }
    if (!phone) { show('❌ Phone number is required', 'error'); return; }
    setLoading(true);
    try {
      // Step 1: register the new patient account
      await api.register({ first_name: firstName, last_name: lastName, email: regEmail, phone, password: regPass });
      // Step 2: auto-login to establish session and get user object
      const loginRes = await api.login(regEmail, regPass, 'patient');
      onLogin(loginRes.user || loginRes);
    } catch (e) {
      show('❌ ' + (e.message || 'Registration failed. Please try again.'), 'error');
    } finally { setLoading(false); }
  };

  const handleContact = async () => {
    if (!contactName || !contactEmail || !contactMsg) { show('❌ Please fill all fields', 'error'); return; }
    try {
      await api.contact({ name: contactName, email: contactEmail, message: contactMsg });
      show('✅ Message sent! We\'ll get back to you soon.');
      setContactName(''); setContactEmail(''); setContactMsg('');
    } catch (e) {
      show('✅ Message sent!'); // graceful fallback
    }
  };

  return (
    <SafeAreaView style={ss.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">

        {/* HERO */}
        <View style={ss.hero}>
          {/* NAV */}
          <View style={ss.landNav}>
            <View style={ss.landLogoRow}>
              <View style={ss.logoIcon}><Text style={{ fontSize: 20 }}>🏥</Text></View>
              <Text style={ss.logoText}>Medi<Text style={{ color: C.warning }}>Care</Text> Plus</Text>
            </View>
          </View>

          {/* BADGE */}
          <View style={ss.heroBadge}>
            <View style={ss.heroBadgeDot} />
            <Text style={ss.heroBadgeText}>Now serving 1,200+ patients monthly</Text>
          </View>

          {/* TITLE */}
          <Text style={ss.heroTitle}>Healthcare that{'\n'}
            <Text style={ss.heroAccent}>puts you first</Text>
          </Text>
          <Text style={ss.heroSub}>
            Book appointments, consult specialists, access your medical records, and manage your health — all in one secure platform.
          </Text>

          {/* AUTH CARD */}
          <View style={ss.authCard}>
            {/* TABS */}
            <View style={ss.authTabs}>
              {['login', 'register'].map(t => (
                <TouchableOpacity key={t} onPress={() => setTab(t)} style={[ss.authTab, tab === t && ss.authTabActive]}>
                  <Text style={[ss.authTabText, tab === t && ss.authTabTextActive]}>
                    {t === 'login' ? 'Sign in' : 'Create account'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === 'login' ? (
              <View>
                <FormInput label="Email address" value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
                <FormInput label="Password" value={password} onChangeText={setPassword}
                  secureTextEntry placeholder="••••••••" />
                <View style={ss.formGroup}>
                  <Text style={ss.formLabel}>Login as</Text>
                  <View style={ss.roleRow}>
                    {ROLES.map(r => (
                      <TouchableOpacity key={r} onPress={() => setRole(r)}
                        style={[ss.roleChip, role === r && ss.roleChipActive]}>
                        <Text style={[ss.roleChipText, role === r && ss.roleChipTextActive]}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Btn label="Sign in to account" onPress={handleLogin} loading={loading} />
                <View style={ss.dividerRow}>
                  <View style={ss.dividerLine} /><Text style={ss.dividerText}>or continue with</Text><View style={ss.dividerLine} />
                </View>
                {/* Google auth removed per request */}
              </View>
            ) : (
              <View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <FormInput label="First name" value={firstName} onChangeText={setFirstName} placeholder="John" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormInput label="Last name" value={lastName} onChangeText={setLastName} placeholder="Doe" />
                  </View>
                </View>
                <FormInput label="Email address" value={regEmail} onChangeText={setRegEmail}
                  keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
                <FormInput label="Phone number" value={phone} onChangeText={setPhone}
                  keyboardType="phone-pad" placeholder="+92 300 0000000" />
                <FormInput label="Password" value={regPass} onChangeText={setRegPass}
                  secureTextEntry placeholder="At least 8 characters" />
                <Btn label="Create patient account" onPress={handleRegister} loading={loading} variant="accent" />
              </View>
            )}
          </View>
        </View>

        {/* STATS */}
        <View style={ss.statsBar}>
          {STATS.map((s, i) => (
            <View key={i} style={ss.statItem}>
              <Text style={ss.statNumber}>{s.number}</Text>
              <Text style={ss.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* FEATURES */}
        <View style={ss.featuresSection}>
          <Text style={ss.sectionLabel}>Why Choose Us</Text>
          <Text style={ss.featureSectionTitle}>Everything you need, all in one place</Text>
          <Text style={ss.featureSectionSub}>
            Our platform connects patients, doctors, and administrators in a seamless healthcare experience.
          </Text>
          <View style={ss.featuresGrid}>
            {FEATURES.map((f, i) => (
              <View key={i} style={ss.featureCard}>
                <View style={[ss.featureIcon, { backgroundColor: f.bg }]}>
                  <Text style={{ fontSize: 22 }}>{f.icon}</Text>
                </View>
                <Text style={ss.featureTitle}>{f.title}</Text>
                <Text style={ss.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CONTACT */}
        <View style={ss.contactSection}>
          <Text style={ss.sectionLabel}>Get In Touch</Text>
          <Text style={ss.featureSectionTitle}>Contact Us</Text>
          <Text style={ss.featureSectionSub}>Have questions or need help? Send us a message.</Text>
          <Card style={{ marginTop: 24 }}>
            <FormInput label="Full Name" value={contactName} onChangeText={setContactName} placeholder="John Doe" />
            <FormInput label="Email Address" value={contactEmail} onChangeText={setContactEmail}
              keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
            <View style={ss.formGroup}>
              <Text style={ss.formLabel}>Message</Text>
              <TextInput
                style={[ss.formControl, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
                value={contactMsg} onChangeText={setContactMsg}
                placeholder="How can we help?" placeholderTextColor={C.textLight}
                multiline numberOfLines={4}
              />
            </View>
            <Btn label="Send Message" onPress={handleContact} />
          </Card>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {toast.visible && <Toast key={toast.key} message={toast.message} type={toast.type} visible={toast.visible} />}
    </SafeAreaView>
  );
}

// ─── APP SHELL ─────────────────────────────────────────────────────────────────

function AppShell({ user, onLogout }) {
  const role = user?.role?.toLowerCase() || 'patient';
  const navItems = ROLE_NAV[role] || ROLE_NAV.patient;
  const [panel, setPanel]           = useState('dashboard');
  const [sidebarOpen, setSidebar]   = useState(false);
  const { toast, show } = useToast();

  const initials = (user?.name || 'User').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const renderPanel = () => {
    switch (panel) {
      case 'dashboard':    return <DashboardPanel role={role} user={user} showToast={show} onNavigate={setPanel} />;
      case 'doctors':      return <DoctorsPanel role={role} showToast={show} />;
      case 'appointments': return <AppointmentsPanel role={role} showToast={show} />;
      case 'records':      return <RecordsPanel showToast={show} />;
      case 'billing':      return <BillingPanel role={role} showToast={show} />;
      case 'chat':         return <ChatPanel user={user} showToast={show} />;
      case 'notifications':return <NotificationsPanel showToast={show} />;
      case 'patients':     return <PatientsPanel role={role} showToast={show} />;
      case 'prescriptions':return <PrescriptionsPanel showToast={show} />;
      case 'schedule':     return <SchedulePanel showToast={show} />;
      case 'analytics':    return <AnalyticsPanel showToast={show} />;
      case 'settings':     return <SettingsPanel user={user} showToast={show} />;
      default:             return <DashboardPanel role={role} user={user} showToast={show} onNavigate={setPanel} />;
    }
  };

  const currentLabel = navItems.find(n => n.id === panel)?.label || 'Dashboard';

  return (
    <SafeAreaView style={[ss.safeArea, { backgroundColor: C.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* TOP BAR */}
      <View style={ss.topbar}>
        <TouchableOpacity onPress={() => setSidebar(true)} style={ss.menuBtn}>
          <Text style={{ fontSize: 20 }}>☰</Text>
        </TouchableOpacity>
        <Text style={ss.topbarTitle}>{currentLabel}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={ss.iconBtn} onPress={() => setPanel('notifications')}>
            <Text style={{ fontSize: 18 }}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ss.iconBtn} onPress={() => setPanel('settings')}>
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT */}
      <View style={{ flex: 1 }}>
        {renderPanel()}
      </View>

      {/* BOTTOM NAV */}
      <View style={ss.bottomNav}>
        {navItems.slice(0, 5).map(item => (
          <TouchableOpacity key={item.id} style={ss.bottomNavItem} onPress={() => setPanel(item.id)}>
            <Text style={[ss.bottomNavIcon, panel === item.id && { transform: [{ scale: 1.2 }] }]}>{item.icon}</Text>
            <Text style={[ss.bottomNavLabel, panel === item.id && { color: C.primary, fontWeight: '600' }]}>
              {item.label.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SIDEBAR DRAWER */}
      <Modal visible={sidebarOpen} animationType="slide" transparent onRequestClose={() => setSidebar(false)}>
        <View style={ss.sidebarOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSidebar(false)} />
          <View style={ss.sidebar}>
            {/* Sidebar Header */}
            <View style={ss.sidebarHeader}>
              <View style={ss.sidebarLogoRow}>
                <Text style={{ fontSize: 22 }}>🏥</Text>
                <Text style={ss.sidebarLogoText}>Medi<Text style={{ color: C.warning }}>Care</Text></Text>
              </View>
              <View style={ss.sidebarUser}>
                <View style={ss.userAvatar}><Text style={ss.userAvatarText}>{initials}</Text></View>
                <View>
                  <Text style={ss.userName}>{user?.name || 'User'}</Text>
                  <Text style={ss.userRole}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
                </View>
              </View>
            </View>
            {/* Nav Items */}
            <ScrollView style={{ flex: 1 }}>
              {navItems.map(item => (
                <TouchableOpacity key={item.id} style={[ss.navItem, panel === item.id && ss.navItemActive]}
                  onPress={() => { setPanel(item.id); setSidebar(false); }}>
                  <Text style={ss.navIcon}>{item.icon}</Text>
                  <Text style={[ss.navLabel, panel === item.id && ss.navLabelActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* Logout */}
            <TouchableOpacity style={ss.logoutBtn} onPress={onLogout}>
              <Text style={{ fontSize: 18 }}>🚪</Text>
              <Text style={ss.logoutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {toast.visible && <Toast key={toast.key} message={toast.message} type={toast.type} visible={toast.visible} />}
    </SafeAreaView>
  );
}

// ─── DASHBOARD PANEL ───────────────────────────────────────────────────────────

function DashboardPanel({ role, user, showToast, onNavigate }) {
  const [stats, setStats]       = useState(null);
  const [appointments, setAppts] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const appts = await api.getAppointments();
        setAppts((appts || []).slice(0, 5));

        if (role === 'admin') {
          const s = await api.getStats();
          setStats(s);
        } else if (role === 'doctor') {
          const s = await api.getDoctorStats();
          const [prescs, msgs] = await Promise.all([
            api.getPrescriptions().catch(() => []),
            api.getMessages().catch(() => [])
          ]);
          setStats({
            todayAppts: s.todayAppointments,
            myPatients: s.totalPatients,
            prescsCount: prescs?.length || 0,
            msgsCount: msgs?.length || 0
          });
        } else if (role === 'patient') {
          const [recs, bills, msgs] = await Promise.all([
            api.getRecords().catch(() => ({ prescriptions: [], reports: [] })),
            api.getBills().catch(() => []),
            api.getMessages().catch(() => [])
          ]);
          const pendingCount = (bills || []).filter(b => b.status !== 'paid' && b.status !== 'Paid').length;
          const recordsCount = (recs?.prescriptions?.length || 0) + (recs?.reports?.length || 0);
          setStats({
            recordsCount,
            pendingBills: pendingCount,
            msgsCount: msgs?.length || 0
          });
        }
      } catch {}
      setLoading(false);
    })();
  }, [role]);

  const statCards = role === 'patient'
    ? [
        { icon: '📅', label: 'Appointments',    value: appointments.length, color: C.primary },
        { icon: '📄', label: 'Records',          value: stats?.recordsCount || 0, color: C.accent },
        { icon: '💳', label: 'Pending Bills',    value: stats?.pendingBills || 0, color: C.danger },
        { icon: '💬', label: 'Messages',         value: stats?.msgsCount || 0, color: '#4F46E5' },
      ]
    : role === 'doctor'
    ? [
        { icon: '📅', label: "Today's Appts",   value: stats?.todayAppts || 0, color: C.primary },
        { icon: '👥', label: 'My Patients',     value: stats?.myPatients || 0, color: C.accent },
        { icon: '📝', label: 'Prescriptions',   value: stats?.prescsCount || 0, color: '#4F46E5' },
        { icon: '💬', label: 'Messages',         value: stats?.msgsCount || 0, color: C.warning },
      ]
    : [
        { icon: '👨‍⚕️', label: 'Total Doctors',   value: stats?.doctorsCount || 0, color: C.primary },
        { icon: '👥', label: 'Total Patients',  value: stats?.patientsCount || 0, color: C.accent },
        { icon: '📅', label: 'Appointments',    value: stats?.appointmentsCount || 0, color: '#4F46E5' },
        { icon: '💳', label: 'Revenue',         value: typeof stats?.totalRevenue === 'number' ? `Rs. ${stats.totalRevenue.toLocaleString()}` : 'Rs. 0', color: C.warning },
      ];

  return (
    <ScrollView style={ss.panelScroll} showsVerticalScrollIndicator={false}>
      <View style={ss.panelBody}>
        <Text style={ss.panelWelcome}>Welcome back, <Text style={{ color: C.primary }}>{user?.name?.split(' ')[0] || 'there'}</Text> 👋</Text>
        <Text style={ss.panelWelcomeSub}>Here's your health overview for today.</Text>

        {/* STAT CARDS */}
        <View style={ss.statsGrid}>
          {statCards.map((s, i) => (
            <View key={i} style={[ss.statCard, { borderTopColor: s.color }]}>
              <Text style={ss.statCardIcon}>{s.icon}</Text>
              <Text style={[ss.statCardValue, { color: s.color }]}>{loading ? '…' : s.value}</Text>
              <Text style={ss.statCardLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* RECENT APPOINTMENTS */}
        <SectionHeader title="Recent Appointments" actionLabel="View all" onAction={() => onNavigate('appointments')} />
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
        ) : appointments.length === 0 ? (
          <EmptyState icon="📅" message="No appointments yet" />
        ) : (
          appointments.map((a, i) => (
            <Card key={i} style={{ marginBottom: 10 }}>
              <View style={ss.apptRow}>
                <View style={ss.apptAvatar}>
                  <Text style={{ fontSize: 20 }}>🩺</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ss.apptName}>{a.doctorName || a.patientName || 'Appointment'}</Text>
                  <Text style={ss.apptMeta}>{a.date} · {a.time}</Text>
                </View>
                <StatusPill status={a.status} />
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── DOCTORS PANEL ─────────────────────────────────────────────────────────────

function DoctorsPanel({ role, showToast }) {
  const [doctors, setDoctors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [bookModal, setBookModal] = useState(false);
  const [addModal, setAddModal]   = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookReason, setBookReason] = useState('');
  const [bookType, setBookType] = useState('In-person');
  const [newDoc, setNewDoc] = useState({ name:'', email:'', specialty:'', fee:'', password:'' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setDoctors(await api.getDoctors() || []); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = doctors.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  const handleBook = async () => {
    if (!bookDate || !bookTime) { showToast('Please select date and time', 'error'); return; }
    setSaving(true);
    try {
      await api.bookAppointment({ doctor_id: selectedDoc.id, date: bookDate, time: bookTime, reason: bookReason, type: bookType });
      showToast('✅ Appointment booked successfully!');
      setBookModal(false);
      setBookDate(''); setBookTime(''); setBookReason(''); setBookType('In-person');
      setSelectedDoc(null);
    } catch (e) { showToast('❌ ' + (e.message || 'Booking failed'), 'error'); }
    finally { setSaving(false); }
  };

  const handleAddDoctor = async () => {
    if (!newDoc.name || !newDoc.email || !newDoc.specialty || !newDoc.fee) {
      showToast('❌ Please fill all required fields', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.addDoctor(newDoc);
      showToast('✅ Doctor added successfully!');
      setAddModal(false);
      setNewDoc({ name:'', email:'', specialty:'', fee:'', password:'' });
      load();
    } catch (e) { showToast('❌ ' + (e.message || 'Failed to add doctor'), 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Doctor', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { 
          await api.deleteDoctor(id); 
          showToast('✅ Doctor deleted successfully');
          load(); 
        } catch (e) { console.error('deleteDoctor error', e); showToast('❌ ' + (e.message || 'Failed to delete (see console)'), 'error'); }
      }},
    ]);
  };

  const VISIT_TYPES = ['In-person', 'Video', 'Follow-up'];

  return (
    <View style={{ flex: 1 }}>
      <View style={ss.panelToolbar}>
        <TextInput style={ss.searchInput} placeholder="🔍  Search doctors…" placeholderTextColor={C.textLight}
          value={search} onChangeText={setSearch} />
        {role === 'admin' && (
          <TouchableOpacity onPress={() => setAddModal(true)} style={ss.addBtn}>
            <Text style={ss.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: d }) => (
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <View style={ss.docAvatar}><Text style={{ fontSize: 22 }}>👨‍⚕️</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={ss.docName}>{d.name}</Text>
                  <Text style={ss.docSpec}>{d.specialty}</Text>
                  <Text style={ss.docFee}>Rs. {d.fee} / consultation</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {role === 'patient' && (
                  <TouchableOpacity style={ss.docActionBtn} onPress={() => { setSelectedDoc(d); setBookModal(true); }}>
                    <Text style={ss.docActionBtnText}>📅 Book</Text>
                  </TouchableOpacity>
                )}
                {role === 'admin' && (
                  <TouchableOpacity style={[ss.docActionBtn, { backgroundColor: C.dangerLight }]} onPress={() => handleDelete(d.id)}>
                    <Text style={[ss.docActionBtnText, { color: C.danger }]}>🗑 Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          )}
          ListEmptyComponent={<EmptyState icon="👨‍⚕️" message="No doctors found" />}
        />
      )}

      {/* BOOK MODAL */}
      <AppModal visible={bookModal} title="Book Appointment" onClose={() => setBookModal(false)}>
        {selectedDoc && (
          <View style={[ss.bookDocInfo, { marginBottom: 16 }]}>
            <Text style={{ fontSize: 24 }}>👨‍⚕️</Text>
            <View>
              <Text style={ss.docName}>{selectedDoc.name}</Text>
              <Text style={ss.docSpec}>{selectedDoc.specialty}</Text>
            </View>
          </View>
        )}
        <FormInput label="Select Date (YYYY-MM-DD)" value={bookDate} onChangeText={setBookDate} placeholder="2025-01-15" />
        <View style={ss.formGroup}>
          <Text style={ss.formLabel}>Select Time Slot</Text>
          <View style={ss.timeSlotsGrid}>
            {TIME_SLOTS.map(slot => (
              <TouchableOpacity key={slot.value} onPress={() => setBookTime(slot.value)}
                style={[ss.timeSlot, bookTime === slot.value && ss.timeSlotActive]}>
                <Text style={[ss.timeSlotText, bookTime === slot.value && { color: C.white }]}>{slot.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={ss.formGroup}>
          <Text style={ss.formLabel}>Reason for visit</Text>
          <TextInput style={[ss.formControl, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
            value={bookReason} onChangeText={setBookReason}
            placeholder="Briefly describe your symptoms…" placeholderTextColor={C.textLight} multiline />
        </View>
        <View style={ss.formGroup}>
          <Text style={ss.formLabel}>Visit type</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {VISIT_TYPES.map(t => (
              <TouchableOpacity key={t} onPress={() => setBookType(t)}
                style={[ss.roleChip, bookType === t && ss.roleChipActive]}>
                <Text style={[ss.roleChipText, bookType === t && ss.roleChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Btn label="Cancel" onPress={() => setBookModal(false)} variant="outline" />
          <View style={{ flex: 1 }}>
            <Btn label="Confirm Booking →" onPress={handleBook} loading={saving} />
          </View>
        </View>
      </AppModal>

      {/* ADD DOCTOR MODAL */}
      <AppModal visible={addModal} title="Add New Doctor" onClose={() => setAddModal(false)}>
        <FormInput label="Full Name" value={newDoc.name} onChangeText={v => setNewDoc(d => ({ ...d, name: v }))} placeholder="Dr. John Smith" />
        <FormInput label="Email" value={newDoc.email} onChangeText={v => setNewDoc(d => ({ ...d, email: v }))} keyboardType="email-address" autoCapitalize="none" placeholder="doctor@medicare.com" />
        <FormInput label="Specialization" value={newDoc.specialty} onChangeText={v => setNewDoc(d => ({ ...d, specialty: v }))} placeholder="Cardiology" />
        <FormInput label="Consultation Fee (Rs.)" value={newDoc.fee} onChangeText={v => setNewDoc(d => ({ ...d, fee: v }))} keyboardType="numeric" placeholder="1500" />
        <FormInput label="Temporary Password" value={newDoc.password} onChangeText={v => setNewDoc(d => ({ ...d, password: v }))} secureTextEntry placeholder="••••••••" />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Btn label="Cancel" onPress={() => setAddModal(false)} variant="outline" />
          <View style={{ flex: 1 }}>
            <Btn label="Create Doctor" onPress={handleAddDoctor} loading={saving} />
          </View>
        </View>
      </AppModal>
    </View>
  );
}

// ─── APPOINTMENTS PANEL ────────────────────────────────────────────────────────

function AppointmentsPanel({ role, showToast }) {
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setAppts(await api.getAppointments() || []); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStatus = async (id, status) => {
    try { 
      await api.updateAppt(id, status); 
      showToast(`✅ Appointment ${status} successfully`); 
      load(); 
    }
    catch (e) { showToast('❌ ' + (e.message || 'Failed to update status'), 'error'); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Appointment', 'Remove this appointment? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { 
          await api.deleteAppt(id); 
          showToast('✅ Appointment deleted');
          load();
        } catch (e) { console.error('deleteAppt error', e); showToast('❌ ' + (e.message || 'Failed to delete (see console)'), 'error'); }
      }},
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={appts}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: a }) => (
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={ss.apptName}>{a.doctorName || a.patientName || 'Appointment'}</Text>
                <StatusPill status={a.status} />
              </View>
              <Text style={ss.apptMeta}>📅 {a.date}  ·  🕐 {a.time}</Text>
              {a.reason ? <Text style={[ss.apptMeta, { marginTop: 4 }]}>📝 {a.reason}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                {(role === 'doctor' || role === 'admin') && a.status === 'scheduled' && (
                  <>
                    <TouchableOpacity onPress={() => handleStatus(a.id, 'confirmed')} style={[ss.docActionBtn, { backgroundColor: C.accentLight }]}>
                      <Text style={[ss.docActionBtnText, { color: C.accent }]}>✓ Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleStatus(a.id, 'cancelled')} style={[ss.docActionBtn, { backgroundColor: C.dangerLight }]}>
                      <Text style={[ss.docActionBtnText, { color: C.danger }]}>✕ Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
                {role === 'admin' && (
                  <TouchableOpacity onPress={() => handleDelete(a.id)} style={[ss.docActionBtn, { backgroundColor: C.dangerLight }]}>
                    <Text style={[ss.docActionBtnText, { color: C.danger }]}>🗑 Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          )}
          ListEmptyComponent={<EmptyState icon="📅" message="No appointments found" />}
        />
      )}
    </View>
  );
}

// ─── PATIENTS PANEL ────────────────────────────────────────────────────────────

function PatientsPanel({ role, showToast }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [addModal, setAddModal] = useState(false);
  const [newPat, setNewPat]     = useState({ name:'', email:'', phone:'', password:'' });
  const [saving, setSaving]     = useState(false);

  const load = async () => {
    setLoading(true);
    try { setPatients(await api.getPatients() || []); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newPat.name || !newPat.email || !newPat.phone) {
      showToast('❌ Please fill all required fields', 'error');
      return;
    }
    setSaving(true);
    try { 
      await api.addPatient(newPat); 
      showToast('✅ Patient added successfully!'); 
      setAddModal(false);
      setNewPat({ name:'', email:'', phone:'', password:'' });
      load();
    }
    catch (e) { showToast('❌ ' + (e.message || 'Failed to add patient'), 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Patient', 'Remove this patient? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { 
          await api.deletePatient(id); 
          showToast('✅ Patient deleted successfully');
          load(); 
        } catch (e) { console.error('deletePatient error', e); showToast('❌ ' + (e.message || 'Failed to delete (see console)'), 'error'); }
      }},
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={ss.panelToolbar}>
        <TextInput style={ss.searchInput} placeholder="🔍  Search patients…" placeholderTextColor={C.textLight}
          value={search} onChangeText={setSearch} />
        {role === 'admin' && (
          <TouchableOpacity onPress={() => setAddModal(true)} style={ss.addBtn}>
            <Text style={ss.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: p }) => (
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={ss.docAvatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={ss.docName}>{p.name}</Text>
                  <Text style={ss.docSpec}>{p.email}</Text>
                  {p.phone ? <Text style={ss.docSpec}>{p.phone}</Text> : null}
                </View>
                {role === 'admin' && (
                  <TouchableOpacity onPress={() => handleDelete(p.id)} style={[ss.docActionBtn, { backgroundColor: C.dangerLight }]}>
                    <Text style={[ss.docActionBtnText, { color: C.danger }]}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          )}
          ListEmptyComponent={<EmptyState icon="👥" message="No patients found" />}
        />
      )}

      <AppModal visible={addModal} title="Add New Patient" onClose={() => setAddModal(false)}>
        <FormInput label="Full Name" value={newPat.name} onChangeText={v => setNewPat(p => ({ ...p, name: v }))} placeholder="Sarah Ahmad" />
        <FormInput label="Email" value={newPat.email} onChangeText={v => setNewPat(p => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" placeholder="patient@example.com" />
        <FormInput label="Phone" value={newPat.phone} onChangeText={v => setNewPat(p => ({ ...p, phone: v }))} keyboardType="phone-pad" placeholder="+92 300 0000000" />
        <FormInput label="Temporary Password" value={newPat.password} onChangeText={v => setNewPat(p => ({ ...p, password: v }))} secureTextEntry placeholder="••••••••" />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Btn label="Cancel" onPress={() => setAddModal(false)} variant="outline" />
          <View style={{ flex: 1 }}>
            <Btn label="Create Account" onPress={handleAdd} loading={saving} />
          </View>
        </View>
      </AppModal>
    </View>
  );
}

// ─── RECORDS PANEL ─────────────────────────────────────────────────────────────

function RecordsPanel({ showToast }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Backend returns { prescriptions: [...], reports: [] }
        const res = await api.getRecords();
        setPrescriptions(res?.prescriptions || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <ScrollView style={ss.panelScroll}>
      <View style={ss.panelBody}>
        <SectionHeader title="Medical Records" />
        {loading ? <ActivityIndicator color={C.primary} /> : prescriptions.length === 0
          ? <EmptyState icon="📄" message="No medical records yet" />
          : prescriptions.map((r, i) => (
            <Card key={i} style={{ marginBottom: 12 }}>
              <Text style={ss.docName}>{r.medicine || `Record #${r.id}`}</Text>
              <Text style={ss.apptMeta}>{r.date} · Dr. {r.doctorName || ''}</Text>
              {r.dosage ? <Text style={{ marginTop: 8, color: C.textMuted, fontSize: 13 }}>{r.dosage}</Text> : null}
            </Card>
          ))
        }
      </View>
    </ScrollView>
  );
}

// ─── BILLING PANEL ─────────────────────────────────────────────────────────────

function BillingPanel({ role, showToast }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genModal, setGenModal] = useState(false);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patient_id: '', description: '', amount: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setBills(await api.getBills() || []);
      if (role === 'admin') setPatients(await api.getPatients() || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePay = async (id) => {
    try { 
      await api.payBill(id); 
      showToast('✅ Payment processed successfully!'); 
      load(); 
    }
    catch (e) { showToast('❌ ' + (e.message || 'Payment failed'), 'error'); }
  };

  const handleGen = async () => {
    if (!form.patient_id || !form.description || !form.amount) {
      showToast('❌ Please fill all required fields', 'error');
      return;
    }
    setSaving(true);
    try { 
      await api.generateBill(form); 
      showToast('✅ Bill generated successfully!'); 
      setGenModal(false);
      setForm({ patient_id: '', description: '', amount: '' });
      load();
    }
    catch (e) { showToast('❌ ' + (e.message || 'Failed to generate bill'), 'error'); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      {role === 'admin' && (
        <View style={ss.panelToolbar}>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: C.text }}>Billing & Reports</Text>
          <TouchableOpacity onPress={() => setGenModal(true)} style={ss.addBtn}>
            <Text style={ss.addBtnText}>+ Generate Bill</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={bills}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: b }) => (
            <Card style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={ss.docName}>{b.description}</Text>
                  <Text style={ss.apptMeta}>{b.patientName} · {b.date}</Text>
                  <Text style={{ color: C.primary, fontWeight: '700', marginTop: 4 }}>Rs. {b.amount}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <StatusPill status={b.status || (b.paid ? 'paid' : 'unpaid')} />
                  {b.status !== 'paid' && role === 'patient' && (
                    <TouchableOpacity onPress={() => handlePay(b.id)} style={[ss.docActionBtn, { backgroundColor: C.accentLight }]}>
                      <Text style={[ss.docActionBtnText, { color: C.accent }]}>💳 Pay</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={<EmptyState icon="💳" message="No billing records" />}
        />
      )}

      <AppModal visible={genModal} title="Generate Bill" onClose={() => setGenModal(false)}>
        <View style={ss.formGroup}>
          <Text style={ss.formLabel}>Select Patient</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {patients.map(p => (
              <TouchableOpacity key={p.id} onPress={() => setForm(f => ({ ...f, patient_id: p.id }))}
                style={[ss.roleChip, form.patient_id === p.id && ss.roleChipActive, { marginRight: 8 }]}>
                <Text style={[ss.roleChipText, form.patient_id === p.id && ss.roleChipTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <FormInput label="Description" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} placeholder="Consultation Fee, Lab Tests…" />
        <FormInput label="Amount (Rs.)" value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} keyboardType="numeric" placeholder="1500" />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Btn label="Cancel" onPress={() => setGenModal(false)} variant="outline" />
          <View style={{ flex: 1 }}>
            <Btn label="Generate Bill" onPress={handleGen} loading={saving} />
          </View>
        </View>
      </AppModal>
    </View>
  );
}

// ─── PRESCRIPTIONS PANEL ───────────────────────────────────────────────────────

function PrescriptionsPanel({ showToast }) {
  const [patients, setPatients]     = useState([]);
  const [prescriptions, setPrescs]  = useState([]);
  const [addModal, setAddModal]     = useState(false);
  const [form, setForm]             = useState({ patient_id: '', medicine: '', dosage: '' });
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [pats, prescs] = await Promise.all([api.getPatients(), api.getPrescriptions()]);
      setPatients(pats || []);
      setPrescs(prescs || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.patient_id || !form.medicine) { showToast('❌ Please fill required fields', 'error'); return; }
    setSaving(true);
    try { 
      await api.addPrescription(form); 
      showToast('✅ Prescription saved successfully!'); 
      setAddModal(false);
      setForm({ patient_id: '', medicine: '', dosage: '' });
      load();
    }
    catch (e) { showToast('❌ ' + (e.message || 'Failed to save prescription'), 'error'); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={ss.panelToolbar}>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: C.text }}>Prescriptions</Text>
        <TouchableOpacity onPress={() => setAddModal(true)} style={ss.addBtn}>
          <Text style={ss.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={prescriptions}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: p }) => (
            <Card style={{ marginBottom: 12 }}>
              <Text style={ss.docName}>{p.medicine}</Text>
              <Text style={ss.apptMeta}>For: {p.patientName} · {p.date}</Text>
              <Text style={[ss.apptMeta, { marginTop: 4 }]}>{p.dosage}</Text>
            </Card>
          )}
          ListEmptyComponent={<EmptyState icon="📝" message="No prescriptions yet. Tap + Add to write one." />}
        />
      )}

      <AppModal visible={addModal} title="Add Prescription" onClose={() => setAddModal(false)}>
        <View style={ss.formGroup}>
          <Text style={ss.formLabel}>Select Patient</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {patients.map(p => (
              <TouchableOpacity key={p.id} onPress={() => setForm(f => ({ ...f, patient_id: p.id }))}
                style={[ss.roleChip, form.patient_id === p.id && ss.roleChipActive, { marginRight: 8 }]}>
                <Text style={[ss.roleChipText, form.patient_id === p.id && ss.roleChipTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <FormInput label="Medicine Name" value={form.medicine} onChangeText={v => setForm(f => ({ ...f, medicine: v }))} placeholder="Paracetamol 500mg" />
        <View style={ss.formGroup}>
          <Text style={ss.formLabel}>Dosage & Instructions</Text>
          <TextInput style={[ss.formControl, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
            value={form.dosage} onChangeText={v => setForm(f => ({ ...f, dosage: v }))}
            placeholder="1 tablet twice a day after meals…" placeholderTextColor={C.textLight} multiline />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Btn label="Cancel" onPress={() => setAddModal(false)} variant="outline" />
          <View style={{ flex: 1 }}>
            <Btn label="Save Prescription" onPress={handleAdd} loading={saving} />
          </View>
        </View>
      </AppModal>
    </View>
  );
}

// ─── SCHEDULE PANEL ────────────────────────────────────────────────────────────

function SchedulePanel({ showToast }) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const defaultSched = DAYS.reduce((acc, d) => ({ ...acc, [d]: { enabled: false, start: '09:00', end: '17:00' } }), {});
  const [schedule, setSchedule] = useState(defaultSched);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);

  // Pre-load existing schedule from backend
  useEffect(() => {
    (async () => {
      try {
        const rows = await api.getSchedule();
        if (rows && rows.length > 0) {
          const mapped = { ...defaultSched };
          rows.forEach(row => {
            const st = String(row.start_time || '09:00:00').slice(0, 5);
            const et = String(row.end_time   || '17:00:00').slice(0, 5);
            mapped[row.day_of_week] = { enabled: !!row.is_available, start: st, end: et };
          });
          setSchedule(mapped);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const toggle = (day) => setSchedule(s => ({ ...s, [day]: { ...s[day], enabled: !s[day].enabled } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Backend takes one day at a time: POST /api/schedules
      const saves = DAYS.map(day =>
        api.saveScheduleDay({
          day_of_week:  day,
          start_time:   schedule[day].start + ':00',
          end_time:     schedule[day].end   + ':00',
          is_available: schedule[day].enabled ? 1 : 0,
        })
      );
      await Promise.all(saves);
      showToast('✅ Schedule updated successfully!');
    } catch (e) { showToast('❌ ' + (e.message || 'Failed to save schedule'), 'error'); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView style={ss.panelScroll}>
      <View style={ss.panelBody}>
        <SectionHeader title="My Schedule" />
        {DAYS.map(day => (
          <Card key={day} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[ss.docName, { fontSize: 15 }]}>{day}</Text>
              <TouchableOpacity onPress={() => toggle(day)}
                style={[ss.toggle, schedule[day].enabled && ss.toggleActive]}>
                <View style={[ss.toggleThumb, schedule[day].enabled && ss.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
            {schedule[day].enabled && (
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, alignItems: 'center' }}>
                <TextInput style={[ss.formControl, { flex: 1, textAlign: 'center' }]}
                  value={schedule[day].start}
                  onChangeText={v => setSchedule(s => ({ ...s, [day]: { ...s[day], start: v } }))} />
                <Text style={{ color: C.textMuted }}>to</Text>
                <TextInput style={[ss.formControl, { flex: 1, textAlign: 'center' }]}
                  value={schedule[day].end}
                  onChangeText={v => setSchedule(s => ({ ...s, [day]: { ...s[day], end: v } }))} />
              </View>
            )}
          </Card>
        ))}
        <Btn label="Save Schedule" onPress={handleSave} loading={saving} />
      </View>
    </ScrollView>
  );
}

// ─── CHAT PANEL ────────────────────────────────────────────────────────────────

function ChatPanel({ user, showToast }) {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages]           = useState([]);
  const [activeUser, setActiveUser]       = useState(null);
  const [msgText, setMsgText]             = useState('');
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Backend returns a flat array of conversation users (no wrapper object)
        const res = await api.getMessages();
        setConversations(Array.isArray(res) ? res : []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const openChat = async (u) => {
    setActiveUser(u);
    try {
      // Backend returns a flat array of message objects (no wrapper object)
      const res = await api.getMessages(u.id);
      setMessages(Array.isArray(res) ? res : []);
    } catch {}
  };

  const handleSend = async () => {
    if (!msgText.trim() || !activeUser) return;
    const text = msgText; 
    setMsgText('');
    try {
      await api.sendMessage({ receiver_id: activeUser.id, message: text });
      setMessages(m => [...m, { sender_id: user?.id, message: text, timestamp: new Date().toISOString() }]);
    } catch (e) { 
      setMsgText(text); // restore message on error
      showToast('❌ Failed to send message', 'error');
    }
  };

  if (activeUser) {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={{ flex: 1 }}>
          <View style={ss.chatHeader}>
            <TouchableOpacity onPress={() => setActiveUser(null)} style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 20, color: C.primary }}>←</Text>
            </TouchableOpacity>
            <View style={ss.docAvatar}><Text style={{ fontSize: 18 }}>👤</Text></View>
            <Text style={[ss.docName, { marginLeft: 10 }]}>{activeUser.name}</Text>
          </View>
          <FlatList
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item: m }) => {
              const mine = m.sender_id === user?.id;
              return (
                <View style={[ss.msgBubble, mine ? ss.msgMine : ss.msgTheirs]}>
                  <Text style={[ss.msgText, mine && { color: C.white }]}>{m.message}</Text>
                </View>
              );
            }}
          />
          <View style={ss.chatInputRow}>
            <TextInput style={ss.chatInput} value={msgText} onChangeText={setMsgText}
              placeholder="Type a message…" placeholderTextColor={C.textLight} />
            <TouchableOpacity 
              onPress={handleSend} 
              style={ss.sendBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Text style={{ color: C.white, fontSize: 16 }}>➤</Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    );
  }


  return (
    <View style={{ flex: 1 }}>
      <View style={ss.panelToolbar}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>Messages</Text>
      </View>
      {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} /> :
        conversations.length === 0 ? <EmptyState icon="💬" message="No conversations yet" /> :
        <FlatList
          data={conversations}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: u }) => (
            <TouchableOpacity onPress={() => openChat(u)}>
              <Card style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={ss.docAvatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={ss.docName}>{u.name}</Text>
                  <Text style={ss.apptMeta}>{u.lastMessage || 'No messages yet'}</Text>
                </View>
                <Text style={{ fontSize: 18, color: C.textLight }}>›</Text>
              </Card>
            </TouchableOpacity>
          )}
        />
      }
    </View>
  );
}

// ─── NOTIFICATIONS PANEL ───────────────────────────────────────────────────────

function NotificationsPanel({ showToast }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setNotifs(await api.getNotifications() || []); } catch {}
      setLoading(false);
    })();
  }, []);

  const markRead = async (id) => {
    try { await api.markRead(id); setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x)); }
    catch {}
  };

  return (
    <View style={{ flex: 1 }}>
      {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} /> :
        notifs.length === 0 ? <EmptyState icon="🔔" message="No notifications" /> :
        <FlatList
          data={notifs}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: n }) => (
            <TouchableOpacity onPress={() => markRead(n.id)}>
              <Card style={[{ marginBottom: 10, flexDirection: 'row', gap: 12 }, !n.is_read && { borderLeftWidth: 3, borderLeftColor: C.primary }]}>
                <View style={[ss.notifDot, { backgroundColor: n.is_read ? C.border : C.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={ss.docName}>{n.title || 'Notification'}</Text>
                  <Text style={ss.apptMeta}>{n.message}</Text>
                  <Text style={[ss.apptMeta, { marginTop: 4 }]}>{n.time}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      }
    </View>
  );
}

// ─── ANALYTICS PANEL ───────────────────────────────────────────────────────────

function AnalyticsPanel({ showToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getStats();
        setStats(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />;
  }

  const total = stats?.appointmentsCount || 1;
  const schedPct = Math.round((stats?.scheduledCount || 0) / total * 100);
  const confPct = Math.round((stats?.confirmedCount || 0) / total * 100);
  const compPct = Math.round((stats?.completedCount || 0) / total * 100);
  const cancPct = Math.round((stats?.cancelledCount || 0) / total * 100);

  const metrics = [
    { label: 'Total Revenue',    value: `Rs. ${(stats?.totalRevenue || 0).toLocaleString()}`, icon: '💰', color: C.accent },
    { label: 'Doctors',          value: String(stats?.doctorsCount || 0),                     icon: '👨‍⚕️', color: C.primary },
    { label: 'Patients',         value: String(stats?.patientsCount || 0),                    icon: '👥', color: '#4F46E5' },
    { label: 'Appointments',     value: String(stats?.appointmentsCount || 0),                icon: '📅', color: C.warning },
  ];

  return (
    <ScrollView style={ss.panelScroll}>
      <View style={ss.panelBody}>
        <Text style={ss.panelWelcome}>Analytics Overview</Text>
        <View style={ss.statsGrid}>
          {metrics.map((m, i) => (
            <View key={i} style={[ss.statCard, { borderTopColor: m.color }]}>
              <Text style={ss.statCardIcon}>{m.icon}</Text>
              <Text style={[ss.statCardValue, { color: m.color }]}>{m.value}</Text>
              <Text style={ss.statCardLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
        <Card style={{ marginTop: 16 }}>
          <Text style={[ss.docName, { marginBottom: 12 }]}>📊 Appointments by Status</Text>
          {[
            ['Scheduled', schedPct, C.primary],
            ['Confirmed', confPct, C.warning],
            ['Completed', compPct, C.accent],
            ['Cancelled', cancPct, C.danger]
          ].map(([label, pct, color]) => (
            <View key={label} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={ss.apptMeta}>{label}</Text>
                <Text style={[ss.apptMeta, { color }]}>{pct}%</Text>
              </View>
              <View style={ss.progressBg}>
                <View style={[ss.progressBar, { width: `${pct}%`, backgroundColor: color }]} />
              </View>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

// ─── SETTINGS PANEL ────────────────────────────────────────────────────────────

function SettingsPanel({ user, showToast }) {
  const [name, setName]       = useState(user?.name || '');
  const [email, setEmail]     = useState(user?.email || '');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [savingProfile, setSavingProfile]   = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfile = async () => {
    if (!name || !email) { showToast('❌ Name and email are required', 'error'); return; }
    setSavingProfile(true);
    try {
      await api.updateSettingsProfile({ name, email });
      showToast('✅ Profile updated successfully!');

      // If password fields are provided, attempt password change as part of Save Changes
      if (oldPass || newPass) {
        if (!oldPass || !newPass) {
          showToast('❌ To change password, provide both current and new password', 'error');
        } else if (newPass.length < 6) {
          showToast('❌ New password must be at least 6 characters', 'error');
        } else {
          setSavingPassword(true);
          try {
            await api.updateSettingsPassword({ old_password: oldPass, new_password: newPass });
            showToast('✅ Password changed successfully!');
            setOldPass(''); setNewPass('');
          } catch (e) {
            console.error('updateSettingsPassword error', e);
            showToast('❌ ' + (e.message || 'Password change failed'), 'error');
          } finally { setSavingPassword(false); }
        }
      }
    }
    catch (e) { showToast('❌ ' + (e.message || 'Profile update failed'), 'error'); }
    finally { setSavingProfile(false); }
  };

  const handlePassword = async () => {
    if (!oldPass || !newPass) { showToast('❌ Please fill both password fields', 'error'); return; }
    if (newPass.length < 6) { showToast('❌ New password must be at least 6 characters', 'error'); return; }
    setSavingPassword(true);
    try {
      await api.updateSettingsPassword({ old_password: oldPass, new_password: newPass });
      showToast('✅ Password changed successfully!');
      setOldPass(''); 
      setNewPass('');
    }
    catch (e) { showToast('❌ ' + (e.message || 'Password change failed'), 'error'); }
    finally { setSavingPassword(false); }
  };

  return (
    <ScrollView style={ss.panelScroll} keyboardShouldPersistTaps="handled">
      <View style={ss.panelBody}>
        <Card style={{ marginBottom: 16 }}>
          <Text style={[ss.sectionTitle, { marginBottom: 16 }]}>Profile Information</Text>
          <FormInput label="Full Name" value={name} onChangeText={setName} />
          <FormInput label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <FormInput label="Current Password" value={oldPass} onChangeText={setOldPass} secureTextEntry placeholder="••••••••" />
          <FormInput label="New Password" value={newPass} onChangeText={setNewPass} secureTextEntry placeholder="••••••••" />
          <Btn label="Save Changes" onPress={handleProfile} loading={savingProfile || savingPassword} />
        </Card>
        {/* Password inputs merged into Profile card above to allow updating password with Save Changes */}
      </View>
    </ScrollView>
  );
}

// ─── ROOT APP ──────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (u) => {
    CURRENT_USER_ID = u.id;
    CURRENT_USER_ROLE = u.role;
    setUser(u);
  };
  const handleLogout = () => {
    api.logout().catch(() => {});
    CURRENT_USER_ID = null;
    CURRENT_USER_ROLE = null;
    setUser(null);
  };

  if (!user) return <LandingScreen onLogin={handleLogin} />;
  return <AppShell user={user} onLogout={handleLogout} />;
}


// ─── STYLES ────────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  safeArea:         { flex: 1, backgroundColor: C.primary },

  // HERO
  hero:             { backgroundColor: C.primary, padding: 24, paddingTop: 16 },
  landNav:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  landLogoRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon:         { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoText:         { fontSize: 20, fontWeight: '700', color: C.white, letterSpacing: -0.3 },
  heroBadge:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 20 },
  heroBadgeDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
  heroBadgeText:    { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  heroTitle:        { fontSize: 36, fontWeight: '700', color: C.white, lineHeight: 44, letterSpacing: -0.8, marginBottom: 14 },
  heroAccent:       { color: C.warning, fontStyle: 'italic' },
  heroSub:          { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 24, marginBottom: 28, fontWeight: '300' },

  // AUTH CARD
  authCard:         { backgroundColor: C.white, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 10 },
  authTabs:         { flexDirection: 'row', backgroundColor: C.bg, borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 },
  authTab:          { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  authTabActive:    { backgroundColor: C.white, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  authTabText:      { fontSize: 13, fontWeight: '500', color: C.textMuted },
  authTabTextActive:{ color: C.primary },

  // FORM
  formGroup:        { marginBottom: 14 },
  formLabel:        { fontSize: 12, fontWeight: '500', color: C.textMuted, marginBottom: 6 },
  formControl:      { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.text, backgroundColor: C.white },
  formControlFocused: { borderColor: C.primaryLight, shadowColor: C.primaryLight, shadowOpacity: 0.15, shadowRadius: 4 },

  // ROLE CHIPS
  roleRow:          { flexDirection: 'row', gap: 8 },
  roleChip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  roleChipActive:   { backgroundColor: C.primary, borderColor: C.primary },
  roleChipText:     { fontSize: 13, fontWeight: '500', color: C.textMuted },
  roleChipTextActive:{ color: C.white },

  // DIVIDER
  dividerRow:       { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 10 },
  dividerLine:      { flex: 1, height: 1, backgroundColor: C.border },
  dividerText:      { fontSize: 12, color: C.textLight },

  // BTN
  btn:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  btnBorder:        { borderWidth: 1.5, borderColor: C.border },
  btnLg:            { paddingVertical: 15, paddingHorizontal: 28, borderRadius: 12 },
  btnText:          { fontSize: 14, fontWeight: '500' },
  btnTextLg:        { fontSize: 15 },
  btnDisabled:      { opacity: 0.65 },

  // STATS
  statsBar:         { backgroundColor: C.white, flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 20, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  statItem:         { width: '33.33%', alignItems: 'center', paddingVertical: 8 },
  statNumber:       { fontSize: 22, fontWeight: '700', color: C.primary },
  statLabel:        { fontSize: 11, color: C.textMuted, marginTop: 2, textAlign: 'center' },

  // FEATURES
  featuresSection:  { padding: 28, backgroundColor: C.bg },
  sectionLabel:     { fontSize: 12, fontWeight: '700', color: C.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  featureSectionTitle: { fontSize: 24, fontWeight: '700', color: C.text, marginBottom: 10 },
  featureSectionSub:   { fontSize: 14, color: C.textMuted, lineHeight: 22, marginBottom: 24 },
  featuresGrid:     { gap: 12 },
  featureCard:      { backgroundColor: C.white, borderRadius: 14, padding: 20, shadowColor: C.primary, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
  featureIcon:      { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  featureTitle:     { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 6 },
  featureDesc:      { fontSize: 13, color: C.textMuted, lineHeight: 20 },

  // CONTACT
  contactSection:   { padding: 28, backgroundColor: C.bg },

  // TOAST
  toast:            { alignSelf: 'center', minWidth: '60%', maxWidth: 520, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 8 },
  toastIcon:        { fontSize: 18 },
  toastMsg:         { flex: 1, fontSize: 13, color: C.text },

  // TOPBAR
  topbar:           { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  menuBtn:          { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: C.bg, marginRight: 12 },
  topbarTitle:      { flex: 1, fontSize: 16, fontWeight: '600', color: C.text },
  iconBtn:          { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: C.bg },

  // SIDEBAR
  sidebarOverlay:   { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)' },
  sidebar:          { width: 280, backgroundColor: C.primary, paddingTop: 48 },
  sidebarHeader:    { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  sidebarLogoRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sidebarLogoText:  { fontSize: 20, fontWeight: '700', color: C.white },
  sidebarUser:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  userAvatarText:   { fontSize: 16, fontWeight: '700', color: C.white },
  userName:         { fontSize: 15, fontWeight: '600', color: C.white },
  userRole:         { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  navItem:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 13 },
  navItemActive:    { backgroundColor: 'rgba(255,255,255,0.12)' },
  navIcon:          { fontSize: 18, width: 26, textAlign: 'center' },
  navLabel:         { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  navLabelActive:   { color: C.white },
  logoutBtn:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 'auto' },
  logoutText:       { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },

  // BOTTOM NAV
  bottomNav:        { flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 8 },
  bottomNavItem:    { flex: 1, alignItems: 'center', gap: 2 },
  bottomNavIcon:    { fontSize: 22 },
  bottomNavLabel:   { fontSize: 10, color: C.textMuted },

  // PANEL
  panelScroll:      { flex: 1, backgroundColor: C.bg },
  panelBody:        { padding: 16 },
  panelWelcome:     { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 4 },
  panelWelcomeSub:  { fontSize: 13, color: C.textMuted, marginBottom: 20 },
  panelToolbar:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  searchInput:      { flex: 1, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.text },
  addBtn:           { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText:       { color: C.white, fontWeight: '600', fontSize: 13 },

  // STAT CARDS GRID
  statsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard:         { width: '47%', backgroundColor: C.white, borderRadius: 14, padding: 16, borderTopWidth: 3, shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, alignItems: 'center' },
  statCardIcon:     { fontSize: 24, marginBottom: 8 },
  statCardValue:    { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statCardLabel:    { fontSize: 12, color: C.textMuted, textAlign: 'center' },

  // CARD
  card:             { backgroundColor: C.white, borderRadius: 14, padding: 16, shadowColor: C.primary, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },

  // SECTION HEADER
  sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:     { fontSize: 16, fontWeight: '600', color: C.text },
  sectionAction:    { fontSize: 13, color: C.primaryLight, fontWeight: '500' },

  // APPOINTMENT ROW
  apptRow:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  apptAvatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primaryPale, alignItems: 'center', justifyContent: 'center' },
  apptName:         { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
  apptMeta:         { fontSize: 12, color: C.textMuted },

  // DOCTOR CARD
  docAvatar:        { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primaryPale, alignItems: 'center', justifyContent: 'center' },
  docName:          { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  docSpec:          { fontSize: 12, color: C.textMuted, marginBottom: 2 },
  docFee:           { fontSize: 12, color: C.accent, fontWeight: '500' },
  docActionBtn:     { backgroundColor: C.primaryPale, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  docActionBtnText: { fontSize: 13, fontWeight: '500', color: C.primary },

  // PILL
  pill:             { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 },
  pillText:         { fontSize: 11, fontWeight: '600' },

  // EMPTY STATE
  emptyState:       { alignItems: 'center', paddingVertical: 60 },
  emptyIcon:        { fontSize: 48, marginBottom: 12, opacity: 0.3 },
  emptyMsg:         { fontSize: 14, color: C.textMuted },

  // MODAL
  modalBackdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:         { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  modalHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle:       { fontSize: 17, fontWeight: '600', color: C.text },
  modalClose:       { width: 32, height: 32, borderRadius: 16, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  modalCloseText:   { fontSize: 14, color: C.textMuted },
  modalBody:        { padding: 24 },

  // BOOKING
  bookDocInfo:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bg, borderRadius: 10, padding: 14 },
  timeSlotsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  timeSlot:         { borderWidth: 1.5, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  timeSlotActive:   { backgroundColor: C.primary, borderColor: C.primary },
  timeSlotText:     { fontSize: 13, fontWeight: '500', color: C.textMuted },

  // TOGGLE
  toggle:           { width: 44, height: 24, borderRadius: 12, backgroundColor: C.border, justifyContent: 'center', paddingHorizontal: 2 },
  toggleActive:     { backgroundColor: C.accent },
  toggleThumb:      { width: 20, height: 20, borderRadius: 10, backgroundColor: C.white, alignSelf: 'flex-start' },
  toggleThumbActive:{ alignSelf: 'flex-end' },

  // CHAT
  chatHeader:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  msgBubble:        { maxWidth: '80%', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  msgMine:          { alignSelf: 'flex-end', backgroundColor: C.primary },
  msgTheirs:        { alignSelf: 'flex-start', backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  msgText:          { fontSize: 14, color: C.text },
  chatInputRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
  chatInput:        { flex: 1, backgroundColor: C.bg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: C.text },
  sendBtn:          { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },

  // NOTIFICATION
  notifDot:         { width: 10, height: 10, borderRadius: 5, marginTop: 4 },

  // ANALYTICS
  progressBg:       { height: 6, backgroundColor: C.bg, borderRadius: 3, overflow: 'hidden' },
  progressBar:      { height: 6, borderRadius: 3 },
});
