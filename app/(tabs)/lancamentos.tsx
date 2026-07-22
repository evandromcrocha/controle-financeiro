import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, colorFor } from '../../lib/theme';
import { formatBRL, currentComp, formatDate } from '../../lib/format';
import { listLancamentos, listCompetencias } from '../../lib/api';
import type { Lancamento } from '../../lib/types';
import { CompetenciaPicker } from '../../components/CompetenciaPicker';

export default function Lancamentos() {
  const router = useRouter();
  const [comp, setComp] = useState(currentComp());
  const [comps, setComps] = useState<string[]>([]);
  const [rows, setRows] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cs = await listCompetencias();
      setComps(cs);
      const active = cs.includes(comp) ? comp : cs[0] ?? comp;
      if (active !== comp) setComp(active);
      setRows(await listLancamentos(active));
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  }, [comp]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.descricao.toLowerCase().includes(term) ||
        (r.categoria ?? '').toLowerCase().includes(term) ||
        (r.forma_pagamento ?? '').toLowerCase().includes(term)
    );
  }, [rows, q]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Lançamentos</Text>
        <CompetenciaPicker value={comp} options={comps} onChange={setComp} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textDim} />
        <TextInput
          style={styles.search}
          placeholder="Buscar..."
          placeholderTextColor={colors.textDim}
          value={q}
          onChangeText={setQ}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum lançamento nesta competência.</Text>
          }
          renderItem={({ item }) => {
            const isCred = item.tipo === 'CRÉDITO';
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push(`/lancamento/${item.id}`)}
              >
                <View style={[styles.icon, { backgroundColor: colorFor(item.categoria ?? 'x') + '33' }]}>
                  <Ionicons
                    name={isCred ? 'arrow-down' : 'arrow-up'}
                    size={18}
                    color={isCred ? colors.green : colors.red}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.desc} numberOfLines={1}>{item.descricao}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.categoria ?? '—'} · {item.forma_pagamento ?? '—'}
                    {item.parcelas_total && item.parcelas_total > 1 ? ` · ${item.parcelas_total}x` : ''}
                  </Text>
                  <Text style={styles.metaDim}>{formatDate(item.data_pagamento)}</Text>
                </View>
                <Text style={[styles.value, { color: isCred ? colors.green : colors.red }]}>
                  {isCred ? '+' : '-'}{formatBRL(Math.abs(item.valor)).replace('R$', '').trim()}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/lancamento/novo')}>
        <Ionicons name="add" size={30} color={colors.white} />
      </TouchableOpacity>
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
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card, marginHorizontal: 16, borderRadius: 12,
    paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border,
  },
  search: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 15 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 8,
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  desc: { color: colors.text, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  metaDim: { color: colors.textDim, fontSize: 11, marginTop: 1, opacity: 0.7 },
  value: { fontSize: 15, fontWeight: '700' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 40 },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 58, height: 58,
    borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center',
    justifyContent: 'center', elevation: 6, shadowColor: '#000',
    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
});
