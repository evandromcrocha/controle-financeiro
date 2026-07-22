// Controle Financeiro — versão single-file para Expo Snack (snack.expo.dev)
// Cole este arquivo em App.js num Snack novo. No celular, use o app "Expo Go".
// Não precisa instalar nada no PC.
import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';

// ---- Supabase (chaves públicas) ----
const SUPABASE_URL = 'https://fjlphewbocclfwzwlymy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sbs85eyq_D4oKbJ4-LDE6g_aWV-KE3S';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  db: { schema: 'financeiro' },
});

// ---- tema / helpers ----
const C = {
  bg: '#0f172a', card: '#1e293b', cardAlt: '#334155', border: '#334155',
  text: '#f1f5f9', dim: '#94a3b8', primary: '#6366f1', green: '#22c55e',
  red: '#ef4444', white: '#fff',
};
const PAL = ['#6366f1','#22c55e','#ef4444','#f59e0b','#06b6d4','#ec4899','#8b5cf6','#14b8a6','#f97316','#84cc16','#0ea5e9','#a855f7'];
const colorFor = (k = '') => { let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0; return PAL[h % PAL.length]; };
const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const compLabel = (c) => { if (!c || !c.includes('/')) return c || '—'; const [m, y] = c.split('/'); return `${MESES[+m - 1] || m} ${y}`; };
const compRef = (c) => { if (!c || !c.includes('/')) return null; const [m, y] = c.split('/'); return `${y}-${m.padStart(2, '0')}-01`; };
const nowComp = () => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };

// ============ LOGIN ============
function Login() {
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email || !pass) return Alert.alert('Atenção', 'Preencha e-mail e senha.');
    setBusy(true);
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pass });
        if (error) throw error;
        if (!data.session) { Alert.alert('Confirme seu e-mail', 'Enviamos um link de confirmação.'); setMode('in'); }
      }
    } catch (e) { Alert.alert('Erro', e.message); } finally { setBusy(false); }
  };
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <View style={s.logo}><Ionicons name="wallet" size={38} color={C.white} /></View>
          <Text style={{ color: C.text, fontSize: 24, fontWeight: '700' }}>Controle Financeiro</Text>
          <Text style={{ color: C.dim, marginTop: 4 }}>Contas e cartões no seu bolso</Text>
        </View>
        <Text style={s.label}>E-mail</Text>
        <TextInput style={s.input} autoCapitalize="none" keyboardType="email-address" placeholder="voce@email.com" placeholderTextColor={C.dim} value={email} onChangeText={setEmail} />
        <Text style={s.label}>Senha</Text>
        <TextInput style={s.input} secureTextEntry placeholder="••••••••" placeholderTextColor={C.dim} value={pass} onChangeText={setPass} />
        <TouchableOpacity style={s.btn} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color={C.white} /> : <Text style={s.btnT}>{mode === 'in' ? 'Entrar' : 'Criar conta'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode(mode === 'in' ? 'up' : 'in')}>
          <Text style={{ color: C.primary, textAlign: 'center', marginTop: 18 }}>
            {mode === 'in' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============ APP PRINCIPAL ============
function Main({ session }) {
  const [tab, setTab] = useState('resumo');
  const [rows, setRows] = useState([]);
  const [comp, setComp] = useState(nowComp());
  const [comps, setComps] = useState([]);
  const [cats, setCats] = useState([]);
  const [formas, setFormas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: ls }, { data: cs }, { data: fs }] = await Promise.all([
        supabase.from('lancamentos').select('*').order('competencia_ref', { ascending: false }),
        supabase.from('categorias').select('nome').order('nome'),
        supabase.from('formas_pagamento').select('nome').order('nome'),
      ]);
      setRows(ls || []);
      setCats((cs || []).map((x) => x.nome));
      setFormas((fs || []).map((x) => x.nome));
      const uniq = [...new Set((ls || []).map((l) => l.competencia).filter(Boolean))];
      setComps(uniq);
      if (uniq.length && !uniq.includes(comp)) setComp(uniq[0]);
    } catch (e) { Alert.alert('Erro', e.message); } finally { setLoading(false); }
  }, [comp]);
  useEffect(() => { load(); }, []); // eslint-disable-line

  const doMes = useMemo(() => rows.filter((r) => r.competencia === comp), [rows, comp]);
  const tot = useMemo(() => {
    let e = 0, sa = 0;
    doMes.forEach((r) => { if (r.tipo === 'CRÉDITO') e += Math.abs(r.valor); else sa += Math.abs(r.valor); });
    return { e, sa, saldo: e - sa };
  }, [doMes]);
  const porCat = useMemo(() => {
    const m = new Map();
    doMes.forEach((r) => { if (r.tipo === 'DÉBITO') m.set(r.categoria || 'Outros', (m.get(r.categoria || 'Outros') || 0) + Math.abs(r.valor)); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [doMes]);
  const maxCat = porCat[0]?.[1] || 1;

  const save = async (f) => {
    const v = Math.abs(parseFloat(String(f.valor).replace(',', '.')) || 0);
    if (!f.descricao?.trim()) return Alert.alert('Atenção', 'Informe a descrição.');
    if (!v) return Alert.alert('Atenção', 'Informe o valor.');
    if (!/^\d{2}\/\d{4}$/.test(f.competencia || '')) return Alert.alert('Atenção', 'Competência MM/AAAA.');
    const payload = {
      descricao: f.descricao.trim(), valor: v, tipo: f.tipo,
      valor_final: f.tipo === 'CRÉDITO' ? v : -v, categoria: f.categoria || null,
      forma_pagamento: f.forma_pagamento || null, pagador: f.pagador || null,
      parcelas_total: f.parcelas_total || 1, competencia: f.competencia,
      competencia_ref: compRef(f.competencia), data_pagamento: f.data_pagamento || null,
    };
    try {
      if (f.id) await supabase.from('lancamentos').update(payload).eq('id', f.id);
      else await supabase.from('lancamentos').insert(payload);
      setEdit(null); load();
    } catch (e) { Alert.alert('Erro', e.message); }
  };
  const del = (id) => Alert.alert('Excluir', 'Excluir este lançamento?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: async () => { await supabase.from('lancamentos').delete().eq('id', id); setEdit(null); load(); } },
  ]);

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 60 }} color={C.primary} size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe}>
      {/* header */}
      <View style={s.head}>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>
          {tab === 'resumo' ? 'Resumo' : 'Lançamentos'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <MonthPicker comp={comp} comps={comps} onPick={setComp} />
          <TouchableOpacity onPress={() => supabase.auth.signOut()}><Ionicons name="log-out-outline" size={22} color={C.dim} /></TouchableOpacity>
        </View>
      </View>

      {tab === 'resumo' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
          <View style={s.balance}>
            <Text style={{ color: 'rgba(255,255,255,.8)', fontSize: 13 }}>Saldo de {compLabel(comp)}</Text>
            <Text style={{ color: tot.saldo >= 0 ? '#bbf7d0' : '#fecaca', fontSize: 32, fontWeight: '800', marginTop: 4 }}>{brl(tot.saldo)}</Text>
            <View style={{ flexDirection: 'row', gap: 24, marginTop: 16 }}>
              <View><Text style={s.bl}>Entradas</Text><Text style={{ color: '#bbf7d0', fontWeight: '700' }}>{brl(tot.e)}</Text></View>
              <View><Text style={s.bl}>Saídas</Text><Text style={{ color: '#fecaca', fontWeight: '700' }}>{brl(tot.sa)}</Text></View>
            </View>
          </View>
          <Text style={s.sec}>Maiores categorias</Text>
          <View style={s.box}>
            {porCat.length === 0 && <Text style={{ color: C.dim }}>Sem gastos nesta competência.</Text>}
            {porCat.map(([n, v]) => (
              <View key={n} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ color: C.text }}>{n}</Text><Text style={{ color: C.dim }}>{brl(v)}</Text>
                </View>
                <View style={s.barBg}><View style={[s.barFill, { width: `${(v / maxCat) * 100}%`, backgroundColor: colorFor(n) }]} /></View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={doMes}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          ListEmptyComponent={<Text style={{ color: C.dim, textAlign: 'center', marginTop: 40 }}>Nenhum lançamento nesta competência.</Text>}
          renderItem={({ item }) => {
            const cred = item.tipo === 'CRÉDITO';
            return (
              <TouchableOpacity style={s.row} onPress={() => setEdit(item)}>
                <View style={[s.icon, { backgroundColor: colorFor(item.categoria) + '33' }]}>
                  <Ionicons name={cred ? 'arrow-down' : 'arrow-up'} size={16} color={cred ? C.green : C.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '600' }} numberOfLines={1}>{item.descricao}</Text>
                  <Text style={{ color: C.dim, fontSize: 12 }} numberOfLines={1}>{(item.categoria || '—') + ' · ' + (item.forma_pagamento || '—')}</Text>
                </View>
                <Text style={{ color: cred ? C.green : C.red, fontWeight: '700' }}>{(cred ? '+' : '-') + brl(Math.abs(item.valor)).replace('R$', '').trim()}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* FAB */}
      {tab === 'lanc' && (
        <TouchableOpacity style={s.fab} onPress={() => setEdit({ tipo: 'DÉBITO', competencia: comp, parcelas_total: 1 })}>
          <Ionicons name="add" size={30} color={C.white} />
        </TouchableOpacity>
      )}

      {/* tab bar */}
      <View style={s.tabbar}>
        {[['resumo', 'home', 'Resumo'], ['lanc', 'list', 'Lançamentos']].map(([k, ic, lb]) => (
          <TouchableOpacity key={k} style={{ alignItems: 'center' }} onPress={() => setTab(k)}>
            <Ionicons name={ic} size={22} color={tab === k ? C.primary : C.dim} />
            <Text style={{ color: tab === k ? C.primary : C.dim, fontSize: 11, marginTop: 2 }}>{lb}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {edit && <EditModal item={edit} cats={cats} formas={formas} onSave={save} onDel={del} onClose={() => setEdit(null)} />}
    </SafeAreaView>
  );
}

function MonthPicker({ comp, comps, onPick }) {
  const [open, setOpen] = useState(false);
  const list = comps.includes(comp) ? comps : [comp, ...comps];
  return (
    <>
      <TouchableOpacity style={s.pill} onPress={() => setOpen(true)}>
        <Ionicons name="calendar-outline" size={14} color={C.primary} />
        <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{compLabel(comp)}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetT}>Competência</Text>
            <FlatList data={list} keyExtractor={(i) => i} style={{ maxHeight: 340 }} renderItem={({ item }) => (
              <TouchableOpacity style={s.opt} onPress={() => { onPick(item); setOpen(false); }}>
                <Text style={{ color: item === comp ? C.primary : C.text, fontWeight: item === comp ? '700' : '400' }}>{compLabel(item)}</Text>
              </TouchableOpacity>
            )} />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function Picker({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.input} onPress={() => setOpen(true)}>
        <Text style={{ color: value ? C.text : C.dim }}>{value || 'Selecione'}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetT}>{label}</Text>
            <FlatList data={options} keyExtractor={(i) => i} style={{ maxHeight: 360 }} renderItem={({ item }) => (
              <TouchableOpacity style={s.opt} onPress={() => { onChange(item); setOpen(false); }}>
                <Text style={{ color: item === value ? C.primary : C.text }}>{item}</Text>
              </TouchableOpacity>
            )} />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function EditModal({ item, cats, formas, onSave, onDel, onClose }) {
  const [f, setF] = useState(item);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.sheet, { maxHeight: '92%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={s.sheetT}>{f.id ? 'Editar' : 'Novo lançamento'}</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
                {['DÉBITO', 'CRÉDITO'].map((t) => (
                  <TouchableOpacity key={t} style={[s.tipo, f.tipo === t && { backgroundColor: t === 'CRÉDITO' ? C.green : C.red, borderColor: 'transparent' }]} onPress={() => set('tipo', t)}>
                    <Text style={{ color: f.tipo === t ? C.white : C.text, fontWeight: '700' }}>{t === 'DÉBITO' ? 'Saída' : 'Entrada'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.label}>Descrição</Text>
              <TextInput style={s.input} placeholder="Ex: Mercado" placeholderTextColor={C.dim} value={f.descricao || ''} onChangeText={(t) => set('descricao', t)} />
              <Text style={s.label}>Valor (R$)</Text>
              <TextInput style={s.input} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={C.dim} value={f.valor != null ? String(f.valor) : ''} onChangeText={(t) => set('valor', t)} />
              <Picker label="Categoria" value={f.categoria} options={cats} onChange={(v) => set('categoria', v)} />
              <Picker label="Forma de pagamento" value={f.forma_pagamento} options={formas} onChange={(v) => set('forma_pagamento', v)} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Competência (MM/AAAA)</Text>
                  <TextInput style={s.input} placeholder="06/2026" placeholderTextColor={C.dim} value={f.competencia || ''} onChangeText={(t) => set('competencia', t)} />
                </View>
                <View style={{ width: 96 }}>
                  <Text style={s.label}>Parcelas</Text>
                  <TextInput style={s.input} keyboardType="number-pad" placeholder="1" placeholderTextColor={C.dim} value={f.parcelas_total ? String(f.parcelas_total) : ''} onChangeText={(t) => set('parcelas_total', parseInt(t, 10) || 1)} />
                </View>
              </View>
              <TouchableOpacity style={[s.btn, { marginTop: 20 }]} onPress={() => onSave(f)}><Text style={s.btnT}>Salvar</Text></TouchableOpacity>
              {f.id && <TouchableOpacity style={{ padding: 14, alignItems: 'center' }} onPress={() => onDel(f.id)}><Text style={{ color: C.red, fontWeight: '600' }}>Excluir</Text></TouchableOpacity>}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (!ready) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 80 }} color={C.primary} size="large" /></SafeAreaView>;
  return session ? <Main session={session} /> : <Login />;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  logo: { width: 74, height: 74, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  label: { color: C.dim, fontSize: 13, marginTop: 12, marginBottom: 5 },
  input: { backgroundColor: C.card, borderRadius: 12, padding: 13, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, justifyContent: 'center' },
  btn: { backgroundColor: C.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 18 },
  btnT: { color: C.white, fontSize: 16, fontWeight: '700' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  balance: { backgroundColor: C.primary, borderRadius: 20, padding: 20 },
  bl: { color: 'rgba(255,255,255,.75)', fontSize: 12 },
  sec: { color: C.text, fontSize: 16, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  box: { backgroundColor: C.card, borderRadius: 16, padding: 16 },
  barBg: { height: 8, backgroundColor: C.cardAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 12, marginBottom: 8 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: C.border },
  fab: { position: 'absolute', right: 20, bottom: 78, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  tabbar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 58, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  sheetT: { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  opt: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  tipo: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
});
