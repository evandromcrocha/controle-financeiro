import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, colorFor } from '../../lib/theme';
import { formatBRL, currentComp, labelCompetencia } from '../../lib/format';
import {
  listLancamentos, listCompetencias, countLancamentos, importarSeed,
} from '../../lib/api';
import type { Lancamento } from '../../lib/types';
import { useAuth } from '../../lib/auth';
import { CompetenciaPicker } from '../../components/CompetenciaPicker';

export default function Dashboard() {
  const { signOut } = useAuth();
  const [comp, setComp] = useState(currentComp());
  const [comps, setComps] = useState<string[]>([]);
  const [rows, setRows] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const total = await countLancamentos();
      if (total === 0) {
        setEmpty(true);
        setLoading(false);
        return;
      }
      setEmpty(false);
      const cs = await listCompetencias();
      setComps(cs);
      const activeComp = cs.includes(comp) ? comp : cs[0] ?? comp;
      if (activeComp !== comp) setComp(activeComp);
      const data = await listLancamentos(activeComp);
      setRows(data);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  }, [comp]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totals = useMemo(() => {
    let entradas = 0, saidas = 0;
    for (const r of rows) {
      if (r.tipo === 'CRÉDITO') entradas += Math.abs(r.valor);
      else saidas += Math.abs(r.valor);
    }
    return { entradas, saidas, saldo: entradas - saidas };
  }, [rows]);

  const porForma = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.tipo !== 'DÉBITO') continue;
      const k = r.forma_pagamento ?? 'Outros';
      m.set(k, (m.get(k) ?? 0) + Math.abs(r.valor));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const topCategorias = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.tipo !== 'DÉBITO') continue;
      const k = r.categoria ?? 'Outros';
      m.set(k, (m.get(k) ?? 0) + Math.abs(r.valor));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [rows]);

  const maxCat = topCategorias[0]?.[1] ?? 1;

  const doImport = async () => {
    setImporting(true);
    try {
      await importarSeed((d, t) => setProgress(Math.round((d / t) * 100)));
      await load();
    } catch (e: any) {
      Alert.alert('Erro na importação', e.message);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (empty) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Ionicons name="cloud-upload-outline" size={64} color={colors.primary} />
          <Text style={styles.emptyTitle}>Importar dados da planilha</Text>
          <Text style={styles.emptyText}>
            Encontramos seu histórico da planilha de contas. Importe para começar com tudo pronto.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={doImport} disabled={importing}>
            {importing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color={colors.white} />
                <Text style={styles.btnText}>{progress}%</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>Importar agora</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.hi}>Olá 👋</Text>
            <Text style={styles.headerTitle}>Resumo</Text>
          </View>
          <TouchableOpacity onPress={() => signOut()}>
            <Ionicons name="log-out-outline" size={24} color={colors.textDim} />
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 16 }}>
          <CompetenciaPicker value={comp} options={comps} onChange={setComp} />
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo de {labelCompetencia(comp)}</Text>
          <Text style={[styles.balanceValue, { color: totals.saldo >= 0 ? colors.green : colors.red }]}>
            {formatBRL(totals.saldo)}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Ionicons name="arrow-down-circle" size={18} color={colors.green} />
              <View>
                <Text style={styles.balanceItemLabel}>Entradas</Text>
                <Text style={[styles.balanceItemValue, { color: colors.green }]}>
                  {formatBRL(totals.entradas)}
                </Text>
              </View>
            </View>
            <View style={styles.balanceItem}>
              <Ionicons name="arrow-up-circle" size={18} color={colors.red} />
              <View>
                <Text style={styles.balanceItemLabel}>Saídas</Text>
                <Text style={[styles.balanceItemValue, { color: colors.red }]}>
                  {formatBRL(totals.saidas)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {porForma.length > 0 && (
          <>
            <Text style={styles.section}>Gastos por cartão / conta</Text>
            <View style={styles.card}>
              {porForma.map(([nome, val], i) => (
                <View key={nome} style={[styles.formaRow, i > 0 && styles.divider]}>
                  <View style={[styles.dot, { backgroundColor: colorFor(nome) }]} />
                  <Text style={styles.formaName}>{nome}</Text>
                  <Text style={styles.formaVal}>{formatBRL(val)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {topCategorias.length > 0 && (
          <>
            <Text style={styles.section}>Maiores categorias</Text>
            <View style={styles.card}>
              {topCategorias.map(([nome, val]) => (
                <View key={nome} style={{ marginBottom: 12 }}>
                  <View style={styles.catHead}>
                    <Text style={styles.catName}>{nome}</Text>
                    <Text style={styles.catVal}>{formatBRL(val)}</Text>
                  </View>
                  <View style={styles.barBg}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${(val / maxCat) * 100}%`, backgroundColor: colorFor(nome) },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 14,
  },
  hi: { color: colors.textDim, fontSize: 14 },
  headerTitle: { color: colors.text, fontSize: 26, fontWeight: '700' },
  balanceCard: {
    backgroundColor: colors.primary, borderRadius: 20, padding: 20, marginBottom: 8,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  balanceValue: { color: colors.white, fontSize: 34, fontWeight: '800', marginTop: 4 },
  balanceRow: { flexDirection: 'row', gap: 24, marginTop: 18 },
  balanceItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceItemLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  balanceItemValue: { fontSize: 15, fontWeight: '700' },
  section: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  formaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  formaName: { color: colors.text, fontSize: 15, flex: 1 },
  formaVal: { color: colors.text, fontSize: 15, fontWeight: '600' },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName: { color: colors.text, fontSize: 14 },
  catVal: { color: colors.textDim, fontSize: 14 },
  barBg: { height: 8, backgroundColor: colors.cardAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  emptyTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: colors.textDim, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  btn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15,
    paddingHorizontal: 40, marginTop: 8,
  },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
