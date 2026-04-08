import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { Input, Button } from "../components/UI";
import { COLORS, RADIUS, SHADOW } from "../utils/theme";

export default function LoginScreen({ navigation }) {
  const { signin } = useAuth();
  const [tab, setTab] = useState("signin"); // 'signin' | 'signup'
  const [loading, setLoading] = useState(false);

  // Signin fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup fields
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [errors, setErrors] = useState({});

  // ── Validate Sign In ──────────────────────────────────────────────────────
  const validateSignin = () => {
    const e = {};
    if (!email.trim()) e.email = "Email is required";
    if (!password.trim()) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Validate Sign Up ──────────────────────────────────────────────────────
  const validateSignup = () => {
    const e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!storeName.trim()) e.storeName = "Store name is required";
    if (!suEmail.trim()) e.suEmail = "Email is required";
    if (suPassword.length < 6) e.suPassword = "Password min 6 characters";
    if (suPassword !== confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Handle Sign In ────────────────────────────────────────────────────────
  const handleSignin = async () => {
    if (!validateSignin()) return;
    setLoading(true);
    try {
      await signin(email.trim(), password);
      // Navigation handled by root navigator watching auth state
    } catch (err) {
      Alert.alert("Login Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Sign Up ────────────────────────────────────────────────────────
  const handleSignup = async () => {
    if (!validateSignup()) return;
    setLoading(true);
    try {
      // The signup function is already available from the useAuth() call at the top.
      // use signup from auth context – imported inline below
    } catch (err) {
      Alert.alert("Signup Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>📦</Text>
          </View>
          <Text style={styles.appName}>StoreInventory</Text>
          <Text style={styles.tagline}>
            Smart stock management for your store
          </Text>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "signin" && styles.tabBtnActive]}
            onPress={() => {
              setTab("signin");
              setErrors({});
            }}
          >
            <Text
              style={[
                styles.tabBtnText,
                tab === "signin" && styles.tabBtnTextActive,
              ]}
            >
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "signup" && styles.tabBtnActive]}
            onPress={() => {
              setTab("signup");
              setErrors({});
            }}
          >
            <Text
              style={[
                styles.tabBtnText,
                tab === "signup" && styles.tabBtnTextActive,
              ]}
            >
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {tab === "signin" ? (
            <>
              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="owner@store.com"
                keyboardType="email-address"
                error={errors.email}
              />
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                error={errors.password}
              />
              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
              <Button
                title="Sign In to Dashboard"
                onPress={handleSignin}
                loading={loading}
                style={{ marginTop: 8 }}
              />
            </>
          ) : (
            <SignupForm
              name={name}
              setName={setName}
              storeName={storeName}
              setStoreName={setStoreName}
              suEmail={suEmail}
              setSuEmail={setSuEmail}
              suPassword={suPassword}
              setSuPassword={setSuPassword}
              confirm={confirm}
              setConfirm={setConfirm}
              errors={errors}
              loading={loading}
              setLoading={setLoading}
              setErrors={setErrors}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Signup Sub-Form ───────────────────────────────────────────────────────────
function SignupForm({
  name,
  setName,
  storeName,
  setStoreName,
  suEmail,
  setSuEmail,
  suPassword,
  setSuPassword,
  confirm,
  setConfirm,
  errors,
  loading,
  setLoading,
  setErrors,
}) {
  const { signup } = useAuth();

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!storeName.trim()) e.storeName = "Store name is required";
    if (!suEmail.trim()) e.suEmail = "Email is required";
    if (suPassword.length < 6) e.suPassword = "Min 6 characters";
    if (suPassword !== confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signup(name.trim(), suEmail.trim(), suPassword, storeName.trim());
    } catch (err) {
      Alert.alert("Signup Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Input
        label="Your Name"
        value={name}
        onChangeText={setName}
        placeholder="John Doe"
        autoCapitalize="words"
        error={errors.name}
      />
      <Input
        label="Store Name"
        value={storeName}
        onChangeText={setStoreName}
        placeholder="My General Store"
        autoCapitalize="words"
        error={errors.storeName}
      />
      <Input
        label="Email"
        value={suEmail}
        onChangeText={setSuEmail}
        placeholder="owner@store.com"
        keyboardType="email-address"
        error={errors.suEmail}
      />
      <Input
        label="Password"
        value={suPassword}
        onChangeText={setSuPassword}
        placeholder="Min 6 characters"
        secureTextEntry
        error={errors.suPassword}
      />
      <Input
        label="Confirm Password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Re-enter password"
        secureTextEntry
        error={errors.confirm}
      />
      <Button
        title="Create Account"
        onPress={handleSignup}
        loading={loading}
        style={{ marginTop: 8 }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.dark },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { alignItems: "center", paddingTop: 60, paddingBottom: 32 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    ...SHADOW.md,
  },
  logoIcon: { fontSize: 36 },
  appName: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.5,
  },
  tagline: { fontSize: 13, color: "#8AADAA", marginTop: 6 },

  tabRow: {
    flexDirection: "row",
    backgroundColor: "#1A3540",
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
  },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: { fontSize: 14, fontWeight: "600", color: "#8AADAA" },
  tabBtnTextActive: { color: "#fff" },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    ...SHADOW.lg,
  },
  forgotLink: { alignSelf: "flex-end", marginBottom: 4, marginTop: -4 },
  forgotText: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },
});
