import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, colorFor } from '../../lib/theme';
import { formatBRL, currentComp } from '../../lib/format';
import {
  listFormas, upsertForma, deleteForma, listLancamentos,
} from '../../lib/api';
import type { FormaPagamento, Lancamento } from '../../lib/types';

export default function Cartoes() {
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [rows, setRows] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<FormaPagamento> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, r] = await Promise.all([listFormas(), listLancamentos(currentComp())]);
      setFormas(f);
      setRows(r);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const gastoPorForma = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.tipo !== 'DÉBITO') continue;
      const k = r.forma_pagamento ?? '';
      m.set(k, (m.get(k) ?? 0) + Math.abs(r.valor));
    }
    return m;
  }, [rows]);

  const save = async () => {
    if (!editing?.nome?.trim()) {
      Alert.alert('Atenção', 'Informe o nome.');
      return;
    }
    try {
      await upsertForma({
        ...editing,
        nome: editing.nome.trim(),
        tipo: editing.tipo ?? 'CARTAO',
      });
      setEditing(null);
      load();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  };

  const remove = (f: FormaPagamento) => {
    Alert.alert('Excluir', `Remover "${f.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => { await deleteForma(f.id); load(); },
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Cartões e Contas</Text>
        <TouchableOpacity onPress={() => setEditing({ tipo: 'CARTAO' })}>
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {formas.map((f) => {
          const gasto = gastoPorForma.get(f.nome) ?? 0;
          const icon = f.tipo === 'CARTAO' ? 'card' : f.tipo === 'CONTA' ? 'business' : 'cash';
          return (
            <TouchableOpacity key={f.id} style={styles.cardItem} onPress={() => setEditing(f)}>
              <View style={[styles.badge, { backgroundColor: colorFor(f.nome) }]}>
                <Ionicons name={icon as any} size={22} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{f.nome}</Text>
                <Text style={styles.cardMeta}>
                  {f.tipo === 'CARTAO' ? 'Cartão' : f.tipo === 'CONTA' ? 'Conta' : 'Dinheiro'}
                  {f.dia_vencimento ? ` · vence dia ${f.dia_vencimento}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardValLabel}>este mês</Text>
                <Text style={styles.cardVal}>{formatBRL(gasto)}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(f)} hitSlop={10} style={{ marginLeft: 8 }}>
                <Ionicons name="trash-outline" size={18} color={colors.textDim} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
        {formas.length === 0 && (
          <Text style={styles.empty}>Nenhum cartão cadastrado. Toque em + para adicionar.</Text>
        )}
      </ScrollView>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editing?.id ? 'Editar' : 'Novo'} cartão / conta</Text>

            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Nubank"
              placeholderTextColor={colors.textDim}
              value={editing?.nome ?? ''}
              onChangeText={(t) => setEditing((e) => ({ ...e, nome: t }))}
            />

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.tipoRow}>
              {(['CARTAO', 'CONTA', 'DINHEIRO'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tipoBtn, editing?.tipo === t && styles.tipoBtnActive]}
                  onPress={() => setEditing((e) => ({ ...e, tipo: t }))}
                >
                  <Text style={[styles.tipoText, editing?.tipo === t && { color: colors.white }]}>
                    {t === 'CARTAO' ? 'Cartão' : t === 'CONTA' ? 'Conta' : 'Dinheiro'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {editing?.tipo === 'CARTAO' && (
              <>
                <Text style={styles.label}>Dia de vencimento</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 6"
                  placeholderTextColor={colors.textDim}
                  keyboardType="number-pad"
                  value={editing?.dia_vencimento ? String(editing.dia_vencimento) : ''}
                  onChangeText={(t) =>
                    setEditing((e) => ({ ...e, dia_vencimento: t ? parseInt(t, 10) : null }))
                  }
                />
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setEditing(null)}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={save}>
                <Text style={styles.btnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  cardItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 10,
  },
  badge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  cardMeta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  cardValLabel: { color: colors.textDim, fontSize: 11 },
  cardVal: { color: colors.red, fontSize: 15, fontWeight: '700' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 40 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgAlt, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 34,
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  label: { color: colors.textDim, fontSize: 13, marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: colors.card, borderRadius: 12, padding: 13, color: colors.text,
    fontSize: 15, borderWidth: 1, borderColor: colors.border,
  },
  tipoRow: { flexDirection: 'row', gap: 8 },
  tipoBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: colors.card,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  tipoBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tipoText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  btn: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', flex: 1,
  },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  btnGhost: { backgroundColor: colors.card, flex: 0, paddingHorizontal: 24 },
  btnGhostText: { color: colors.textDim, fontSize: 15, fontWeight: '600' },
});
