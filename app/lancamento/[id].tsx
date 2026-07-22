import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Modal, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import { currentComp } from '../../lib/format';
import {
  listCategorias, listFormas, upsertLancamento, deleteLancamento, listAllLancamentos,
} from '../../lib/api';
import type { Lancamento, Tipo } from '../../lib/types';

function Select({
  label, value, options, onChange, placeholder,
}: {
  label: string; value: string | null; options: string[];
  onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setOpen(true)}>
        <Text style={{ color: value ? colors.text : colors.textDim, fontSize: 15 }}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(i) => i}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optRow}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <Text style={[styles.optText, item === value && { color: colors.primary, fontWeight: '700' }]}>
                    {item}
                  </Text>
                  {item === value && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function LancamentoForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'novo';

  const [form, setForm] = useState<Partial<Lancamento>>({
    tipo: 'DÉBITO',
    competencia: currentComp(),
    parcelas_total: 1,
  });
  const [cats, setCats] = useState<string[]>([]);
  const [formas, setFormas] = useState<string[]>([]);
  const [pagadores, setPagadores] = useState<string[]>(['EVANDRO']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = useCallback(<K extends keyof Lancamento>(k: K, v: Lancamento[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [c, f, all] = await Promise.all([listCategorias(), listFormas(), listAllLancamentos()]);
        setCats(c.map((x) => x.nome));
        setFormas(f.map((x) => x.nome));
        const pg = [...new Set(all.map((x) => x.pagador).filter(Boolean))] as string[];
        if (pg.length) setPagadores(pg);
        if (!isNew) {
          const found = all.find((x) => x.id === id);
          if (found) setForm(found);
        }
      } catch (e: any) {
        Alert.alert('Erro', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const save = async () => {
    if (!form.descricao?.trim()) return Alert.alert('Atenção', 'Informe a descrição.');
    if (!form.valor || Number(form.valor) === 0) return Alert.alert('Atenção', 'Informe o valor.');
    if (!/^\d{2}\/\d{4}$/.test(form.competencia ?? '')) {
      return Alert.alert('Atenção', 'Competência deve estar no formato MM/AAAA.');
    }
    setSaving(true);
    try {
      await upsertLancamento(form);
      router.back();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('Excluir', 'Excluir este lançamento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => { await deleteLancamento(id!); router.back(); },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isNew ? 'Novo lançamento' : 'Editar'}</Text>
        {!isNew ? (
          <TouchableOpacity onPress={remove}>
            <Ionicons name="trash-outline" size={22} color={colors.red} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.tipoRow}>
            {(['DÉBITO', 'CRÉDITO'] as Tipo[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.tipoBtn,
                  form.tipo === t && { backgroundColor: t === 'CRÉDITO' ? colors.green : colors.red, borderColor: 'transparent' },
                ]}
                onPress={() => set('tipo', t)}
              >
                <Text style={[styles.tipoText, form.tipo === t && { color: colors.white }]}>
                  {t === 'DÉBITO' ? 'Saída' : 'Entrada'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Mercado"
            placeholderTextColor={colors.textDim}
            value={form.descricao ?? ''}
            onChangeText={(t) => set('descricao', t)}
          />

          <Text style={styles.label}>Valor (R$)</Text>
          <TextInput
            style={styles.input}
            placeholder="0,00"
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
            value={form.valor != null ? String(form.valor) : ''}
            onChangeText={(t) => set('valor', parseFloat(t.replace(',', '.')) || 0)}
          />

          <Select
            label="Categoria" value={form.categoria ?? null} options={cats}
            placeholder="Selecione" onChange={(v) => set('categoria', v)}
          />
          <Select
            label="Forma de pagamento" value={form.forma_pagamento ?? null} options={formas}
            placeholder="Selecione" onChange={(v) => set('forma_pagamento', v)}
          />
          <Select
            label="Pagador" value={form.pagador ?? null} options={pagadores}
            placeholder="Selecione" onChange={(v) => set('pagador', v)}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Competência (MM/AAAA)</Text>
              <TextInput
                style={styles.input}
                placeholder="06/2026"
                placeholderTextColor={colors.textDim}
                value={form.competencia ?? ''}
                onChangeText={(t) => set('competencia', t)}
              />
            </View>
            <View style={{ width: 110 }}>
              <Text style={styles.label}>Parcelas</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={colors.textDim}
                keyboardType="number-pad"
                value={form.parcelas_total ? String(form.parcelas_total) : ''}
                onChangeText={(t) => set('parcelas_total', parseInt(t, 10) || 1)}
              />
            </View>
          </View>

          <Text style={styles.label}>Data de pagamento (AAAA-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-06-15"
            placeholderTextColor={colors.textDim}
            value={form.data_pagamento ?? ''}
            onChangeText={(t) => set('data_pagamento', t)}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Salvar</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  tipoRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  tipoBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  tipoText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  label: { color: colors.textDim, fontSize: 13, marginTop: 14, marginBottom: 5 },
  input: {
    backgroundColor: colors.card, borderRadius: 12, padding: 13, color: colors.text,
    fontSize: 15, borderWidth: 1, borderColor: colors.border, justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 26,
  },
  saveText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgAlt, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 34,
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  optRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  optText: { color: colors.text, fontSize: 15 },
});
