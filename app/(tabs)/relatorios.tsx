import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { colors, colorFor } from '../../lib/theme';
import { formatBRL, labelCompetencia } from '../../lib/format';
import { listAllLancamentos } from '../../lib/api';
import type { Lancamento } from '../../lib/types';

export default function Relatorios() {
  const [rows, setRows] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listAllLancamentos());
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.tipo !== 'DÉBITO') continue;
      const k = r.categoria ?? 'Outros';
      m.set(k, (m.get(k) ?? 0) + Math.abs(r.valor));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const totalGasto = useMemo(
    () => porCategoria.reduce((s, [, v]) => s + v, 0),
    [porCategoria]
  );

  const porMes = useMemo(() => {
    const m = new Map<string, { comp: string; entradas: number; saidas: number }>();
    for (const r of rows) {
      const comp = r.competencia ?? 's/ competência';
      const ref = r.competencia_ref ?? '0000';
      const key = ref;
      const cur = m.get(key) ?? { comp, entradas: 0, saidas: 0 };
      if (r.tipo === 'CRÉDITO') cur.entradas += Math.abs(r.valor);
      else cur.saidas += Math.abs(r.valor);
      m.set(key, cur);
    }
    return [...m.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 12)
      .map(([, v]) => v);
  }, [rows]);

  const maxMes = Math.max(1, ...porMes.map((m) => Math.max(m.entradas, m.saidas)));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.title}>Relatórios</Text>

        <Text style={styles.section}>Evolução mensal</Text>
        <View style={styles.card}>
          {porMes.map((m) => (
            <View key={m.comp} style={{ marginBottom: 14 }}>
              <View style={styles.mesHead}>
                <Text style={styles.mesLabel}>{labelCompetencia(m.comp)}</Text>
                <Text style={[styles.mesSaldo, { color: m.entradas - m.saidas >= 0 ? colors.green : colors.red }]}>
                  {formatBRL(m.entradas - m.saidas)}
                </Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${(m.entradas / maxMes) * 100}%`, backgroundColor: colors.green }]} />
              </View>
              <View style={[styles.barBg, { marginTop: 3 }]}>
                <View style={[styles.barFill, { width: `${(m.saidas / maxMes) * 100}%`, backgroundColor: colors.red }]} />
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Gastos por categoria</Text>
        <Text style={styles.total}>Total: {formatBRL(totalGasto)}</Text>
        <View style={styles.card}>
          {porCategoria.map(([nome, val]) => {
            const pct = totalGasto ? (val / totalGasto) * 100 : 0;
            return (
              <View key={nome} style={{ marginBottom: 12 }}>
                <View style={styles.catHead}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={[styles.dot, { backgroundColor: colorFor(nome) }]} />
                    <Text style={styles.catName}>{nome}</Text>
                  </View>
                  <Text style={styles.catVal}>{formatBRL(val)}</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colorFor(nome) }]} />
                </View>
                <Text style={styles.pct}>{pct.toFixed(1)}%</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  section: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  total: { color: colors.textDim, fontSize: 14, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  mesHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  mesLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  mesSaldo: { fontSize: 14, fontWeight: '700' },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  catName: { color: colors.text, fontSize: 14 },
  catVal: { color: colors.textDim, fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  barBg: { height: 8, backgroundColor: colors.cardAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  pct: { color: colors.textDim, fontSize: 11, marginTop: 3, textAlign: 'right' },
});
