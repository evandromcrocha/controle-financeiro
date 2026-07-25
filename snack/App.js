// Controle Financeiro — versão COMPLETA single-file para Expo Snack (snack.expo.dev)
// Cole este arquivo em App.js num Snack novo. No celular, use o app "Expo Go".
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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

const SUPABASE_URL = 'https://fjlphewbocclfwzwlymy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Sbs85eyq_D4oKbJ4-LDE6g_aWV-KE3S';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  db: { schema: 'financeiro' },
});

const C = {
  bg: '#0b1020', card: '#161d33', cardAlt: '#232c47', border: '#2a3350',
  text: '#f1f5f9', dim: '#8b96b3', primary: '#6d5efc', primary2: '#8b7dff',
  green: '#2ecc71', greenBg: '#12351f', red: '#ff5a6a', redBg: '#3a1620',
  amber: '#f5a524', white: '#fff',
};
const PAL = ['#6d5efc','#2ecc71','#ff5a6a','#f5a524','#22b8cf','#e64980','#9775fa','#12b886','#ff922b','#82c91e','#4dabf7','#cc5de8'];
const colorFor = (k = '') => { let h = 0; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0; return PAL[h % PAL.length]; };
const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const compLabel = (c) => { if (!c || !c.includes('/')) return c || '—'; const [m, y] = c.split('/'); return `${MESES[+m - 1] || m} ${y}`; };
const compRef = (c) => { if (!c || !c.includes('/')) return null; const [m, y] = c.split('/'); return `${y}-${m.padStart(2, '0')}-01`; };
const nowComp = () => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
const isoToBr = (s) => { if (!s) return ''; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
const brToIso = (s) => { const [d, m, y] = s.split('/'); return `${y}-${m}-${d}`; };
const shiftComp = (c, delta) => {
  const [m, y] = c.split('/').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const catIcon = (n = '') => {
  const k = n.toUpperCase();
  const map = { ALIMENTAÇÃO: 'restaurant', CASA: 'home', CARRO: 'car-sport', GASOLINA: 'car', SAÚDE: 'medkit', ROLÊ: 'beer', ENTRETENIMENTO: 'game-controller', PRESENTE: 'gift', SALÁRIO: 'cash', CELULAR: 'phone-portrait', INTERNET: 'wifi', IMPOSTO: 'document-text', SEGURO: 'shield-checkmark', VIAGEM: 'airplane', VESTUÁRIO: 'shirt', LOTERIA: 'ticket', BANCO: 'business', CONTADOR: 'calculator', EDUCAÇÃO: 'school', ESTÉTICA: 'cut', UBER: 'car', COMPRAS: 'bag-handle' };
  return map[k] || 'pricetag';
};

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
          <Text style={{ color: C.text, fontSize: 26, fontWeight: '800' }}>Controle Financeiro</Text>
          <Text style={{ color: C.dim, marginTop: 4 }}>Contas e cartões no seu bolso</Text>
        </View>
        <Text style={s.label}>E-mail</Text>
        <TextInput style={s.input} autoCapitalize="none" keyboardType="email-address" placeholder="voce@email.com" placeholderTextColor={C.dim} value={email} onChangeText={setEmail} />
        <Text style={s.label}>Senha</Text>
        <TextInput style={s.input} secureTextEntry placeholder="••••••••" placeholderTextColor={C.dim} value={pass} onChangeText={setPass} />
        <TouchableOpacity style={s.btn} onPress={submit} disabled={busy} activeOpacity={0.85}>
          {busy ? <ActivityIndicator color={C.white} /> : <Text style={s.btnT}>{mode === 'in' ? 'Entrar' : 'Criar conta'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode(mode === 'in' ? 'up' : 'in')}>
          <Text style={{ color: C.primary2, textAlign: 'center', marginTop: 18 }}>
            {mode === 'in' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============ util UI ============
function MonthPicker({ comp, comps, onPick }) {
  const [open, setOpen] = useState(false);
  const list = comps.includes(comp) ? comps : [comp, ...comps];
  return (
    <>
      <TouchableOpacity style={s.pill} onPress={() => setOpen(true)}>
        <Ionicons name="calendar-outline" size={14} color={C.primary2} />
        <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{compLabel(comp)}</Text>
        <Ionicons name="chevron-down" size={14} color={C.dim} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetT}>Competência</Text>
            <FlatList data={list} keyExtractor={(i) => i} style={{ maxHeight: 360 }} renderItem={({ item }) => (
              <TouchableOpacity style={s.opt} onPress={() => { onPick(item); setOpen(false); }}>
                <Text style={{ color: item === comp ? C.primary2 : C.text, fontWeight: item === comp ? '700' : '400' }}>{compLabel(item)}</Text>
              </TouchableOpacity>
            )} />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
function Bar({ pct, color, h = 8 }) {
  return <View style={[s.barBg, { height: h }]}><View style={[s.barFill, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color, height: h }]} /></View>;
}

// ============ ASSISTENTE DE ADICIONAR (tela cheia, passo a passo) ============
const STEPS = ['tipo', 'valor', 'descricao', 'categoria', 'forma', 'quando', 'revisar'];

function Wizard({ initial, cats, formas, onSave, onDel, onClose }) {
  const editing = !!initial.id;
  const [step, setStep] = useState(editing ? 6 : 0);
  const [tipo, setTipo] = useState(initial.tipo || 'DÉBITO');
  const [cents, setCents] = useState(initial.valor != null ? String(Math.round(initial.valor * 100)) : '');
  const [descricao, setDescricao] = useState(initial.descricao || '');
  const [categoria, setCategoria] = useState(initial.categoria || null);
  const [forma, setForma] = useState(initial.forma_pagamento || null);
  const [comp, setComp] = useState(initial.competencia && /^\d{2}\/\d{4}$/.test(initial.competencia) ? initial.competencia : nowComp());
  const [parcelas, setParcelas] = useState(initial.parcelas_total || 1);
  const [venc, setVenc] = useState(initial.data_pagamento ? isoToBr(initial.data_pagamento) : '');
  const [catQ, setCatQ] = useState('');

  const valorNum = (parseInt(cents || '0', 10)) / 100;
  const key = STEPS[step];
  const next = () => setStep((x) => Math.min(STEPS.length - 1, x + 1));
  const back = () => (step === 0 ? onClose() : setStep((x) => x - 1));

  const press = (d) => {
    if (d === 'del') setCents((c) => c.slice(0, -1));
    else setCents((c) => { const n = (c + d).replace(/^0+/, ''); return n.length > 9 ? c : n; });
  };

  const salvar = () => {
    if (valorNum <= 0) { setStep(1); return Alert.alert('Atenção', 'Informe o valor.'); }
    if (!descricao.trim()) { setStep(2); return Alert.alert('Atenção', 'Informe a descrição.'); }
    if (venc && !/^\d{2}\/\d{2}\/\d{4}$/.test(venc.trim())) { setStep(5); return Alert.alert('Atenção', 'Vencimento deve ser DD/MM/AAAA (ou deixe vazio).'); }
    onSave({
      id: initial.id, tipo, valor: valorNum, descricao: descricao.trim(),
      categoria, forma_pagamento: forma, competencia: comp, parcelas_total: parcelas,
      data_pagamento: venc ? brToIso(venc.trim()) : null,
    });
  };

  const catList = cats.filter((c) => c.toLowerCase().includes(catQ.trim().toLowerCase()));
  const accent = tipo === 'CRÉDITO' ? C.green : C.red;

  return (
    <Modal visible animationType="slide" onRequestClose={back}>
      <SafeAreaView style={[s.safe, { flex: 1 }]}>
        {/* topo: progresso */}
        <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity onPress={back} hitSlop={12}><Ionicons name={step === 0 ? 'close' : 'arrow-back'} size={26} color={C.text} /></TouchableOpacity>
            <Text style={{ color: C.dim, fontWeight: '600' }}>{editing ? 'Editar' : 'Novo lançamento'}</Text>
            <View style={{ width: 26 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {STEPS.map((_, i) => (
              <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? accent : C.cardAlt }} />
            ))}
          </View>
        </View>

        <View style={{ flex: 1, padding: 20 }}>
          {/* PASSO 1: TIPO */}
          {key === 'tipo' && (
            <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
              <Text style={s.qTitle}>O que você quer registrar?</Text>
              <TouchableOpacity style={[s.bigChoice, { borderColor: C.red }]} activeOpacity={0.85} onPress={() => { setTipo('DÉBITO'); next(); }}>
                <View style={[s.choiceIcon, { backgroundColor: C.redBg }]}><Ionicons name="arrow-up" size={30} color={C.red} /></View>
                <View><Text style={s.choiceT}>Saída</Text><Text style={s.choiceS}>Um gasto / despesa</Text></View>
                <Ionicons name="chevron-forward" size={22} color={C.dim} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.bigChoice, { borderColor: C.green }]} activeOpacity={0.85} onPress={() => { setTipo('CRÉDITO'); next(); }}>
                <View style={[s.choiceIcon, { backgroundColor: C.greenBg }]}><Ionicons name="arrow-down" size={30} color={C.green} /></View>
                <View><Text style={s.choiceT}>Entrada</Text><Text style={s.choiceS}>Um recebimento / renda</Text></View>
                <Ionicons name="chevron-forward" size={22} color={C.dim} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>
          )}

          {/* PASSO 2: VALOR (teclado próprio) */}
          {key === 'valor' && (
            <View style={{ flex: 1 }}>
              <Text style={s.qTitle}>Qual o valor?</Text>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: accent, fontSize: 52, fontWeight: '800' }}>{brl(valorNum)}</Text>
              </View>
              <View>
                {[['1','2','3'],['4','5','6'],['7','8','9'],['00','0','del']].map((r, ri) => (
                  <View key={ri} style={{ flexDirection: 'row' }}>
                    {r.map((d) => (
                      <TouchableOpacity key={d} style={s.keyBtn} activeOpacity={0.6} onPress={() => press(d)}>
                        {d === 'del' ? <Ionicons name="backspace-outline" size={26} color={C.text} /> : <Text style={s.keyT}>{d}</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
              <TouchableOpacity style={[s.btn, { backgroundColor: accent }]} onPress={() => valorNum > 0 ? next() : Alert.alert('Atenção', 'Digite um valor.')} activeOpacity={0.85}>
                <Text style={s.btnT}>Continuar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PASSO 3: DESCRIÇÃO */}
          {key === 'descricao' && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
              <Text style={s.qTitle}>Descreva o lançamento</Text>
              <TextInput
                style={s.bigInput} placeholder="Ex: Mercado, Salário, Uber..." placeholderTextColor={C.dim}
                value={descricao} onChangeText={setDescricao} autoFocus returnKeyType="done" onSubmitEditing={() => descricao.trim() && next()}
              />
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={[s.btn, { backgroundColor: accent }]} onPress={() => descricao.trim() ? next() : Alert.alert('Atenção', 'Escreva uma descrição.')} activeOpacity={0.85}>
                <Text style={s.btnT}>Continuar</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          )}

          {/* PASSO 4: CATEGORIA */}
          {key === 'categoria' && (
            <View style={{ flex: 1 }}>
              <Text style={s.qTitle}>Categoria</Text>
              <View style={[s.search, { marginHorizontal: 0, marginBottom: 12 }]}>
                <Ionicons name="search" size={17} color={C.dim} />
                <TextInput style={{ flex: 1, color: C.text, paddingVertical: 9, marginLeft: 8 }} placeholder="Buscar..." placeholderTextColor={C.dim} value={catQ} onChangeText={setCatQ} />
              </View>
              <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {catList.map((c) => (
                  <TouchableOpacity key={c} style={[s.chip, categoria === c && { borderColor: colorFor(c), backgroundColor: colorFor(c) + '22' }]} onPress={() => { setCategoria(c); next(); }}>
                    <View style={[s.chipIcon, { backgroundColor: colorFor(c) }]}><Ionicons name={catIcon(c)} size={16} color={C.white} /></View>
                    <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={[s.btnGhost]} onPress={() => { setCategoria(null); next(); }}><Text style={{ color: C.dim, fontWeight: '600' }}>Pular / sem categoria</Text></TouchableOpacity>
            </View>
          )}

          {/* PASSO 5: FORMA */}
          {key === 'forma' && (
            <View style={{ flex: 1 }}>
              <Text style={s.qTitle}>Como foi pago?</Text>
              <ScrollView contentContainerStyle={{ gap: 10 }}>
                {formas.map((f) => {
                  const ic = f.tipo === 'CARTAO' ? 'card' : f.tipo === 'CONTA' ? 'business' : 'cash';
                  return (
                    <TouchableOpacity key={f.nome} style={[s.bigChoice, forma === f.nome && { borderColor: colorFor(f.nome) }]} onPress={() => { setForma(f.nome); next(); }} activeOpacity={0.85}>
                      <View style={[s.choiceIcon, { backgroundColor: colorFor(f.nome) }]}><Ionicons name={ic} size={22} color={C.white} /></View>
                      <View><Text style={s.choiceT}>{f.nome}</Text><Text style={s.choiceS}>{f.tipo === 'CARTAO' ? 'Cartão' : f.tipo === 'CONTA' ? 'Conta' : 'Dinheiro'}{f.dia_vencimento ? ` · vence dia ${f.dia_vencimento}` : ''}</Text></View>
                      {forma === f.nome && <Ionicons name="checkmark-circle" size={22} color={colorFor(f.nome)} style={{ marginLeft: 'auto' }} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={[s.btnGhost]} onPress={() => { setForma(null); next(); }}><Text style={{ color: C.dim, fontWeight: '600' }}>Pular</Text></TouchableOpacity>
            </View>
          )}

          {/* PASSO 6: QUANDO */}
          {key === 'quando' && (
            <View style={{ flex: 1 }}>
              <Text style={s.qTitle}>Quando entra na conta?</Text>
              <Text style={s.subLabel}>Mês de competência</Text>
              <View style={s.monthRow}>
                <TouchableOpacity onPress={() => setComp((c) => shiftComp(c, -1))} style={s.monthArrow}><Ionicons name="chevron-back" size={22} color={C.text} /></TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' }}>{compLabel(comp)}</Text>
                <TouchableOpacity onPress={() => setComp((c) => shiftComp(c, 1))} style={s.monthArrow}><Ionicons name="chevron-forward" size={22} color={C.text} /></TouchableOpacity>
              </View>
              <Text style={[s.subLabel, { marginTop: 22 }]}>Parcelas</Text>
              <View style={s.monthRow}>
                <TouchableOpacity onPress={() => setParcelas((p) => Math.max(1, p - 1))} style={s.monthArrow}><Ionicons name="remove" size={22} color={C.text} /></TouchableOpacity>
                <Text style={{ color: C.text, fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' }}>{parcelas}x</Text>
                <TouchableOpacity onPress={() => setParcelas((p) => p + 1)} style={s.monthArrow}><Ionicons name="add" size={22} color={C.text} /></TouchableOpacity>
              </View>
              <Text style={[s.subLabel, { marginTop: 22 }]}>Data de vencimento (opcional)</Text>
              <TextInput style={s.input} placeholder="DD/MM/AAAA" placeholderTextColor={C.dim} keyboardType="numbers-and-punctuation" value={venc} onChangeText={setVenc} />
              {(() => {
                const cardObj = formas.find((f) => f.nome === forma);
                if (cardObj?.dia_vencimento && !venc) {
                  const [mm, yy] = comp.split('/');
                  const sug = `${String(cardObj.dia_vencimento).padStart(2, '0')}/${mm}/${yy}`;
                  return (
                    <TouchableOpacity onPress={() => setVenc(sug)} style={{ marginTop: 8 }}>
                      <Text style={{ color: C.primary2, fontSize: 13 }}>Usar vencimento do cartão: {sug}</Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })()}
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={[s.btn, { backgroundColor: accent }]} onPress={next} activeOpacity={0.85}><Text style={s.btnT}>Continuar</Text></TouchableOpacity>
            </View>
          )}

          {/* PASSO 7: REVISAR */}
          {key === 'revisar' && (
            <View style={{ flex: 1 }}>
              <Text style={s.qTitle}>{editing ? 'Confira e salve' : 'Tudo certo?'}</Text>
              <View style={[s.box, { alignItems: 'center', paddingVertical: 24 }]}>
                <View style={[s.choiceIcon, { backgroundColor: tipo === 'CRÉDITO' ? C.greenBg : C.redBg, marginBottom: 10 }]}>
                  <Ionicons name={tipo === 'CRÉDITO' ? 'arrow-down' : 'arrow-up'} size={26} color={accent} />
                </View>
                <Text style={{ color: accent, fontSize: 34, fontWeight: '800' }}>{brl(valorNum)}</Text>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '600', marginTop: 4 }}>{descricao || '—'}</Text>
              </View>
              <RevRow icon="pricetag" label="Categoria" value={categoria || '—'} onPress={() => setStep(3)} />
              <RevRow icon="wallet" label="Pagamento" value={forma || '—'} onPress={() => setStep(4)} />
              <RevRow icon="calendar" label="Competência" value={compLabel(comp)} onPress={() => setStep(5)} />
              <RevRow icon="alarm" label="Vencimento" value={venc || '—'} onPress={() => setStep(5)} />
              <RevRow icon="albums" label="Parcelas" value={`${parcelas}x`} onPress={() => setStep(5)} />
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={[s.btn, { backgroundColor: accent }]} onPress={salvar} activeOpacity={0.85}>
                <Text style={s.btnT}>{editing ? 'Salvar alterações' : 'Salvar lançamento'}</Text>
              </TouchableOpacity>
              {editing && <TouchableOpacity style={{ padding: 14, alignItems: 'center' }} onPress={() => onDel(initial.id)}><Text style={{ color: C.red, fontWeight: '600' }}>Excluir</Text></TouchableOpacity>}
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
function RevRow({ icon, label, value, onPress }) {
  return (
    <TouchableOpacity style={s.revRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={18} color={C.dim} />
      <Text style={{ color: C.dim, marginLeft: 10, flex: 1 }}>{label}</Text>
      <Text style={{ color: C.text, fontWeight: '600', marginRight: 6 }}>{value}</Text>
      <Ionicons name="pencil" size={15} color={C.dim} />
    </TouchableOpacity>
  );
}

// ============ APP PRINCIPAL ============
function Main() {
  const [tab, setTab] = useState('resumo');
  const [rows, setRows] = useState([]);
  const [comp, setComp] = useState(nowComp());
  const [comps, setComps] = useState([]);
  const [cats, setCats] = useState([]);
  const [formas, setFormas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wiz, setWiz] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: ls }, { data: cs }, { data: fs }] = await Promise.all([
        supabase.from('lancamentos').select('*').order('competencia_ref', { ascending: false }),
        supabase.from('categorias').select('id,nome').order('nome'),
        supabase.from('formas_pagamento').select('id,nome,tipo,dia_vencimento').order('nome'),
      ]);
      setRows(ls || []); setCats(cs || []); setFormas(fs || []);
      const uniq = [...new Set((ls || []).map((l) => l.competencia).filter(Boolean))];
      setComps(uniq);
      setComp((cur) => (uniq.includes(cur) ? cur : (uniq[0] || cur)));
    } catch (e) { Alert.alert('Erro', e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const catNames = useMemo(() => cats.map((c) => c.nome), [cats]);
  const doMes = useMemo(() => rows.filter((r) => r.competencia === comp), [rows, comp]);

  const save = async (f) => {
    const v = Math.abs(Number(f.valor) || 0);
    const payload = {
      descricao: f.descricao, valor: v, tipo: f.tipo, valor_final: f.tipo === 'CRÉDITO' ? v : -v,
      categoria: f.categoria || null, forma_pagamento: f.forma_pagamento || null,
      parcelas_total: f.parcelas_total || 1, competencia: f.competencia, competencia_ref: compRef(f.competencia),
      data_pagamento: f.data_pagamento || null,
    };
    try {
      if (f.id) await supabase.from('lancamentos').update(payload).eq('id', f.id);
      else await supabase.from('lancamentos').insert(payload);
      setWiz(null); load();
    } catch (e) { Alert.alert('Erro', e.message); }
  };
  const del = (id) => Alert.alert('Excluir', 'Excluir este lançamento?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: async () => { await supabase.from('lancamentos').delete().eq('id', id); setWiz(null); load(); } },
  ]);

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 60 }} color={C.primary} size="large" /></SafeAreaView>;

  const titles = { resumo: 'Resumo', lanc: 'Lançamentos', rel: 'Relatórios', ajustes: 'Ajustes' };
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.head}>
        <Text style={{ color: C.text, fontSize: 24, fontWeight: '800' }}>{titles[tab]}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {(tab === 'resumo' || tab === 'lanc') && <MonthPicker comp={comp} comps={comps} onPick={setComp} />}
          <TouchableOpacity onPress={() => supabase.auth.signOut()}><Ionicons name="log-out-outline" size={22} color={C.dim} /></TouchableOpacity>
        </View>
      </View>

      {tab === 'resumo' && <Resumo doMes={doMes} comp={comp} />}
      {tab === 'lanc' && <Lancamentos doMes={doMes} onEdit={setWiz} />}
      {tab === 'rel' && <Relatorios rows={rows} />}
      {tab === 'ajustes' && <Ajustes formas={formas} cats={cats} rows={rows} reload={load} />}

      {(tab === 'resumo' || tab === 'lanc') && (
        <TouchableOpacity style={s.fab} activeOpacity={0.85} onPress={() => setWiz({ tipo: 'DÉBITO', competencia: comp })}>
          <Ionicons name="add" size={30} color={C.white} />
        </TouchableOpacity>
      )}

      <View style={s.tabbar}>
        {[['resumo', 'home', 'Resumo'], ['lanc', 'list', 'Lançar'], ['rel', 'pie-chart', 'Relatórios'], ['ajustes', 'settings', 'Ajustes']].map(([k, ic, lb]) => (
          <TouchableOpacity key={k} style={{ alignItems: 'center', flex: 1 }} onPress={() => setTab(k)}>
            <Ionicons name={ic} size={21} color={tab === k ? C.primary2 : C.dim} />
            <Text style={{ color: tab === k ? C.primary2 : C.dim, fontSize: 10, marginTop: 2, fontWeight: tab === k ? '700' : '400' }}>{lb}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {wiz && <Wizard initial={wiz} cats={catNames} formas={formas} onSave={save} onDel={del} onClose={() => setWiz(null)} />}
    </SafeAreaView>
  );
}

function Resumo({ doMes, comp }) {
  const tot = useMemo(() => {
    let e = 0, sa = 0;
    doMes.forEach((r) => { if (r.tipo === 'CRÉDITO') e += Math.abs(r.valor); else sa += Math.abs(r.valor); });
    return { e, sa, saldo: e - sa };
  }, [doMes]);
  const porForma = useMemo(() => {
    const m = new Map();
    doMes.forEach((r) => { if (r.tipo === 'DÉBITO') m.set(r.forma_pagamento || 'Outros', (m.get(r.forma_pagamento || 'Outros') || 0) + Math.abs(r.valor)); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [doMes]);
  const porCat = useMemo(() => {
    const m = new Map();
    doMes.forEach((r) => { if (r.tipo === 'DÉBITO') m.set(r.categoria || 'Outros', (m.get(r.categoria || 'Outros') || 0) + Math.abs(r.valor)); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [doMes]);
  const maxCat = porCat[0]?.[1] || 1;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
      <View style={s.balance}>
        <Text style={{ color: 'rgba(255,255,255,.85)', fontSize: 13 }}>Saldo de {compLabel(comp)}</Text>
        <Text style={{ color: C.white, fontSize: 34, fontWeight: '800', marginTop: 4 }}>{brl(tot.saldo)}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
          <View style={s.balCell}><Ionicons name="arrow-down-circle" size={18} color="#bbf7d0" /><View><Text style={s.bl}>Entradas</Text><Text style={{ color: C.white, fontWeight: '700' }}>{brl(tot.e)}</Text></View></View>
          <View style={s.balCell}><Ionicons name="arrow-up-circle" size={18} color="#fecaca" /><View><Text style={s.bl}>Saídas</Text><Text style={{ color: C.white, fontWeight: '700' }}>{brl(tot.sa)}</Text></View></View>
        </View>
      </View>

      {doMes.filter((r) => !r.categoria).length > 0 && (
        <View style={s.pendBanner}>
          <Ionicons name="alert-circle" size={20} color={C.amber} />
          <Text style={{ color: C.text, flex: 1, marginLeft: 8, fontSize: 13 }}>
            {doMes.filter((r) => !r.categoria).length} lançamento(s) para categorizar. Veja em <Text style={{ fontWeight: '700' }}>Lançar › Pendentes</Text>.
          </Text>
        </View>
      )}

      {porForma.length > 0 && <>
        <Text style={s.sec}>Gastos por cartão / conta</Text>
        <View style={s.box}>
          {porForma.map(([n, v], i) => (
            <View key={n} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
              <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: colorFor(n), marginRight: 10 }} />
              <Text style={{ color: C.text, flex: 1 }}>{n}</Text>
              <Text style={{ color: C.text, fontWeight: '600' }}>{brl(v)}</Text>
            </View>
          ))}
        </View>
      </>}

      <Text style={s.sec}>Maiores categorias</Text>
      <View style={s.box}>
        {porCat.length === 0 && <Text style={{ color: C.dim }}>Sem gastos nesta competência.</Text>}
        {porCat.map(([n, v]) => (
          <View key={n} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[s.miniIcon, { backgroundColor: colorFor(n) }]}><Ionicons name={catIcon(n)} size={12} color={C.white} /></View>
                <Text style={{ color: C.text }}>{n}</Text>
              </View>
              <Text style={{ color: C.dim }}>{brl(v)}</Text>
            </View>
            <Bar pct={(v / maxCat) * 100} color={colorFor(n)} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const isPend = (r) => !r.categoria;

function Lancamentos({ doMes, onEdit }) {
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('todos'); // todos | pendentes
  const pendCount = useMemo(() => doMes.filter(isPend).length, [doMes]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let base = filtro === 'pendentes' ? doMes.filter(isPend) : doMes;
    if (!t) return base;
    return base.filter((r) => (r.descricao || '').toLowerCase().includes(t) || (r.categoria || '').toLowerCase().includes(t) || (r.forma_pagamento || '').toLowerCase().includes(t));
  }, [doMes, q, filtro]);
  return (
    <View style={{ flex: 1 }}>
      <View style={s.search}><Ionicons name="search" size={17} color={C.dim} /><TextInput style={{ flex: 1, color: C.text, paddingVertical: 9, marginLeft: 8 }} placeholder="Buscar..." placeholderTextColor={C.dim} value={q} onChangeText={setQ} /></View>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 10 }}>
        {[['todos', 'Todos'], ['pendentes', `Pendentes${pendCount ? ` (${pendCount})` : ''}`]].map(([k, lb]) => (
          <TouchableOpacity key={k} style={[s.seg, filtro === k && { backgroundColor: k === 'pendentes' ? C.amber : C.primary, borderColor: 'transparent' }]} onPress={() => setFiltro(k)}>
            <Text style={{ color: filtro === k ? C.white : C.dim, fontWeight: '700', fontSize: 13 }}>{lb}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {filtro === 'pendentes' && pendCount > 0 && (
        <Text style={{ color: C.amber, fontSize: 12, paddingHorizontal: 16, marginTop: 8 }}>Toque em cada item e escolha a categoria para concluir.</Text>
      )}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        ListEmptyComponent={<Text style={{ color: C.dim, textAlign: 'center', marginTop: 40 }}>{filtro === 'pendentes' ? 'Nada pendente por aqui. 🎉' : 'Nenhum lançamento nesta competência.'}</Text>}
        renderItem={({ item }) => {
          const cred = item.tipo === 'CRÉDITO';
          const pend = isPend(item);
          return (
            <TouchableOpacity style={[s.row, pend && { borderColor: C.amber, borderWidth: 1.5 }]} onPress={() => onEdit(item)} activeOpacity={0.7}>
              <View style={[s.icon, { backgroundColor: (pend ? C.amber : colorFor(item.categoria)) + '2e' }]}>
                <Ionicons name={pend ? 'help' : catIcon(item.categoria)} size={17} color={pend ? C.amber : colorFor(item.categoria)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '600' }} numberOfLines={1}>{item.descricao}</Text>
                {pend ? (
                  <Text style={{ color: C.amber, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>⚠ Pendente · toque para categorizar</Text>
                ) : (
                  <Text style={{ color: C.dim, fontSize: 12 }} numberOfLines={1}>{(item.categoria || '—') + ' · ' + (item.forma_pagamento || '—') + (item.parcelas_total > 1 ? ` · ${item.parcelas_total}x` : '')}</Text>
                )}
              </View>
              <Text style={{ color: cred ? C.green : C.red, fontWeight: '700' }}>{(cred ? '+' : '-') + brl(Math.abs(item.valor)).replace('R$', '').trim()}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function Relatorios({ rows }) {
  const porCat = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => { if (r.tipo === 'DÉBITO') m.set(r.categoria || 'Outros', (m.get(r.categoria || 'Outros') || 0) + Math.abs(r.valor)); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const totalGasto = porCat.reduce((s2, [, v]) => s2 + v, 0);
  const porMes = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => {
      const key = r.competencia_ref || '0';
      const cur = m.get(key) || { comp: r.competencia, e: 0, sa: 0 };
      if (r.tipo === 'CRÉDITO') cur.e += Math.abs(r.valor); else cur.sa += Math.abs(r.valor);
      m.set(key, cur);
    });
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 12).map(([, v]) => v);
  }, [rows]);
  const maxMes = Math.max(1, ...porMes.map((m) => Math.max(m.e, m.sa)));
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
      <Text style={s.sec}>Evolução mensal</Text>
      <View style={s.box}>
        {porMes.length === 0 && <Text style={{ color: C.dim }}>Sem dados ainda.</Text>}
        {porMes.map((m) => (
          <View key={m.comp} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ color: C.text, fontWeight: '600' }}>{compLabel(m.comp)}</Text>
              <Text style={{ color: m.e - m.sa >= 0 ? C.green : C.red, fontWeight: '700' }}>{brl(m.e - m.sa)}</Text>
            </View>
            <Bar pct={(m.e / maxMes) * 100} color={C.green} />
            <View style={{ height: 3 }} />
            <Bar pct={(m.sa / maxMes) * 100} color={C.red} />
          </View>
        ))}
      </View>
      <Text style={s.sec}>Gastos por categoria (todo o período)</Text>
      <Text style={{ color: C.dim, marginBottom: 8 }}>Total: {brl(totalGasto)}</Text>
      <View style={s.box}>
        {porCat.map(([n, v]) => {
          const pct = totalGasto ? (v / totalGasto) * 100 : 0;
          return (
            <View key={n} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={[s.miniIcon, { backgroundColor: colorFor(n) }]}><Ionicons name={catIcon(n)} size={12} color={C.white} /></View>
                  <Text style={{ color: C.text }}>{n}</Text>
                </View>
                <Text style={{ color: C.dim, fontSize: 13 }}>{brl(v)}</Text>
              </View>
              <Bar pct={pct} color={colorFor(n)} />
              <Text style={{ color: C.dim, fontSize: 11, marginTop: 3, textAlign: 'right' }}>{pct.toFixed(1)}%</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function ImportarFatura({ formas, reload }) {
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);
  const cartoes = formas.filter((f) => f.tipo === 'CARTAO');

  const run = async (cartao) => {
    setPick(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) return;
      setBusy(true);
      const b64 = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
      const { data, error } = await supabase.functions.invoke('importar-fatura', { body: { pdfBase64: b64, cartao } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.erro || 'Falha ao importar.');
      Alert.alert('Fatura importada ✅',
        `Cartão: ${cartao}\nCompetência: ${data.competencia}\n\n${data.inseridos} lançamento(s) novo(s) adicionados como Pendentes.\n${data.ignorados} já existiam (ignorados).`);
      reload();
    } catch (e) {
      Alert.alert('Erro', e.message || String(e));
    } finally { setBusy(false); }
  };

  return (
    <>
      <TouchableOpacity style={s.importCard} activeOpacity={0.85} onPress={() => (cartoes.length ? setPick(true) : Alert.alert('Atenção', 'Cadastre um cartão primeiro.'))} disabled={busy}>
        <View style={[s.choiceIcon, { backgroundColor: 'rgba(255,255,255,.18)', width: 46, height: 46 }]}>
          {busy ? <ActivityIndicator color={C.white} /> : <Ionicons name="document-attach" size={24} color={C.white} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.white, fontSize: 16, fontWeight: '700' }}>{busy ? 'Lendo a fatura...' : 'Importar fatura (PDF)'}</Text>
          <Text style={{ color: 'rgba(255,255,255,.85)', fontSize: 12, marginTop: 2 }}>A IA lê o PDF e adiciona o que falta como Pendente</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={pick} transparent animationType="fade" onRequestClose={() => setPick(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setPick(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetT}>Qual cartão é essa fatura?</Text>
            {cartoes.map((f) => (
              <TouchableOpacity key={f.id} style={s.opt} onPress={() => run(f.nome)}>
                <Text style={{ color: C.text, fontSize: 15 }}>{f.nome}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function Ajustes({ formas, cats, rows, reload }) {
  const [cardEdit, setCardEdit] = useState(null);
  const [newCat, setNewCat] = useState('');
  const gastoForma = useMemo(() => {
    const m = new Map(); const cur = nowComp();
    rows.forEach((r) => { if (r.tipo === 'DÉBITO' && r.competencia === cur) m.set(r.forma_pagamento, (m.get(r.forma_pagamento) || 0) + Math.abs(r.valor)); });
    return m;
  }, [rows]);
  const saveCard = async (c) => {
    if (!c.nome?.trim()) return Alert.alert('Atenção', 'Informe o nome.');
    try {
      const payload = { nome: c.nome.trim(), tipo: c.tipo || 'CARTAO', dia_vencimento: c.dia_vencimento ?? null };
      if (c.id) await supabase.from('formas_pagamento').update(payload).eq('id', c.id);
      else await supabase.from('formas_pagamento').insert(payload);
      setCardEdit(null); reload();
    } catch (e) { Alert.alert('Erro', e.message); }
  };
  const delCard = (c) => Alert.alert('Excluir', `Remover "${c.nome}"?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: async () => { await supabase.from('formas_pagamento').delete().eq('id', c.id); setCardEdit(null); reload(); } },
  ]);
  const addCat = async () => {
    const n = newCat.trim().toUpperCase(); if (!n) return;
    try { await supabase.from('categorias').insert({ nome: n }); setNewCat(''); reload(); }
    catch (e) { Alert.alert('Erro', e.message.includes('duplicate') ? 'Essa categoria já existe.' : e.message); }
  };
  const delCat = (c) => Alert.alert('Excluir', `Remover a categoria "${c.nome}"?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: async () => { await supabase.from('categorias').delete().eq('id', c.id); reload(); } },
  ]);
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
      <ImportarFatura formas={formas} reload={reload} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[s.sec, { marginTop: 4 }]}>Cartões e contas</Text>
        <TouchableOpacity onPress={() => setCardEdit({ tipo: 'CARTAO' })}><Ionicons name="add-circle" size={28} color={C.primary2} /></TouchableOpacity>
      </View>
      {formas.map((f) => {
        const ic = f.tipo === 'CARTAO' ? 'card' : f.tipo === 'CONTA' ? 'business' : 'cash';
        return (
          <TouchableOpacity key={f.id} style={s.row} onPress={() => setCardEdit(f)} activeOpacity={0.7}>
            <View style={[s.badge, { backgroundColor: colorFor(f.nome) }]}><Ionicons name={ic} size={20} color={C.white} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontWeight: '600' }}>{f.nome}</Text>
              <Text style={{ color: C.dim, fontSize: 12 }}>{(f.tipo === 'CARTAO' ? 'Cartão' : f.tipo === 'CONTA' ? 'Conta' : 'Dinheiro') + (f.dia_vencimento ? ` · vence dia ${f.dia_vencimento}` : '')}</Text>
            </View>
            <Text style={{ color: C.red, fontWeight: '700', fontSize: 13 }}>{brl(gastoForma.get(f.nome) || 0)}</Text>
          </TouchableOpacity>
        );
      })}
      <Text style={[s.sec, { marginTop: 24 }]}>Categorias</Text>
      <View style={[s.search, { marginHorizontal: 0 }]}>
        <TextInput style={{ flex: 1, color: C.text, paddingVertical: 9 }} placeholder="Nova categoria..." placeholderTextColor={C.dim} value={newCat} onChangeText={setNewCat} autoCapitalize="characters" />
        <TouchableOpacity onPress={addCat}><Ionicons name="add-circle" size={26} color={C.primary2} /></TouchableOpacity>
      </View>
      <View style={[s.box, { marginTop: 10 }]}>
        {cats.map((c, i) => (
          <View key={c.id} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
            <View style={[s.miniIcon, { backgroundColor: colorFor(c.nome) }]}><Ionicons name={catIcon(c.nome)} size={12} color={C.white} /></View>
            <Text style={{ color: C.text, flex: 1, marginLeft: 10 }}>{c.nome}</Text>
            <TouchableOpacity onPress={() => delCat(c)} hitSlop={10}><Ionicons name="trash-outline" size={18} color={C.dim} /></TouchableOpacity>
          </View>
        ))}
      </View>
      {cardEdit && <CardModal item={cardEdit} onSave={saveCard} onDel={delCard} onClose={() => setCardEdit(null)} />}
    </ScrollView>
  );
}

function CardModal({ item, onSave, onDel, onClose }) {
  const [f, setF] = useState(item);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.sheet}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={s.sheetT}>{f.id ? 'Editar' : 'Novo'} cartão / conta</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>
            <Text style={s.label}>Nome</Text>
            <TextInput style={s.input} placeholder="Ex: Nubank" placeholderTextColor={C.dim} value={f.nome || ''} onChangeText={(t) => set('nome', t)} />
            <Text style={s.label}>Tipo</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['CARTAO', 'CONTA', 'DINHEIRO'].map((t) => (
                <TouchableOpacity key={t} style={[s.tipo, f.tipo === t && { backgroundColor: C.primary, borderColor: 'transparent' }]} onPress={() => set('tipo', t)}>
                  <Text style={{ color: f.tipo === t ? C.white : C.text, fontWeight: '600', fontSize: 13 }}>{t === 'CARTAO' ? 'Cartão' : t === 'CONTA' ? 'Conta' : 'Dinheiro'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {f.tipo === 'CARTAO' && <>
              <Text style={s.label}>Dia de vencimento</Text>
              <TextInput style={s.input} keyboardType="number-pad" placeholder="Ex: 6" placeholderTextColor={C.dim} value={f.dia_vencimento ? String(f.dia_vencimento) : ''} onChangeText={(t) => set('dia_vencimento', t ? parseInt(t, 10) : null)} />
            </>}
            <TouchableOpacity style={[s.btn, { marginTop: 18 }]} onPress={() => onSave(f)}><Text style={s.btnT}>Salvar</Text></TouchableOpacity>
            {f.id && <TouchableOpacity style={{ padding: 12, alignItems: 'center' }} onPress={() => onDel(f)}><Text style={{ color: C.red, fontWeight: '600' }}>Excluir</Text></TouchableOpacity>}
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
    const { data: sub } = supabase.auth.onAuthStateChange((_e, ss) => setSession(ss));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (!ready) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 80 }} color={C.primary} size="large" /></SafeAreaView>;
  return session ? <Main /> : <Login />;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  logo: { width: 76, height: 76, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  label: { color: C.dim, fontSize: 13, marginTop: 12, marginBottom: 5 },
  subLabel: { color: C.dim, fontSize: 13, marginBottom: 10, marginTop: 8 },
  input: { backgroundColor: C.card, borderRadius: 12, padding: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, justifyContent: 'center' },
  btn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 12 },
  btnT: { color: C.white, fontSize: 16, fontWeight: '700' },
  btnGhost: { padding: 14, alignItems: 'center', marginTop: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  balance: { backgroundColor: C.primary, borderRadius: 22, padding: 22, shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  balCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.12)', borderRadius: 14, padding: 10 },
  bl: { color: 'rgba(255,255,255,.8)', fontSize: 11 },
  sec: { color: C.text, fontSize: 16, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  box: { backgroundColor: C.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border },
  barBg: { backgroundColor: C.cardAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 16, padding: 13, marginBottom: 9, borderWidth: 1, borderColor: C.border },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  miniIcon: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: C.border },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: C.border },
  fab: { position: 'absolute', right: 20, bottom: 74, width: 60, height: 60, borderRadius: 30, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  tabbar: { flexDirection: 'row', alignItems: 'center', height: 62, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 30 },
  sheetT: { color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  opt: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  tipo: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  seg: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  importCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.primary, borderRadius: 18, padding: 16, marginBottom: 8, marginTop: 4, shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  pendBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3a2e12', borderRadius: 14, padding: 12, marginTop: 14, borderWidth: 1, borderColor: C.amber },
  // wizard
  qTitle: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 18 },
  bigChoice: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: C.border },
  choiceIcon: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  choiceT: { color: C.text, fontSize: 17, fontWeight: '700' },
  choiceS: { color: C.dim, fontSize: 12, marginTop: 2 },
  keyBtn: { flex: 1, margin: 5, height: 58, borderRadius: 16, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  keyT: { color: C.text, fontSize: 24, fontWeight: '700' },
  bigInput: { backgroundColor: C.card, borderRadius: 16, padding: 18, color: C.text, fontSize: 20, fontWeight: '600', borderWidth: 1, borderColor: C.border },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1.5, borderColor: C.border },
  chipIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, padding: 8, borderWidth: 1, borderColor: C.border },
  monthArrow: { width: 46, height: 46, borderRadius: 12, backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center' },
  revRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 15, marginBottom: 9, borderWidth: 1, borderColor: C.border },
});
