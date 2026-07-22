import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha e-mail e senha.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'in') {
        await signIn(email.trim(), password);
      } else {
        const { needsConfirm } = await signUp(email.trim(), password);
        if (needsConfirm) {
          Alert.alert('Confirme seu e-mail', 'Enviamos um link de confirmação para o seu e-mail.');
          setMode('in');
        }
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Ionicons name="wallet" size={38} color={colors.white} />
          </View>
          <Text style={styles.title}>Controle Financeiro</Text>
          <Text style={styles.subtitle}>Contas e cartões no seu bolso</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="voce@email.com"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textDim}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.btn} onPress={submit} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnText}>{mode === 'in' ? 'Entrar' : 'Criar conta'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === 'in' ? 'up' : 'in')}>
            <Text style={styles.switch}>
              {mode === 'in' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logo: {
    width: 76, height: 76, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.textDim, fontSize: 14, marginTop: 4 },
  form: { gap: 6 },
  label: { color: colors.textDim, fontSize: 13, marginTop: 10, marginLeft: 2 },
  input: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border,
  },
  btn: {
    backgroundColor: colors.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 20,
  },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  switch: { color: colors.primary, textAlign: 'center', marginTop: 18, fontSize: 14 },
});
