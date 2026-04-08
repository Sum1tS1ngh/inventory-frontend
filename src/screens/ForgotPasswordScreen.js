import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { AuthAPI } from "../utils/api";
import { Input, Button } from "../components/UI";
import { COLORS, RADIUS, SHADOW } from "../utils/theme";

const STEP = { EMAIL: "email", OTP: "otp", NEW_PASS: "newpass", DONE: "done" };

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(STEP.EMAIL);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(""); // OTP entered by the user
  // const [demoOtp, setDemoOtp] = useState(""); // shown in demo mode - removed for production // This line is already commented out, good.
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [errors, setErrors] = useState({});

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await AuthAPI.forgotPassword({ email: email.trim() }); // The backend no longer returns OTP
      setStep(STEP.OTP);
      // In production, the OTP is sent via email.
      Alert.alert("OTP Sent", "Check your email for the 6-digit code.");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = () => {
    if (otp.trim().length !== 6) {
      setErrors({ otp: "Enter the 6-digit OTP" });
      return;
    }
    setErrors({});
    setStep(STEP.NEW_PASS);
  };

  // ── Step 3: Reset password ────────────────────────────────────────────────
  const handleReset = async () => {
    const e = {};
    if (newPass.length < 6) e.newPass = "Min 6 characters";
    if (newPass !== confirmPass) e.confirmPass = "Passwords do not match";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await AuthAPI.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword: newPass,
      });
      setStep(STEP.DONE);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = {
    [STEP.EMAIL]: 0,
    [STEP.OTP]: 1,
    [STEP.NEW_PASS]: 2,
    [STEP.DONE]: 3,
  }[step];

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
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.titleArea}>
          <Text style={styles.bigIcon}>🔐</Text>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            We'll send a 6-digit OTP to your email
          </Text>
        </View>

        {/* Progress dots */}
        <View style={styles.progressRow}>
          {["Email", "OTP", "New Password"].map((label, i) => (
            <React.Fragment key={i}>
              <View style={styles.stepWrap}>
                <View
                  style={[
                    styles.dot,
                    i <= stepIndex && { backgroundColor: COLORS.primary },
                  ]}
                >
                  <Text style={styles.dotText}>
                    {i < stepIndex ? "✓" : i + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    i <= stepIndex && { color: COLORS.primary },
                  ]}
                >
                  {label}
                </Text>
              </View>
              {i < 2 && (
                <View
                  style={[
                    styles.line,
                    i < stepIndex && { backgroundColor: COLORS.primary },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === STEP.EMAIL && (
            <>
              <Text style={styles.cardTitle}>Enter your email</Text>
              <Text style={styles.cardSub}>
                We'll send a reset code to this email address.
              </Text>
              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="owner@store.com"
                keyboardType="email-address"
                error={errors.email}
                style={{ marginTop: 16 }}
              />
              <Button
                title="Send OTP"
                onPress={handleSendOtp}
                loading={loading}
                style={{ marginTop: 8 }}
              />
            </>
          )}

          {step === STEP.OTP && (
            <>
              <Text style={styles.cardTitle}>Enter OTP</Text>
              <Text style={styles.cardSub}>
                Check your email {email} for the 6-digit code.
              </Text>
              {/* The following block was for demo purposes and should be removed in production. */}
              {/* {demoOtp ? ( // This entire conditional block should be removed in production
                <View style={styles.demoBanner}>
                  <Text style={styles.demoLabel}>🧪 Demo OTP (remove in production):</Text>
                </View>
              ) : null} */}
              <Input
                label="6-Digit OTP"
                value={otp}
                onChangeText={setOtp}
                placeholder="e.g. 482910"
                keyboardType="number-pad"
                error={errors.otp}
                style={{ marginTop: 16 }}
              />

              <Button
                title="Verify OTP"
                onPress={handleVerifyOtp}
                style={{ marginTop: 8 }}
              />
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleSendOtp}
              >
                <Text style={styles.resendText}>
                  Didn't receive? Resend OTP
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === STEP.NEW_PASS && (
            <>
              <Text style={styles.cardTitle}>Set New Password</Text>
              <Text style={styles.cardSub}>
                Choose a strong password for your account.
              </Text>
              <Input
                label="New Password"
                value={newPass}
                onChangeText={setNewPass}
                placeholder="Min 6 characters"
                secureTextEntry
                error={errors.newPass}
                style={{ marginTop: 16 }}
              />
              <Input
                label="Confirm Password"
                value={confirmPass}
                onChangeText={setConfirmPass}
                placeholder="Repeat password"
                secureTextEntry
                error={errors.confirmPass}
              />
              <Button
                title="Reset Password"
                onPress={handleReset}
                loading={loading}
                style={{ marginTop: 8 }}
              />
            </>
          )}

          {step === STEP.DONE && (
            <View style={styles.doneArea}>
              <Text style={styles.doneIcon}>✅</Text>
              <Text style={styles.doneTitle}>Password Reset!</Text>
              <Text style={styles.doneSub}>
                You can now sign in with your new password.
              </Text>
              <Button
                title="Go to Sign In"
                onPress={() => navigation.navigate("Login")}
                style={{ marginTop: 24 }}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.dark },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  backBtn: { marginTop: Platform.OS === "ios" ? 56 : 20, marginBottom: 12 },
  backText: { color: "#8AADAA", fontSize: 15 },
  titleArea: { alignItems: "center", marginBottom: 28 },
  bigIcon: { fontSize: 44, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "900", color: "#fff" },
  subtitle: {
    fontSize: 13,
    color: "#8AADAA",
    marginTop: 4,
    textAlign: "center",
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  stepWrap: { alignItems: "center" },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1A3540",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  dotText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  stepLabel: { fontSize: 11, color: "#8AADAA" },
  line: {
    height: 2,
    width: 36,
    backgroundColor: "#1A3540",
    marginBottom: 18,
    marginHorizontal: 4,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 24,
    ...SHADOW.lg,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary },
  cardSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

  demoBanner: {
    backgroundColor: "#FFF4E5",
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  demoLabel: { fontSize: 11, color: COLORS.warning, fontWeight: "600" },
  demoCode: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.textPrimary,
    letterSpacing: 4,
    marginTop: 4,
  },

  resendBtn: { alignItems: "center", marginTop: 12 },
  resendText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },

  doneArea: { alignItems: "center", paddingVertical: 16 },
  doneIcon: { fontSize: 56, marginBottom: 12 },
  doneTitle: { fontSize: 22, fontWeight: "900", color: COLORS.textPrimary },
  doneSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 8,
  },
});
