import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { labelCompetencia } from '../lib/format';

export function CompetenciaPicker({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const list = options.includes(value) ? options : [value, ...options];
  return (
    <>
      <TouchableOpacity style={styles.pill} onPress={() => setOpen(true)}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        <Text style={styles.pillText}>{labelCompetencia(value)}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textDim} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Competência</Text>
            <FlatList
              data={list}
              keyExtractor={(i) => i}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.rowText, item === value && { color: colors.primary, fontWeight: '700' }]}>
                    {labelCompetencia(item)}
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

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
  },
  pillText: { color: colors.text, fontWeight: '600', fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgAlt, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 34,
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowText: { color: colors.text, fontSize: 16 },
});
